# ADR: Bound the sync queue with a coalescing key to stop renderer OOM

**Date:** 2026-05-25
**Status:** accepted
**Context:**
The route `/v3/project/<id>/act/command-centre` (and the Observe/Plan command
centres) recurrently crashed Chrome with "Aw, Snap! Out of Memory". Diagnostic
investigation (the systematic-debugging Iron Law: no fix without confirmed root
cause) refuted every in-render hypothesis by direct measurement — JS heap flat
~125 MB, WebGL contexts steady at 1 across 12 navigations, DOM/canvas returning
to baseline, no render loops, sparse project data, Observe/Plan behaving
identically to Act. The decisive evidence was a steward screenshot showing
**"Syncing 254520 changes…"**.

Root cause was the IndexedDB sync queue in `apps/web/src/lib/syncQueue.ts`
(`ogden-sync-queue` DB, `ops` store), with three compounding flaws:
1. `enqueue()` keyed each op by `crypto.randomUUID()`, so retrying the same
   entity **appended** a new record instead of overwriting — an unbounded
   append log. Two local projects ("Moontrance Creek", "Test Vision Project")
   failing API validation ("Request validation failed") on every push grew the
   queue to ~250k ops.
2. `flush()` read the whole queue via `getAll()`, materialising every op (each
   carrying project/boundary GeoJSON payloads) into the JS heap at once —
   multi-GB allocation → renderer OOM.
3. Exhausted ops (`retryCount >= MAX_RETRIES`) were **skipped, not dropped**, so
   a permanently-failing op pinned the queue open forever. (The skip never even
   triggered, because the executor handlers swallow API errors and re-enqueue —
   `retryCount` never incremented. See Consequences.)

> [!warning] Correction (2026-05-29)
> Live diagnosis on `feat/atlas-permaculture` later identified the actual
> validation-failing project as **"Phase 4 Smoke"**, whose `projectType` held
> the kebab-case archetype `regenerative-farm` -- the server `ProjectType` enum
> accepts only snake_case (`regenerative_farm`), so `project:create` 422'd.
> "Test Vision Project" was a transient Stage Zero vision-builder fixture (see
> [[2026-05-25-atlas-stage-zero-vision-builder]]), and "Moontrance Creek"
> currently carries `projectType: null` (valid). The two-project attribution
> above was a best guess made *before* the failing field was observable -- the
> client discarded the server's `details[]` (the diagnosability gap this fix's
> follow-up closes). Root cause + the kebab->snake normalization fix:
> [[2026-05-29-atlas-projecttype-normalization-422-fix]].

**Decision:**
- **Coalescing deterministic key** `storeType:action:localId` replaces the
  random UUID as the IndexedDB `id`. Re-queuing an entity/action overwrites its
  prior op, capping the queue at the number of *distinct pending entities* —
  unbounded growth is now structurally impossible.
- **`getBatch(limit)`** reads a bounded, timestamp-ordered slice via cursor;
  `flush()` processes `FLUSH_BATCH = 200` per pass instead of `getAll()`.
- **`reconcile()`** — a one-time, cursor-based, memory-bounded collapse to one
  op per coalescing key (delete-losers-only; never `put()`s mid-cursor) — runs
  at `syncService.start()` to drain any pre-existing runaway queue without OOM.
- **`flush()` now dequeues exhausted ops** instead of re-skipping them.

**Consequences:**
- Renderer OOM on command-centre routes is resolved; a 20k-op runaway injected
  into the live IndexedDB reconciled to 5 with heap flat (~71–74 MB) and then
  drained to 0. Typecheck exit 0.
- The coalescing key changes queue semantics from append-log to last-write-wins
  per (store, action, entity). For the sync use case this is correct — only the
  latest state of an entity needs to reach the server.
- **Deferred:** the ~14 executor handlers in `syncService.ts` still swallow API
  errors and re-enqueue, so `MAX_RETRIES` never counts up. The coalescing key
  makes this harmless (it can no longer grow the queue), but propagating
  failures so retries count and a circuit-breaker can drop genuinely-bad ops is
  a cleaner long-term posture — left as a separate refactor. **(Closed the same
  day by [[2026-05-25-atlas-sync-circuit-breaker]], commit `84bb8e91`: the queue
  executor `executeQueuedOp` now calls each create/update handler with
  `rethrow = true`, so a failed API call throws back to `flush()`, `retryCount`
  increments with backoff, and at `MAX_RETRIES` the op is dropped via
  `handleExhaustedOp` and surfaced to the steward. This Deferred note is retained
  for the historical record.)**
- Relates to [[2026-05-16-atlas-multi-device-bundle-escape-hatch]] and the
  [full-syncservice-coverage-backlog](../concepts/full-syncservice-coverage-backlog.md);
  this fix hardens the *existing* 4-slice sync path, it does not extend coverage.

Commit `e5e8f220` on `feat/atlas-permaculture`.
