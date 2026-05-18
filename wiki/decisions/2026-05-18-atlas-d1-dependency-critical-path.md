# 2026-05-18 — D1: dependency / critical-path engine on the WorkItem spine

**Status:** Implemented, verified, uncommitted (working tree on
`feat/atlas-permaculture`)
**Context source:** Approved Session Execution Plan for Sub-project D1,
executing the ratified D0–D5 roadmap
([[2026-05-18-atlas-land-os-positioning-and-d-roadmap]]). Builds directly
on the D0 + D0.1 single-writer spine
([[2026-05-18-atlas-d0-workitem-spine]],
[[2026-05-18-atlas-d0-1-coupled-cutovers]]). D0 deliberately shipped
`dependsOn: string[]` as a stored-but-uncomputed field — "D0 stores the
DAG; D1 computes the critical path." D1 owns the full engine: nothing
previously populated `dependsOn`, derived blocked-state, or computed a
critical path, and no graph/DAG utilities existed anywhere.

## Decision

A **pure, unit-tested dependency/critical-path engine** lives in
`@ogden/shared` (no React, no store). Goal Compass **auto-seeds**
dependency edges; the steward may **manually override** (add/remove) on
top. Provenance is kept separate at the schema level (**Approach B**): a
new `dependsOnAuto: string[]` array holds Goal-Compass-seeded edges;
`dependsOn` keeps its existing semantics as manual/steward-authored
edges; the **effective DAG is their union**. Auto edges regenerate like
Goal-Compass rows; manual edges are preserved — mirroring the D0
generated-vs-overridden contract exactly.

Blocked-state and critical-path are **derived/computed at render time
only** and are **never** written back into `WorkItem.status` (keeps the
single-writer spine clean; consistent with D0.1 discipline). The
`'blocked'` status enum value remains available for explicit manual use
only. The existing D0 proof card `PlanExecutionTrackerCard` is extended
in place — no new Act module or manifest entry.

## Scope delivered

- **Pure engine** `packages/shared/src/lib/workItemGraph.ts` (new) —
  `effectiveDependencies` (union of `dependsOn ∪ dependsOnAuto`),
  `buildEffectiveGraph`, `detectCycle(items, fromId, toId)` (self-edge
  treated as a cycle; pre-write guard for the editor),
  `itemDuration` (CPM duration ladder: `scheduledEnd − scheduledStart`
  in days if both present → else `laborHrs / 8` workday-days ceil →
  else 0 = zero-duration milestone), and `analyzeWorkItemGraph` →
  `{ byId: Map<id, node>, cyclic, order }`. Forward/backward CPM pass
  (Kahn topological order); `slack === 0` ⇒ critical (`Math.abs(slack)
  < 1e-9`). Blocked computed independently of CPM so it still resolves
  under a cyclic graph; an item is effectively blocked if any
  dependency's `status ∉ {done, cancelled}`. Dangling/missing target
  ids ignored gracefully (no throw). Cyclic ⇒ `cyclic: true`, CPM
  degrades to zeros (no infinite loop). Exported from `@ogden/shared`
  `index.ts`.
- **Schema** `packages/shared/src/schemas/workItem.schema.ts` — added
  `dependsOnAuto: z.array(z.string()).default([])` beside `dependsOn`.
  `.default([])` + the existing `.passthrough()` ⇒ existing persisted
  rows hydrate clean with **no DB migration** (A-series covenant). The
  inferred output `WorkItem` type makes the field required on every
  constructed literal (same as `dependsOn`) — all literal sites updated
  (5 migration mappers, `MaintenanceScheduleCard`, `RotationScheduleCard`,
  2 test fixtures).
- **Store action** `apps/web/src/store/workItemStore.ts` —
  `replaceGoalCompassDependencies(projectId, edgesByItemId)` mirrors the
  `replaceGoalCompassRows` preservation filter **1:1**: writes
  `dependsOnAuto` only on rows where `source === 'goal-compass' &&
  !overridden`; never touches `dependsOn` (manual), overridden rows, or
  other sources/projects. Idempotent via array-equality short-circuit
  (same input → same state reference).
- **Edge seeding** `v3/plan/engine/goalCompass/goalCompassSpineSync.ts`
  — pure `seedGoalCompassDependencies(items, catalog =
  INTERVENTION_CATALOG)` groups WorkItems by
  `generatedFromInterventionId`, resolves each intervention's
  `prerequisites[]` → prerequisite WorkItem ids ⇒ that item's seeded
  `dependsOnAuto` (no self-edge). Called immediately after
  `replaceGoalCompassRows` in `pushGoalCompassToSpine`. Acyclic by
  construction (the sequencer already topologically sorts on
  `prerequisites`). Seeded **strictly** from `Intervention.prerequisites`
  — coarse phase-`order` fan-in edges deliberately not seeded
  (low-signal, dense).
- **Surface** `apps/web/src/features/act/PlanExecutionTrackerCard.tsx`
  — one `useMemo` over project items → engine result. Three additive
  blocks: (1) **row badges** in both existing group modes — Critical
  (`slack===0`), Blocked (tooltip lists blocking item titles), Slack
  `Nd` for non-critical; read-only, no status mutation; (2) **per-row
  dependency editor** — manual edges removable, auto edges shown
  read-only ("auto (Goal Compass)"), add-picker over other project
  WorkItems; pre-write `detectCycle` on the prospective union graph;
  cycle/self-edge ⇒ inline error, nothing written; (3) **timeline view
  mode** — third value on the existing view toggle (`phase | layer |
  timeline`): lightweight CSS/SVG horizontal Gantt, bars span earliest
  start → finish, milestones as rotated diamonds, critical bars
  highlighted, SVG dependency lines, cyclic banner, legend.

## Covenant & scope boundary

Strictly project-operational: DAG, critical path, blocked surfacing,
timeline. **Explicitly out:** D2 resourcing, D3 budget/cost, D4 field
proof, D5 dashboards/recommendations. No riba/gharar/CSRA/salam/
investor/financing framing. No spine-status auto-mutation.
`BudgetActualsCard` untouched. No DB migration.

## Verification

- `pnpm --filter @ogden/shared typecheck` exit 0; engine unit tests
  **14/14** (union/dedup/dangling, cycle incl. self-edge & would-close,
  duration ladder, CPM diamond slack, cyclic-degrade, derived blocked
  across done/cancelled/open and under cycles).
- `pnpm --filter web typecheck` clean except the **2 disclosed
  pre-existing** unrelated `useFlowEndpointOptions` Paddock errors.
- `replaceGoalCompassDependencies` preservation + idempotence store
  test **3/3** (happy-dom); `seedGoalCompassDependencies` test **5/5**;
  combined D0/D1 store/seeding **21/21**.
- Full shared suite **227/227**. Full web vitest **1179/1180** — the
  single failure is the pre-existing `syncManifest` coverage-guard debt
  (4 unclassified stores: `ogden-compost-cycle`,
  `ogden-habitat-features`, `ogden-rotation-plan`,
  `ogden-succession-path`), **proven pre-existing** by a clean-tree
  `git stash` reproduction that produced the identical failure with the
  D1 changes removed. Not introduced by D1.
- `vite build` exit 0.
- Live (preview, web-a1 :5240, project run6): Act tracker mounts
  cleanly at `/v3/project/.../act/act-plan-tracker`; the view toggle
  now renders **all three** modes (By phase / By design layer /
  Timeline); the Timeline view renders its legend ("Critical path",
  "◆ Milestone (zero-duration)", "Bars span earliest start → finish")
  and SVG scaffold without error. run6 has 0 WorkItems so badges /
  dependency-editor / cycle-refusal had no live data to exercise —
  those paths are proven by the 21/21 unit+store tests. **Zero
  D1-related console errors**; the only console output is a
  pre-existing, unrelated `ObserveModuleBar` `<button>`-in-`<button>`
  DOM-nesting React warning (stack roots at
  `src/v3/observe/components/ObserveModuleBar.tsx`, never any D1
  component). MapLibre/WebGL screenshot not attempted (known hang) —
  DOM/console + the test matrix are the verification of record.

## Notes & deferred

- Live exercise of badges/dependency-editor/cycle-refusal against a
  project with a generated Goal-Compass plan is deferred to the next
  session that has such a project loaded — engine + seeding +
  preservation are unit/store-proven.
- The pre-existing `syncManifest` 4-store debt (`ogden-compost-cycle`,
  `ogden-habitat-features`, `ogden-rotation-plan`,
  `ogden-succession-path`) is unrelated B2/A2/A-series classification
  debt, not D1's to close.
- Continues the D-series. D2 (resourcing) is its own
  brainstorm→spec→plan cycle.
