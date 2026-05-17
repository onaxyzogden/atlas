# ADR — Act §5.2 Plan-Execution Tracker (interactive task dashboard)

**Date:** 2026-05-16
**Status:** Accepted
**Context:** OLOS/Atlas spec §5.2 (implement/task dashboard). The
MVP-delta deliberately shipped a *navigable plan doc* and deferred the
interactive execution surface to Phase 2. With WS1–WS6, WS5 P2, WS4b,
and catalog-parity all shipped and green, §5.2 is the next coherent
Phase-2 deliverable.

## Context

The one real data gap (verified at `phaseStore.ts`): `BuildPhase`
carried phase-level `completed`/`completedAt`, but `PhaseTask` had **no
per-task completion field** — so "what's done / overdue / % complete"
was uncomputable and a true execution ledger could not exist. The
Goal-Compass / planting-calendar / WS4b maintenance engines already
populate `phaseStore` with ordered phases (synthetic regeneration
`order 1`, maintenance `order 99`) and tasks carrying
`scheduledStart/End`, `laborHrs`, `costUSD`, `designLayer`,
`isMaintenanceTask`/`recurrenceFrequency` — everything the ledger needs
except the completion bit.

Decisions locked with the steward (AskUserQuestion): completion model =
**interactive per-task**; placement = **best long-term UX** (delegated).

## Decision

**Store (`apps/web/src/store/phaseStore.ts`).** Additive optional
`done?: boolean` + `doneAt?: string | null` on `PhaseTask`, and a
`toggleTaskDone(phaseId, taskId)` action mirroring
`overrideGoalCompassTask`'s phase-map→task-map shape **but toggling
`done`/`doneAt` and deliberately NOT setting `status: 'overridden'`** —
a steward checking a box must not freeze the row against Goal-Compass
regeneration. Additive optional fields ⇒ **no persist version bump**
(direct in-file precedent: `isMaintenanceTask?`/`recurrenceFrequency?`
were added the same way with no bump from the v3 schema). Legacy
persisted tasks load with `done` undefined ⇒ treated as not-done.

**Placement = new dedicated Act module `'tracker'`** (the delegated
UX call). The §5.2 ledger is the headline Plan→Act bridge and warrants
a top-level, discoverable, scalable surface consistent with the
existing Act taxonomy. It is conceptually distinct from **Schedule**
(operational cadence — weather/calendar) and **Build**
(`act-build-gantt`/budget/pilot read disjoint act-operational stores).
`phaseStore` *is* the plan-execution ledger; burying it as a card under
Schedule, or cramming a full grouped ledger into a right-rail panel,
would be poor IA for a headline deliverable. `'tracker'` is ordered
**first** in the rail as the entry/overview surface.

**Card (`apps/web/src/features/act/PlanExecutionTrackerCard.tsx`,
new).** Mirrors `PhasingScaleMatrixCard` derive discipline + the
`MaintenanceScheduleCard` Act-card contract: subscribes `state.phases`
raw + `state.toggleTaskDone`, filters/sorts in `useMemo`
(`projectId === project.id`, `.slice().sort((a,b)=>a.order-b.order)`) —
never `getProjectPhases` in a selector (per
`2026-04-26-zustand-selector-stability`). Overview (overall % +
remaining open labour/cost + overdue count), per-phase groups with
progress bars and a `phase complete` chip, task rows with
strikethrough + `doneAt` on done, designLayer tag, maintenance
recurrence badge, overdue red left-border
(`!done && scheduledStart < todayISO`), empty state, and an optional
local by-phase / by-design-layer view pivot (pure re-group, no store
writes). Toggle calls `toggleTaskDone` then `toast.success`/`info`.

**Wiring.** `'tracker'` added first to the `ActModule` union +
`ACT_MODULES` + all four `Record<ActModule,…>` maps in
`v3/act/types.ts`; lazy import + `case 'act-plan-tracker'` in
`ActModuleSlideUp.renderActCard`. The StageShell rail iterates
`ACT_MODULES`, so no shell edit was needed.

## Consequence not anticipated by the plan — second source of truth

The plan assumed the four `Record<ActModule,…>` maps were the whole
wiring surface ("no schema/migration change"). They are not.
`ActModuleId` is a **separate** hardcoded Zod enum in `@ogden/shared`
(`packages/shared/src/schemas/actTelemetry.schema.ts`), the runtime
type of `record()`'s `module` param (`actInteractionLog.ts`) and the
key type of `AffinityTelemetryDashboard`'s `Record<ActModuleId,string>`
label map. tsc surfaced this as 5 `TS2322` + 1 `TS2741` once
`ActModule` gained `'tracker'`. Resolution: add `'tracker'` to the
`ActModuleId` enum and the dashboard's `MODULES`/`MODULE_LABEL`.

DB-safety verified before applying: migration
`024_act_interaction_events.sql`'s CHECK constraint is on `event_type`
**only** — the `module` column is unconstrained text, and the API
telemetry route inserts the Zod-validated value with no separate
allow-list. So extending the enum is migration-safe.

**Forward guardrail (the durable lesson):** the act-module set now has
**two hand-synced sources of truth** — `ActModule`
(`v3/act/types.ts`, UI) and `ActModuleId` (`@ogden/shared`
telemetry). Adding a future Act module requires editing **both**, or
tsc fails at the telemetry call sites. Documented here so the coupling
is not rediscovered each time.

## Consequences

- Closes spec §5.2 with an interactive, grouped, checkable execution
  ledger over the existing `phaseStore` build plan (incl. synthetic
  regeneration/maintenance phases) — read-and-complete only; task
  add/edit/delete stays in Plan Module 7.
- Non-regressive: additive optional fields, no persist bump;
  `toggleTaskDone` does not set `status:'overridden'`.
- Verification: `tsc --noEmit` exit 0; `vitest run src/store` 98/98
  (new 6-spec `phaseStore.toggleTaskDone.test.ts` — scoped flip,
  round-trip clears `doneAt` to null, no `status` mutation, referential
  no-touch of sibling phases, no-op on bad ids, localStorage persist);
  `vitest run src/v3/plan/engine` 110/110 (additive field perturbs
  neither `runAutoDesign` nor `replaceGoalCompassRows`). Preview
  (project `mtc`, 11 phases): Tracker renders first in the Act rail;
  Overview 0/31 → 1/31 (0%→3%) on mark-done; overdue 3→2 (done task
  excluded); strikethrough + opacity 0.6 + `done 5/16/2026`; toast
  "Marked done: …"; Reopen reverts; localStorage `ogden-phases`
  carries `"done":true` + ISO `doneAt`, persist `version` still 3;
  state survives full reload; by-design-layer pivot re-groups; zero
  console errors (the `[ATLAS AI]` enrichment + `[act-telemetry]` 500
  warnings are pre-existing/environmental — the latter actually
  confirms `module:'tracker'` passes client-side Zod validation and
  reaches the network flush).

## Covenant

Internal stewardship tooling; no public copy or capital/framing
surface touched. No fabricated content.

## Critical files

- `apps/web/src/store/phaseStore.ts` — `PhaseTask.done?/doneAt?` +
  `toggleTaskDone` (mirrors `overrideGoalCompassTask`, no `overridden`)
- `apps/web/src/store/__tests__/phaseStore.toggleTaskDone.test.ts` (new)
- `apps/web/src/features/act/PlanExecutionTrackerCard.tsx` (new)
- `apps/web/src/v3/act/types.ts` — `'tracker'` in union + 4 maps
- `apps/web/src/v3/act/ActModuleSlideUp.tsx` — lazy import + case
- `packages/shared/src/schemas/actTelemetry.schema.ts` — `'tracker'`
  added to the `ActModuleId` telemetry enum (second source of truth)
- `apps/web/src/features/dashboard/pages/AffinityTelemetryDashboard.tsx`
  — `tracker` added to `MODULES` + `MODULE_LABEL`
