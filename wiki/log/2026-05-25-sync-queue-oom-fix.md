# 2026-05-25 — Sync-queue OOM fix (coalescing key + bounded flush)

**Branch.** `feat/atlas-permaculture` (`e5e8f220`).

Fixed a recurring Chrome "Aw, Snap! Out of Memory" crash on the command-centre
routes (`/v3/project/<id>/act/command-centre` and the Observe/Plan equivalents).
Followed the systematic-debugging Iron Law: Phase 1 reproduced/localised with
instrumentation and *no fixes*; Phase 2 fixed only the confirmed cause; Phase 3
verified.

**Investigation (Phase 1).** Refuted every in-render hypothesis by direct
measurement: JS heap flat ~125 MB; WebGL contexts steady at 1 across 12
navigate-away-and-back cycles (a `__liveMaps` probe in `DiagnoseMap`); DOM/canvas
returning to baseline; no render loops (`console.count` probes in
`ActCommandCentrePage` + `ActDataLayers` flat); sparse project data;
Observe/Plan behaving identically to Act (so the shared `DiagnoseMap` /
`preserveDrawingBuffer: true` was not Act-specific and not the cause). The
decisive evidence was a steward screenshot: **"Syncing 254520 changes…"**.

**Root cause.** The IndexedDB sync queue (`apps/web/src/lib/syncQueue.ts`,
`ogden-sync-queue`/`ops`) was an unbounded append log: `enqueue()` keyed each op
by `crypto.randomUUID()`, so the same entity re-queued forever (driven by two
local projects failing "Request validation failed" on every push); `flush()`
loaded the **whole** queue via `getAll()` into the JS heap (250k ops × GeoJSON
payloads = multi-GB) → OOM. Exhausted ops were skipped, never dropped.

**Fix (Phase 2, one change).** Coalescing deterministic key
`storeType:action:localId` (re-queue overwrites prior op → growth structurally
bounded); `getBatch(limit)` cursor read + `flush()` at `FLUSH_BATCH = 200`
instead of `getAll()`; `reconcile()` one-time cursor collapse to one op per key
(delete-losers-only, never `put()` mid-cursor), run at `syncService.start()` to
drain a pre-existing runaway queue without OOM; `flush()` now dequeues exhausted
ops. Removed all temporary instrumentation before committing (incl. a leftover
`[OOM]` render-count probe that had been committed into `ActCommandCentrePage`).

**Verification (Phase 3).** Typecheck exit 0 (foreground + background re-run).
Injected 20,000 simulated runaway ops into the live preview's real IndexedDB →
reload → `[SYNC] Reconciled sync queue: 20000 → 5 ops`, heap flat ~71–74 MB (no
OOM during cleanup), queue then drained to 0. ESLint 0 errors on touched files.

**Deferred.** The ~14 `syncService` executor handlers still swallow API errors
and re-enqueue, so `MAX_RETRIES` never increments — harmless now (the coalescing
key caps the queue) but a circuit-breaker that lets retries count and drops
genuinely-bad ops is the cleaner long-term fix. Left as a separate refactor.

ADR [[decisions/2026-05-25-sync-queue-oom-coalescing-fix]]. Hardens the existing
4-slice sync path described in
[[concepts/local-first-architecture]]; does not extend sync coverage
([[concepts/full-syncservice-coverage-backlog]] remains open).
