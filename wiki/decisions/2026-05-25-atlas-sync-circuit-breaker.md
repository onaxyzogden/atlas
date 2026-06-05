# ADR: Sync-queue circuit-breaker — propagate API failures so retries count and exhausted ops surface

**Date:** 2026-05-25
**Status:** accepted
**Context:**
The OOM fix [[2026-05-25-sync-queue-oom-coalescing-fix]] bounded the IndexedDB
sync queue (`apps/web/src/lib/syncQueue.ts`) with a coalescing key
`storeType:action:localId`, but explicitly **deferred** the matching change to the
queue executor. `syncQueue.flush()` owns the retry machinery — increment
`retryCount`, exponential backoff, and drop at `MAX_RETRIES = 5` — but that
machinery only engages when the executor **throws**.

`executeQueuedOp` in `apps/web/src/lib/syncService.ts` routed create/update ops
through the *live-path* handlers (`syncProjectCreate`, `syncZoneCreate`, the
generic `typedCreate`/`typedUpdate`, etc.), each of which does
`try { api… } catch { console.warn; syncQueue.enqueue(…) }` — it swallows the
failure and re-enqueues. Because those handlers never threw:
1. `flush()`'s `try { await executor(op); dequeue } catch { retryCount++ }` never
   saw a throw, so `retryCount` never incremented and backoff never ran;
2. worse — after the coalescing-key fix, the handler re-enqueued the op under the
   **same key** that `flush()` had just dequeued, so a persistently-failing op
   was **silently dropped after a single pass** with no retry and no signal. The
   two local "Request validation failed" (422) projects from the OOM incident
   drove exactly this.

Delete cases already called the raw API directly (they throw correctly), and
`executeStateBlobOp` was already the correct throwing reference pattern.

**Decision:**
- **Add a `rethrow = false` parameter** to each swallowing create/update handler
  (`syncProjectCreate/Update/Boundary`, `syncZoneCreate/Update`,
  `syncStructureCreate/Update`, `syncPathCreate/Update`, `syncUtilityCreate/Update`,
  and the generic `typedCreate`/`typedUpdate`). The catch re-throws when
  `rethrow` is set, **before** the `syncQueue.enqueue(...)` re-enqueue. The
  live store-subscription path keeps its current fail-soft "enqueue for later"
  behaviour (calls with `rethrow` unset); the queue path opts into throwing.
  This keeps a single source of truth per handler rather than forking
  `*Core`/wrapper pairs.
- **Point `executeQueuedOp` create/update cases at the throwing variant**
  (`await syncProjectCreate(project, true)`, `typedCreate(spec, rec, true)`, …).
  Delete and `state-blob`/`comment` cases already throw — left unchanged.
- **Surface exhaustion to the steward.** New `handleExhaustedOp(op)` is wired as
  the `onDrop` callback of `flush()` (`syncQueue.flush()` gained an optional
  `onDrop?: (op) => void`, invoked in the `retryCount >= MAX_RETRIES` branch
  right after `dequeue`). It records the dropped op key in a new
  `droppedStores: string[]` channel on `connectivityStore` (dedupe; never
  persisted) and fires one `toast.error`. `OfflineBanner` renders a new
  **highest-severity** "could not be saved — kept on this device" banner with
  dismissable chips, mirroring the existing 409 conflict banner.

**Consequences:**
- A queued op that keeps failing now retries with backoff, counts up to
  `MAX_RETRIES`, and is dropped **deterministically and visibly** instead of
  vanishing after one flush pass. The drop is the actual circuit-breaker payoff:
  failures become steward-visible data, not silent loss.
- Live-path behaviour is byte-for-byte unchanged (default `rethrow = false`).
- This is the safety property that makes the dormant full-coverage path safe to
  enable: if any blob-store push keeps 422-ing once `FEATURE_SYNC_STATE_BLOBS` is
  on, the steward sees the drop instead of losing the change. That is why this
  sequences **before** the coverage rollout.
- Verified: typecheck exit 0; 6 new circuit-breaker tests + 123 existing sync
  tests green. Commit `84bb8e91` on `feat/atlas-permaculture`.

**Phase 2 static audit (validate-and-roll-out, not a rebuild):**
The full-`syncService`-coverage path
([[concepts/full-syncservice-coverage-backlog]]) is **already built** behind
`FLAGS.SYNC_STATE_BLOBS` (`packages/shared/src/constants/flags.ts`,
`FEATURE_SYNC_STATE_BLOBS`, off by default). Static audit confirmed the wiring is
complete and unit-verified (129/129 dormant-path tests):
- coverage classification in `syncManifest.ts` (the `syncManifest.test.ts` guard
  enforces every persisted `ogden-` store is classified);
- push (`subscribeVersionedBlobs` over `versioned-blob` stores +
  `subscribeToVegetation`/`subscribeToSuccession`) and pull
  (`hydrateProjectStateBlobs` + `hydrateTypedTables`), both gated at
  `start()`/`initialSync` behind the flag;
- 409 conflict path adopts server rev, surfaces via `addConflictedStore` +
  toast, never clobbers; version-skew guard skips + warns once.
- **One observation flagged for the two-device E2E:** `ogden-projects` is
  classified `active-singleton`/`whole` (pushes the entire projects store as one
  blob; `whole` apply = `setState(() => incoming)`) **and** also rides the
  always-on typed `subscribeToProjects` path — a potential redundant/clobbering
  transport when the flag is on. Must be verified before rollout.
- **Deferred (human-gated):** the two-device E2E (real auth, real API+DB, two
  browsers — no auth-bypass) and the `FEATURE_SYNC_STATE_BLOBS` rollout itself.
  `projectBundle.ts` stays as the offline/export escape hatch (no-deletion).

Relates to [[2026-05-16-atlas-multi-device-bundle-escape-hatch]] and
[[concepts/local-first-architecture]].
