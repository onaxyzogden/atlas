# 2026-05-16 — feat(act): §5.2 Plan-Execution Tracker (interactive task dashboard)


Closes spec §5.2. The MVP-delta deliberately shipped a *navigable plan
doc* and deferred the interactive execution surface; this is the
Phase-2 ledger. The one real data gap (verified in `phaseStore.ts`):
`PhaseTask` had no per-task completion field, so progress/overdue/%
were uncomputable.

**Store.** Additive optional `PhaseTask.done?`/`doneAt?` +
`toggleTaskDone(phaseId, taskId)` mirroring `overrideGoalCompassTask`'s
phase-map→task-map shape but toggling `done`/`doneAt` and deliberately
**not** setting `status:'overridden'` (a steward checking a box must
not freeze the row against Goal-Compass regeneration). Additive
optional ⇒ **no persist version bump** (the `isMaintenanceTask?`
precedent). 6-spec `phaseStore.toggleTaskDone.test.ts`: scoped flip,
round-trip clears `doneAt` to null, no `status` mutation, sibling
phases referentially untouched, no-op on bad ids, localStorage persist.

**Placement (delegated UX call).** New dedicated Act module
`'tracker'`, ordered **first** in the rail — `phaseStore` *is* the
plan-execution ledger and the headline Plan→Act bridge; conceptually
distinct from Schedule (cadence) and Build (disjoint act-operational
stores). New `PlanExecutionTrackerCard` mirrors `PhasingScaleMatrixCard`
derive discipline (raw `state.phases` + `useMemo`, never
`getProjectPhases` in a selector) + the `MaintenanceScheduleCard`
Act-card contract: overview %, per-phase groups (synthetic regen
`order 1` / maintenance `order 99` fall out of the order sort), overdue
red border vs `scheduledStart`, designLayer pivot, maintenance badge,
toast on toggle. Wired `'tracker'` first into the `ActModule` union +
`ACT_MODULES` + 4 `Record<ActModule,…>` maps + `ActModuleSlideUp`
lazy import/case.

**Plan scope-gap found + resolved (the durable lesson):** the act-module
set has a **second source of truth** — `ActModuleId`, a separate Zod
enum in `@ogden/shared` (`actTelemetry.schema.ts`), the runtime type of
`record()`'s `module` param and the key of
`AffinityTelemetryDashboard`'s label map. tsc surfaced 5×TS2322 +
1×TS2741 once `ActModule` gained `'tracker'`. Fixed by adding
`'tracker'` to that enum + the dashboard maps. DB-safety verified
first: migration 024's CHECK constraint is on `event_type` only — the
`module` column is unconstrained text and the API route inserts the
Zod-validated value, so the enum-extend is migration-safe. Recorded in
the ADR's "Forward guardrail": future Act modules must edit **both**
`ActModule` and `ActModuleId`.

**Verification.** `tsc --noEmit` exit 0; `vitest run src/store` 98/98;
`vitest run src/v3/plan/engine` 110/110 (additive field perturbs
neither `runAutoDesign` nor `replaceGoalCompassRows`). Preview
(project `mtc`, 11 phases): Tracker first in rail; Overview
0/31→1/31 (0→3 %) on mark-done; overdue 3→2 (done excluded);
strikethrough + opacity 0.6 + `done 5/16/2026`; toast "Marked done:
…"; Reopen reverts; localStorage `ogden-phases` carries `"done":true`
+ ISO `doneAt`, persist `version` still 3; survives full reload;
by-design-layer pivot re-groups; zero console errors (the `[ATLAS AI]`
enrichment + `[act-telemetry]` 500 warnings are pre-existing /
environmental — the telemetry 500 confirms `module:'tracker'` passes
client-side Zod validation and reaches the network flush). New ADR
`decisions/2026-05-16-atlas-act-plan-execution-tracker.md` + index
pointer. Not committed — left for the user's review per session policy.
