# 2026-05-25 — Sync-queue circuit-breaker (propagate failures + surface drops)

**Branch.** `feat/atlas-permaculture` (`84bb8e91`, 5 files +322/−37).

Closed the circuit-breaker deferred by the OOM fix
[[log/2026-05-25-sync-queue-oom-fix]]: the IndexedDB queue's retry/backoff/drop
machinery in `syncQueue.flush()` only engages when the executor **throws**, but
`executeQueuedOp` routed create/update ops through the *swallowing* live-path
handlers (`try { api } catch { warn; enqueue }`). So a queued op that failed on
flush never incremented `retryCount`, never backed off, and — after the
coalescing-key fix — re-enqueued under the **same key** `flush()` had just
dequeued, **silently dropping it after one pass**. The two local
"Request validation failed" (422) projects drove exactly this.

**Fix (Phase 1).** Added a `rethrow = false` parameter to each swallowing
create/update handler (`syncProjectCreate/Update/Boundary`,
`syncZoneCreate/Update`, `syncStructureCreate/Update`, `syncPathCreate/Update`,
`syncUtilityCreate/Update`, and generic `typedCreate`/`typedUpdate`); the catch
re-throws when set, **before** the re-enqueue. `executeQueuedOp` create/update
cases now pass `true` (delete/state-blob/comment already throw). New
`handleExhaustedOp(op)` wired as `flush()`'s new optional `onDrop` callback
(invoked in the `retryCount >= MAX_RETRIES` branch after `dequeue`): records the
dropped op key in a new `droppedStores: string[]` channel on `connectivityStore`
(dedupe, not persisted) + one `toast.error`. `OfflineBanner` renders a new
highest-severity "could not be saved — kept on this device" banner with
dismissable chips, mirroring the 409 conflict banner. Live-path behaviour is
unchanged (default `rethrow = false`).

**Verification.** Typecheck exit 0. New `syncServiceCircuitBreaker.test.ts` (6
cases: live-path still swallow+enqueue; queue-path project/vegetation create
throw + no re-enqueue; project delete throws; successful create resolves without
enqueue; `handleExhaustedOp` dedupe → `droppedStores: ['zone:create:z1']` +
toast once) + 123 existing sync tests green. Removed all temporary
instrumentation before committing.

**Phase 2 static audit (validate-and-roll-out, not a rebuild).** Confirmed the
full-coverage path behind `FLAGS.SYNC_STATE_BLOBS` (`FEATURE_SYNC_STATE_BLOBS`,
off by default) is fully wired and unit-verified (129/129): `syncManifest.ts`
classification + coverage guard; push (`subscribeVersionedBlobs` +
`subscribeToVegetation`/`subscribeToSuccession`) and pull
(`hydrateProjectStateBlobs` + `hydrateTypedTables`), both flag-gated; 409 adopts
server rev + surfaces + never clobbers; version-skew guard skips + warns once.
**Flagged for the E2E:** `ogden-projects` is `active-singleton`/`whole` (pushes
the whole store as one blob, `whole` apply = `setState(() => incoming)`) **and**
rides the always-on typed `subscribeToProjects` path — potential
redundant/clobbering transport when the flag is on.

**Deferred (human-gated).** The two-device E2E (real auth + API + DB, two
browsers — no auth-bypass) and the `FEATURE_SYNC_STATE_BLOBS` rollout. The Phase
1 exhaustion-surfacing is the safety property that makes the rollout safe: a
blob-store push that keeps 422-ing will surface to the steward instead of
silently losing the change — which is why this sequenced first. `projectBundle.ts`
stays as the offline/export escape hatch (no-deletion).

ADR [[decisions/2026-05-25-atlas-sync-circuit-breaker]]. Closes the deferral in
[[log/2026-05-25-sync-queue-oom-fix]]; hardens [[concepts/local-first-architecture]]
ahead of [[concepts/full-syncservice-coverage-backlog]].
