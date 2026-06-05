# 2026-05-18 — D1 implemented: dependency / critical-path engine on the WorkItem spine


**Branch.** `feat/atlas-permaculture` (working tree, uncommitted).

Executed the approved D1 Session Execution Plan — the next ratified D
slice on the now-stable single-writer D0/D0.1 spine. D0 deliberately
shipped `dependsOn` stored-but-uncomputed; D1 owns the full engine
(nothing previously populated it, derived blocked-state, or computed a
critical path; no graph utilities existed).

New pure engine `packages/shared/src/lib/workItemGraph.ts` (no React,
no store): `effectiveDependencies` (union of `dependsOn ∪
dependsOnAuto`), `detectCycle(items, from, to)` (self-edge = cycle —
the editor's pre-write guard), `itemDuration` (CPM ladder:
`scheduledEnd − scheduledStart` days → else `laborHrs / 8` workday-days
ceil → else 0 = zero-duration milestone), `analyzeWorkItemGraph` →
`{ byId, cyclic, order }` with a forward/backward CPM pass over a Kahn
topological order; `slack === 0` (|slack| < 1e-9) ⇒ critical; a cyclic
graph reports `cyclic: true` and degrades CPM to zeros (no infinite
loop). Blocked is computed independently of CPM (an item is blocked if
any dependency's `status ∉ {done, cancelled}`) so it still resolves
under a cycle. Dangling/missing target ids are ignored gracefully.
Exported from `@ogden/shared` `index.ts`.

Provenance kept separate at the schema level (**Approach B**):
`workItem.schema.ts` gains `dependsOnAuto: z.array(z.string())
.default([])` beside `dependsOn`. `.default([])` + the existing
`.passthrough()` ⇒ existing persisted rows hydrate clean with **no DB
migration** (A-series covenant); `dependsOn` keeps manual/steward
semantics, `dependsOnAuto` holds Goal-Compass-seeded edges, effective
DAG = their union. The inferred output type makes the field required on
every literal — all sites updated (5 migration mappers,
`MaintenanceScheduleCard`, `RotationScheduleCard`, 2 test fixtures).

`workItemStore.replaceGoalCompassDependencies(projectId,
edgesByItemId)` mirrors the `replaceGoalCompassRows` preservation
filter **1:1** — writes `dependsOnAuto` only on `source ===
'goal-compass' && !overridden` rows; never touches manual `dependsOn`,
overridden rows, or other sources/projects; idempotent via
array-equality short-circuit. Pure `seedGoalCompassDependencies(items,
catalog = INTERVENTION_CATALOG)` in `goalCompassSpineSync.ts` groups
WorkItems by `generatedFromInterventionId` and resolves each
intervention's `prerequisites[]` → prerequisite WorkItem ids (no
self-edge), called immediately after `replaceGoalCompassRows` in
`pushGoalCompassToSpine`. Acyclic by construction (the sequencer
pre-sorts on `prerequisites`); seeded strictly from `prerequisites` —
coarse phase-`order` fan-in deliberately not seeded.

`PlanExecutionTrackerCard.tsx` extended in place (no new Act module):
one `useMemo` → engine result, then three additive blocks — (1)
Critical / Blocked (tooltip lists blocking titles) / Slack `Nd` row
badges in both existing group modes, read-only (no status mutation);
(2) a per-row dependency editor (manual edges removable, auto edges
read-only "auto (Goal Compass)", add-picker over other project
WorkItems, pre-write `detectCycle` on the prospective union graph —
cycle/self-edge ⇒ inline error, nothing written); (3) a third
`timeline` value on the existing view toggle — a CSS/SVG horizontal
Gantt (bars earliest start → finish, milestone diamonds, critical
highlight, SVG dependency lines, cyclic banner, legend). Blocked and
critical are derived at render only and never written to
`WorkItem.status` (D0.1 single-writer discipline; the `'blocked'` enum
stays for explicit manual use).

Covenant: strictly project-operational (DAG / critical path / blocked /
timeline). Explicitly out: D2 resourcing, D3 budget/cost, D4 field
proof, D5 dashboards. No riba/gharar/CSRA/salam/investor/financing
framing; no spine-status auto-mutation; `BudgetActualsCard` untouched;
no DB migration.

**Gate.** `pnpm --filter @ogden/shared typecheck` exit 0 + engine
**14/14**. `pnpm --filter web typecheck` clean except the **2
disclosed pre-existing** unrelated `useFlowEndpointOptions` Paddock
errors. `replaceGoalCompassDependencies` preservation/idempotence
**3/3** (happy-dom); `seedGoalCompassDependencies` **5/5**; combined
D0/D1 store/seeding **21/21**. Shared suite **227/227**. Web vitest
**1179/1180** — the lone failure is the pre-existing `syncManifest`
coverage-guard debt (4 unclassified stores: `ogden-compost-cycle`,
`ogden-habitat-features`, `ogden-rotation-plan`,
`ogden-succession-path`), **proven pre-existing** by a clean-tree `git
stash` reproduction yielding the identical 4-store failure with all D1
changes removed — not introduced by D1. `vite build` exit 0. Live
(preview web-a1 :5240, project run6): Act tracker mounts cleanly at
`/v3/project/.../act/act-plan-tracker`; the view toggle now renders
**all three** modes and the Timeline view renders its legend + SVG
scaffold without error; run6 has 0 WorkItems so badges /
dependency-editor / cycle-refusal had no live data (those paths
unit/store-proven). **Zero D1-related console errors** — the only
console output is a pre-existing, unrelated `ObserveModuleBar`
`<button>`-in-`<button>` React DOM-nesting warning (stack roots at
`src/v3/observe/components/ObserveModuleBar.tsx`). MapLibre/WebGL
screenshot not attempted (known hang) — DOM/console + the test matrix
are the verification of record. Committed `6211caff` (36 files —
combined D0+D0.1+D1 spine; D1-only had no working intermediate; the
mixed tree was staged by explicit path, unrelated WIP excluded). New
ADR
`decisions/2026-05-18-atlas-d1-dependency-critical-path.md` + index
pointer + `entities/web-app.md` Current State. Continues D0.1/D0; D2
is its own brainstorm→spec→plan cycle.
