# 2026-05-18 — D0: the operating-loop WorkItem spine

**Status:** Implemented, verified, committed `6211caff` on
`feat/atlas-permaculture` (combined D0–D1 spine)
**Context source:** Approved Session Execution Plan for Sub-project D0,
executing the ratified D0–D5 roadmap
([[2026-05-18-atlas-land-os-positioning-and-d-roadmap]]). D0 is the
connective backbone D1–D5 extend, mirroring how A1's trajectory spine
carried A2/A3.

## Decision

Supersede, not wrap. One canonical client-first `WorkItem` model becomes
the single representation of all planned/schedulable project work. The
five legacy planned-work stores (`phaseStore` `PhaseTask`, `fieldTask`,
`maintenance`, `scheduledLivestockMove`, `nursery` `PropagationBatch`)
collapse into it **now** (explicit operator instruction overriding an
earlier bounded proposal). The append-only *actual-event* logs are **not**
migrated — they remain immutable records of what happened, each gaining an
optional `workItemId?` linking it to the `WorkItem` it proves complete.
Category line: **WorkItem = planned/recurring work to be done; event-log =
an immutable record that work occurred, pointing back at its WorkItem.**

## Scope delivered

- **Schema** `packages/shared/src/schemas/workItem.schema.ts` — union
  superset of every legacy planned-work entity + net-new spine dimensions
  (status lifecycle, `dependsOn[]`, scheduled-vs-actual dates, assignment),
  `.passthrough()` (A1 registry discipline), exported from `@ogden/shared`.
  Added `WorkItemMoveDirection` mid-execution to close a lossy carry.
- **Store** `apps/web/src/store/workItemStore.ts` — Zustand+persist
  `ogden-work-items`, projectId-tagged, mirrors `ogden-phases` sync class
  (no DB migration — A-series covenant). CRUD + selectors +
  `replaceGoalCompassRows` (override contract byte-for-byte) +
  `replacePlantingCalendarBatches` (nursery wholesale-regen contract).
- **Migration** `workItemStore.migration.ts` — one-time, idempotent,
  per-source guarded; legacy stores left intact for rollback. Exported
  pure mappers (`phaseTaskToWorkItem`, `propagationBatchToWorkItem`) shared
  with the Goal-Compass regen seam so spine rows are byte-identical by
  construction.
- **Event-log link** — additive `workItemId?` on `HarvestEntry`,
  `LivestockMoveEvent`, `MaintenanceEvent`, `SuccessionMilestone`,
  `StockTransfer` + no-op version bumps; `fulfilledByEventId` wired to set
  the matched log event's `workItemId`.
- **Goal Compass rewire** — emits `WorkItem[]` via `goalCompassSpineSync`;
  generated-vs-overridden preservation re-implemented identically.
- **Readers re-pointed (clean cut-overs only):** `useEventAggregator.ts`,
  `v3/act/ops/TodaysPriorities.tsx`, `PlanExecutionTrackerCard.tsx` (the
  D0 proof-of-spine surface).

## Per-part calls made at build

- **Lossy-migration fix in-flight.** `ScheduledLivestockMove.direction`
  was dropped by the scheduled-move mapper (legacy aggregator meta needs
  it). Added `WorkItemMoveDirection` enum + optional `direction` field +
  mapper carry. Autonomous call under the work-without-stopping directive.
- **Deferred the deep CRUD/domain readers** (`MaintenanceScheduleCard`,
  `RotationScheduleCard`, `NurseryLedgerDashboard`, `PhasingDashboard`,
  `PhasingScaleMatrixCard`). Rationale: each needs a *coupled writer
  cut-over* (single-cutover-per-reader to avoid two writers to one legacy
  array) and `NurseryLedgerDashboard` surfaces a second lossy gap
  (`PropagationBatch.seedSaving` not carried). Completing them exceeds
  D0's anti-scope-creep hard line ("D0 stores edges/actuals/links and
  re-points readers; no new UI"). Per the no-deletion covenant the legacy
  stores are retained and remain authoritative writers, so those surfaces
  stay correct in the interim. → D0.1 follow-up.
- **Live Goal-Compass-regenerate walkthrough substituted** by the green
  override-preservation hard-gate regression test plus the
  migration-fidelity evidence visible in the live tracker
  (status-preserved completed item), avoiding a multi-step regen-UI flow
  beyond D0's boundary.

## Covenant boundary

D0 only *carries* `costUSD`/`materials` fields the legacy entities already
had; `BudgetActualsCard` untouched (D3 territory). No
financing/capital/riba/gharar/CSRA/salam/investor framing. D0 is strictly
the work spine.

## Verification

- `@ogden/shared` typecheck exit 0; web typecheck clean for all D0 files
  (only the pre-existing, unrelated `useFlowEndpointOptions.test.ts`
  `Paddock` fixture errors remain — out of D0 scope, untouched).
- web vitest **1140/1141**. The one failure is the `syncManifest` coverage
  guard flagging `ogden-habitat-features` / `ogden-succession-path` —
  **proven pre-existing** by clean-tree stash reproduction (A2/B1 debt,
  not D0; D0's own `ogden-work-items` is correctly classified).
- `vite build` succeeds (PWA generated). The `pnpm build` script's plain
  `tsc` OOMs at the default Node heap; the `typecheck` script (8 GB) is
  clean and `vite build` passes — recommend aligning the build script's
  tsc heap.
- Live (preview, project `mtc`): Act stage loads, zero console errors;
  `useEventAggregator` Upcoming Events and `TodaysPriorities` render off
  the spine; `PlanExecutionTrackerCard` renders the full unified 31-task
  WorkItem ledger (progress, remaining labour/cost, overdue flags,
  Mark-done/Reopen) grouped by phase. `preview_screenshot` timed out on
  the disclosed MapLibre/WebGL hang — DOM-text verification of record per
  the screenshot-honesty rule.

## Consequences

A single canonical client-first WorkItem spine is the sole source of
truth for planned work; Goal Compass + the production Act surfaces render
unchanged on top of it; event-logs retained as linked execution history;
forward-canonical extension points (`dependsOn[]`, actual dates,
assignment) seeded for D1–D5. Open follow-up: D0.1 closes the deferred
coupled reader/writer cut-overs + the `seedSaving` schema carry, then D1
(dependency/critical-path engine) builds on the stable spine.
