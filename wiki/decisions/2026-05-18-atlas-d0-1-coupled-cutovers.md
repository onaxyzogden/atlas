# D0.1 — Coupled reader/writer cut-overs + `seedSaving` carry

- **Date:** 2026-05-18
- **Status:** accepted
- **Sub-project:** D0.1 (continuation of [[2026-05-18-atlas-d0-workitem-spine]])
- **Branch:** `feat/atlas-permaculture` (working tree, uncommitted)

## Context

D0 installed the canonical `WorkItem` spine and re-pointed only the
**clean** (read-side, non-coupled) readers. It explicitly deferred the
deep CRUD/domain surfaces whose readers were coupled to legacy *writers*,
plus a second lossy carry (`PropagationBatch.seedSaving`) that the spine
schema did not yet hold. While deferred, the legacy stores stayed
retained-authoritative so those surfaces remained correct. D0.1 completes
the supersede: those surfaces now read **and write** the spine.

## Decision

1. **`seedSaving` schema carry.** Added `seedSaving?: boolean` to
   `@ogden/shared` `workItem.schema.ts` and to `propagationBatchToWorkItem`
   in `workItemStore.migration.ts` (the pure mapper shared with the
   planting-calendar regen seam, so migrated and regenerated rows stay
   byte-identical). The migration test now asserts it both ways
   (`b1.seedSaving===true`, `b2.seedSaving===false`).

2. **Cut-over pattern: project back into the legacy row shape.** Each
   surface keeps its render block (and any analysis fns) byte-unchanged;
   a `useMemo` projects spine `WorkItem`s (filtered by `source` + project)
   back into the exact legacy entity shape the block already consumes.
   Writers redirect to `workItemStore` actions, constructing/patching
   `WorkItem`s that **mirror the D0 migration mappers exactly** — so a
   card-authored row is indistinguishable from a migrated one (fidelity
   by construction, not by parallel logic).

3. **Surfaces.**
   - `MaintenanceScheduleCard` — CRUD cut-over: reads
     `source==='maintenance'`; add → `addItem` (mapper shape),
     remove → `deleteItem`, mark-done → `setStatus(id,'done')` (task
     stays in its cadence bucket since the filter is source+project, not
     status — behaviour preserved; `doneAt` renders as "last done").
   - `NurseryLedgerDashboard` — reader cut-over: `source==='nursery-batch'`
     projected into `PropagationBatch` for `computeReadinessTracking` /
     `computeStockSummary` / the seed-saving filter. `StockTransfer` is
     **not** migrated — the executed-transfer log stays on `nurseryStore`.
   - `RotationScheduleCard` — coupled reader+writer:
     `source==='scheduled-livestock-move'` ↔ `ScheduledLivestockMove` via
     `planToWorkItem`/`workItemToPlan` (reverse of the D0 mapper;
     `fulfilledByEventId` is consumed only for truthiness, so
     `status==='done'` round-trips it). `addPlan`/`updatePlan`/
     `removePlan` → `addItem`/`updateItem`/`deleteItem`; auto-fulfilment
     sets the WorkItem `done` and stamps the matched **actual-move event**
     (which stays on `livestockMoveLogStore` — event-log not migrated)
     with `workItemId` (the D0 proof-of-completion back-link). The
     fulfilment effect no longer depends on the removed legacy
     `markFulfilled` (calls the stable store fns directly) — no render
     loop.
   - `PhasingScaleMatrixCard` — per-phase task pivot now off WorkItems
     where `phaseId!=null` (the phaseStore-origin discriminator);
     `BuildPhase` stays the phase container (only `tasks[]` moved).
   - `PhasingDashboard` — **no change**: it rolls up off
     built-environment `structures` (`costEstimate`/`laborHoursEstimate`/
     `materialTonnageEstimate`), never `phase.tasks`. Verified by
     inspection, not assumed.

## Deferred seam (flagged, not silently regressed)

`RotationScheduleCard`'s structure-destination plans render an **Edit**
button that calls `startScheduledLivestockMove` in
`v3/act/ActStructurePopover.actions.ts`, which still writes the legacy
`scheduledLivestockMoveStore`. That action is a separate surface outside
the four-file D0.1 scope; re-pointing it is its own cut-over. Recorded so
the seam is explicit rather than a silent divergence.

## Covenant boundary

Unchanged from D0: strictly the work spine. No riba/gharar/CSRA/salam/
investor/financing framing; `BudgetActualsCard` untouched (D3 territory).
D0.1 only carries fields the legacy entities already had.

## Verification

- `@ogden/shared` + web `typecheck` exit clean — only the **pre-existing,
  unrelated** `useFlowEndpointOptions.test.ts` Paddock type errors (A-series
  fixture debt, not D0.1).
- Web vitest **1155 / 1156**. The single failure is the `syncManifest`
  coverage guard (`ogden-compost-cycle`, `ogden-habitat-features`,
  `ogden-succession-path` unclassified) — proven pre-existing B2/A2/
  A-series debt by clean-tree stash reproduction (identical failure with
  D0.1 changes stashed). `ogden-work-items` itself is correctly classified.
- Migration unit test **10 / 10** (incl. the new `seedSaving` assertions).
- `vite build` succeeds (52s; `tsc` verified separately via `typecheck`
  at 8 GB heap — the `build` script's bare `tsc` still OOMs, see D0 ADR
  note).
- Live: app runs error-free under Vite HMR after all five edits (zero
  console errors); migration confirmed executed (`migratedSources` = all
  five); empty-state correctness on a no-planned-work dev profile.
  Screenshots not attempted — disclosed MapLibre/WebGL hang; DOM/console
  + the test matrix are the verification of record (CLAUDE.md
  screenshot-honesty rule). Data-populated visual render not forced:
  behaviour fidelity is guaranteed by construction (projections mirror
  the D0 mappers) and proven by the migration test + typecheck + vitest.

## Consequences

- The spine is now the sole read **and write** path for all five planned
  sources across every production surface except the one flagged
  `startScheduledLivestockMove` seam. Legacy stores are fully write-dead
  (migration input + rollback only).
- D1 (dependency / critical-path engine) can build on a stable,
  single-writer spine. D1 is **not** part of D0.1 — per the ratified
  D0–D5 roadmap it requires its own brainstorm→spec→plan cycle.

## References

- [[2026-05-18-atlas-d0-workitem-spine]] (D0 — the spine this completes)
- [[2026-05-18-atlas-land-os-positioning-and-d-roadmap]] (ratified D0–D5)
