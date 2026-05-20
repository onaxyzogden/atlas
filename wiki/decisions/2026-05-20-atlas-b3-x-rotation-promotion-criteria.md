# 2026-05-20 — B3.x: Rotation-sequence promotion-criteria wiring

**Branch.** `feat/atlas-permaculture`.
**Status.** Implemented; not pushed (divergence check + push are the closing acts on the plan).
**Continues.** [2026-05-20 B3 — Rotation-sequence spine push](2026-05-20-atlas-b3-rotation-sequence-spine-push.md) (open work item: "B3.x promotion-criteria wiring (rotation-sequence rows participate in livestock-stage readiness gates)").
**Template-mirrors.** [2026-05-19 B5 — Beneficial-organism habitat audit](2026-05-19-atlas-b5-beneficial-organism-habitat.md) (criterion-append-only pattern), [2026-05-19 B3 — Rotation Adherence (plan-vs-actual)](2026-05-19-atlas-b3-rotation-adherence.md) (pure read-only engine over store state, no writes).

---

## Context

B3 shipped the `source: 'rotation-sequence'` `WorkItem` family and the
`pushRotationSequenceToSpine(projectId)` orchestrator, explicitly deferring
promotion-criteria wiring as a B3.x follow-up. The spine now carries projected
rotation moves with `scheduledStart` / `scheduledEnd` / `precedesAuto`, but the
goal-tree readiness layer in `CriteriaForecastTab.tsx` had no awareness of those
rows. The `livestock-enterprise` subgoal gated on six agronomic criteria
(paddocks active count, welfare pass %, rest-compliance %, silvopasture
integration %, and two prior protein/revenue criteria) — none of which read the
spine. As a result the spine was **descriptive but not load-bearing**: a project
with zero spine rows or zero completed moves scored identically on rotation
criteria to one that faithfully synced and executed.

This slice makes the spine load-bearing by adding two new sibling criteria
under `livestock-enterprise` — one for spine hygiene (are projected moves
present?), one for execution (are past-due moves marked done?). Both at target
90 / `deadlineYear` 2, locked by the steward during scope brainstorm.

## Decision

Add two pure read-only evaluators in a new module
`apps/web/src/features/livestock/rotationSequenceReadiness.ts` and seat two new
`SuccessCriterion` rows on the `livestock-enterprise` subgoal so the existing
`CriteriaForecastTab` dispatch map can light them up automatically.

### Evaluators (pure, read-only)

- `computeRotationSpinePresencePct({ projectId, paddocks, plan, declaredPhases, items? }): number`
  — Calls `seedRotationSequenceWorkItems({ projectId, paddocks, plan,
  declaredPhases })` (reused as the expected-set source — no separate
  projection layer) to derive the expected provenance set
  (`generatedFromRotationMove` composite
  `<cellGroup>__<paddockId>__<sequenceOrder>__<cycleIndex>`). Intersects with
  current spine `source: 'rotation-sequence'` rows for the project (overridden
  + non-overridden alike) by `generatedFromRotationMove`. Returns `100 *
  presentCount / expectedCount`, or **`100`** when the expected set is empty
  (no plan / no paddocks / empty cells — there is nothing that could be
  missing).
- `computeRotationMovesCompletedPct({ projectId, todayISO, items? }): number`
  — Filters the spine to `source: 'rotation-sequence'` rows for the project
  with `scheduledEnd < todayISO` (yyyy-mm-dd lexicographic compare is
  equivalent to date compare for this format). Returns `100 * doneCount /
  pastDueCount`, or **`100`** when no rows are past-due (nothing yet due,
  nothing to be late on).

Both evaluators read `useWorkItemStore.getState().items` when `items` is not
injected — the optional `items` arg is solely a test-time seam for deterministic
selectors. D4 invariant preserved: status writes still route through
`fulfilWorkItem`; these read `WorkItem.status` only.

### Goal-tree wiring

Two `SuccessCriterion` rows appended to `livestock-enterprise.criteria[]` in
`apps/web/src/v3/plan/data/goalTreeTemplates.ts` immediately after
`livestock-rotation-rest-compliance-pct`:

```typescript
{
  id: 'livestock-rotation-spine-presence-pct',
  description: 'Projected rotation moves present on the work-item spine (%)',
  unit: 'pct',
  target: 90,
  deadlineYear: 2,
},
{
  id: 'livestock-rotation-moves-completed-pct',
  description: 'Past-due rotation moves marked completed on the spine (%)',
  unit: 'pct',
  target: 90,
  deadlineYear: 2,
},
```

### Dispatch wiring

`CriteriaForecastTab.tsx` `currentValues` `useMemo` extended:

- Selectors added: `useAllPhases` (already in scope as `usePhaseStore`),
  `useWorkItemStore` items selector.
- Derivations added: `declaredPhases` (filter by project), `todayISO`
  (`new Date().toISOString().slice(0, 10)`).
- Dispatch keys added:
  - `'livestock-rotation-spine-presence-pct'` → `computeRotationSpinePresencePct({ projectId: project.id, paddocks, plan: rotationPlan, declaredPhases, items: allWorkItems })`.
  - `'livestock-rotation-moves-completed-pct'` → `computeRotationMovesCompletedPct({ projectId: project.id, todayISO, items: allWorkItems })`.
- `useMemo` dep array extended with `allPhases`, `allWorkItems`.

## Scope decisions (explicit non-goals)

- **No third "compliance" criterion** beyond the two siblings. Rest-compliance
  % already exists; a third spine metric would dilute the gate.
- **No criterion for `precedesAuto` edge coverage.** Edges are derived; if rows
  are present, edges are present (orchestrator invariant).
- **No `MODULE_CARDS` or UI surface changes.** The Goal Compass card already
  renders criteria from the goal tree; the two new entries appear
  automatically.
- **No deadline beyond Y2.** Locked by steward during scope brainstorm
  ("90% by Y2"). Y2 reflects that B3 sequencer + spine push land this slice;
  sites have a full year of plan → execute → measure before the gate bites.
- **No goal-tree archetype other than `homestead`.** The retreat and farmstead
  archetypes do not have a `livestock-enterprise` subgoal in the current
  template; future archetype-wiring is a separate slice.
- **No retroactive backfill of completions.** Existing spine rows start with
  `status: 'todo'`; the completed-pct evaluator simply reports current state.
  Stewards complete moves through the existing D4 `fulfilWorkItem` surface.

## Posture & covenant

- **Strictly-additive.** Two new criteria entries, two new evaluators, two new
  dispatch keys. No removals, no enum changes, no schema bump, no store
  actions.
- **Single-writer preserved.** Evaluators are pure reads over
  `useWorkItemStore.getState().items`. Only B3's `replaceRotationSequence
  {Rows,Dependencies}` write rotation-sequence rows. Status writes still route
  through `fulfilWorkItem` (D4 invariant).
- **Covenant lock holds.** Copy: "rotation moves", "scheduled", "completed",
  "past-due", "spine". No riba / gharar / CSRA / salam / investor / financing
  / cost-of-capital / payback / ROI / yield-as-return vocabulary. Covenant
  grep matches only the negative-assertion docstring in the evaluator header.

## Verification

- **Targeted vitest:** `rotationSequenceReadiness.test.ts` **17/17 green** —
  empty plan → 100% presence + 100% completed; zero cells → 100%; no rows
  present → 0% presence; full match → 100%; partial match → 50%; overridden
  rows counted as present and in past-due denominator; cross-project
  isolation; non-`rotation-sequence` rows excluded; future-only excluded
  (100% completed); status flips reflected without re-seed.
- **Full apps/web vitest:** **1592/1592 green** (was 1575 prior to adding 17
  new cases).
- **Typecheck:** `tsc --noEmit` on `apps/web` — only the pre-existing
  `precedesAuto`-shape errors inherited from B5.2.x.c remain in
  `workItemStore.migration.ts` + `coverCropDependencyGraph.test.ts` +
  `coverCropSpineSync.test.ts` + `RotationScheduleCard.tsx` +
  `workItemStore.migration.test.ts` + `goalCompassSpineSync.test.ts` +
  `seedGoalCompassCosts.test.ts` + `seedGoalCompassDependencies.test.ts` +
  `seedGoalCompassResources.test.ts`, plus the pre-existing
  `'guild-member'`-missing-from-`Record<PlanSelectionKind,_>` error in
  `PlanSelectionFloater.tsx` (B4 follow-up), plus the unrelated
  `StepBoundary.tsx` ReactNode error. No new errors reference the B3.x
  surface.
- **Covenant grep:**
  `/\b(riba|gharar|csra|salam|investor|financing|cost-of-capital|yield|payback|investment|roi|return\s+on)\b/i`
  on the four touched source files — only the negative-assertion docstring in
  the evaluator header matches.
- **Live preview:** WebGL hang disclosure rule applies; vitest + tsc remain
  authoritative.
- **Branch divergence:** `git fetch && git rev-list --left-right --count
  HEAD...@{u}` against `feat/atlas-permaculture` before any push. Must be
  ahead-only. Never force-push.

## Critical files

- New: [apps/web/src/features/livestock/rotationSequenceReadiness.ts](../../apps/web/src/features/livestock/rotationSequenceReadiness.ts)
- New: [apps/web/src/features/livestock/__tests__/rotationSequenceReadiness.test.ts](../../apps/web/src/features/livestock/__tests__/rotationSequenceReadiness.test.ts)
- Edited: [apps/web/src/v3/plan/data/goalTreeTemplates.ts](../../apps/web/src/v3/plan/data/goalTreeTemplates.ts) — append two criteria entries to `livestock-enterprise.criteria[]`
- Edited: [apps/web/src/v3/plan/cards/goal-compass/CriteriaForecastTab.tsx](../../apps/web/src/v3/plan/cards/goal-compass/CriteriaForecastTab.tsx) — extend `currentValues` dispatch map + selectors + dep array
- Reused: [apps/web/src/features/livestock/rotationSequenceSpineSync.ts](../../apps/web/src/features/livestock/rotationSequenceSpineSync.ts) — `seedRotationSequenceWorkItems` as expected-set source
- Reused: [apps/web/src/store/workItemStore.ts](../../apps/web/src/store/workItemStore.ts) — `items` read selector
- Reused: [apps/web/src/v3/plan/data/goalCompassTypes.ts](../../apps/web/src/v3/plan/data/goalCompassTypes.ts) — `SuccessCriterion` shape (no change needed)

## Open work

- B3.x next: per-move salt / mineral / water-haul `materialsAuto` kit (carried
  forward from the parent B3 ADR).
- B3.x next: `TrackerCard` render polish for cellGroup-grouped move sequences
  (currently lands as flat list).
- Goal-tree archetype-wiring (`retreat` / `farmstead` `livestock-enterprise`
  subgoals) — separate slice.
