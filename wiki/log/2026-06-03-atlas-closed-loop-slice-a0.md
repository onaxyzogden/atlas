# 2026-06-03 -- Closed-loop Plan->Act workflow: Slice A0 (data model + pure resolvers)

**Branch:** `feat/atlas-permaculture`
**Commit:** `71336025` -- MaterialFlow design-intent fields + pure resolvers (3 files
+204/-2; **not pushed**).
**Epic start.** First slice of the multi-session Plan->Act closed-loop / waste-vector
workflow that realizes the operator-attached `olos-waste-vector-v2.jsx` prototype.
See ADR [[decisions/2026-06-03-olos-plan-act-closed-loop-workflow]] for the full
epic scope (Phases A/B/C) and the placement decision.

## Context

The operator liked the "layout and details" of an attached closed-loop material-flow
Plan -> Approval -> Act prototype and asked where it could fit. Research established it
is NOT a drop-in: its Plan half ENRICHES the already-real closed-loop feature
(`closedLoopStore` / `WasteVectorTool` / `ClosedLoopGraphCard`), and its Act half is
the missing UI for the existing-but-dormant `stewardshipRoutineStore`. Operator chose
the full workflow, **Plan-side first**, with the Act surface as a dedicated three-panel
command center (Phase C). Slice A0 lays the foundation: the shared data-model contract
+ pure resolvers, NO UI.

Amanah gate: land-stewardship planning UI; no riba/gharar. Clean.

## What shipped (3 files)

**Modify**
- `apps/web/src/store/closedLoopStore.ts` -- add 4 OPTIONAL, back-compat fields to
  `MaterialFlow` (mirrors the existing optional throughput precedent -- no sibling
  record): `operationalStatus`, `cadence`, `transformationNodeIds` (the "via" nodes),
  `activeMonths`. Add exported enums `FlowOperationalStatus`
  ("active" | "seasonally-dormant" | "at-risk" | "suspended") / `FlowCadence`
  ("continuous" | "daily" | "weekly" | "fortnightly" | "monthly" | "seasonal" |
  "rotation-based" | "as-needed") and the config maps `FLOW_OPERATIONAL_STATUS_CONFIG`
  (label/dash/tone; `dash` drives SVG `strokeDasharray` -- active->undefined,
  seasonally-dormant->"6 4", at-risk->"2 3", suspended->"1 5") and
  `FLOW_CADENCE_CONFIG` (label). Bump persisted `version` 2 -> 3 with a pass-through
  `migrate` branch (`if (version >= 2) return persisted as ClosedLoopState;` -- all new
  fields optional, no backfill). These symbols are the PUBLIC Plan->Act contract; the
  Act half must NOT redefine the enums.

**Create**
- `apps/web/src/features/plan/closedLoop/flowStatusModel.ts` -- pure, render-free
  resolvers, one source of truth for the Plan flow-map/score surfaces and the Act half:
  `resolveOperationalStatus(flow)` (undefined -> "active"), `dashForStatus(status)`,
  `dashForFlow(flow)`, `cadenceLabel(cadence)` ("Not set" when unset),
  `flowIsActiveInMonth(flow, month)` (absent/empty `activeMonths` -> active all year).
- `apps/web/src/features/plan/closedLoop/__tests__/flowStatusModel.test.ts` -- 9 tests
  across 4 describe blocks (status default + passthrough; dash active->undefined /
  degraded->truthy; dashForFlow; cadenceLabel undefined/null->"Not set"; month
  membership no-set->true / explicit include & exclude).

## Verification

- **Typecheck:** web `tsc --noEmit` EXIT 0; shared `tsc --noEmit` EXIT 0. (Run the two
  invocations SEPARATELY -- a concurrent web+shared run clobbers `.tsbuildinfo` and
  reports a spurious cross-package error in `packages/shared/.../catalogues.test.ts`.)
- **Vitest (bounded, `--pool=forks --testTimeout=20000`, run from `apps/web`):** 9/9
  green. **Test-env lesson:** the web `vitest.config.ts` sets `environment: 'node'`
  globally; any test that transitively imports `closedLoopStore.ts` (or any
  persist-backed store) MUST declare `@vitest-environment happy-dom` at the top, because
  the store calls `rehydrateWithLogging(useClosedLoopStore)` at module scope which needs
  a DOM. happy-dom is the installed env -- NOT jsdom (jsdom throws ERR_MODULE_NOT_FOUND).
  Pure helper tests with no store import need no directive. This applies to slices
  A1-A4 ([[feedback-vitest-bounded-runs]]).
- **Live (localhost :5200, native pg per [[project-two-postgres-5432]]):** MTC project
  `localStorage['ogden-closed-loop']` confirmed at `version: 3` after rehydration with
  NO `[persist:ogden-closed-loop] rehydrate failed` console error (only pre-existing
  unrelated `[SYNC]` API role/not-found noise). Undo timeline preserved.

## Commit shape

Explicit-path commit (`git add --` the 3 files only), guarded with `Compare-Object`
(intended == staged) run atomically with `git commit -F` in one shell invocation. Heavy
foreign WIP in the working tree left untouched -- never `git add -A`. Commit-only (not
pushed). ASCII-only; JS/JSON apostrophes double-quoted; commit message written to the
system temp dir and committed with `git commit -F`
([[feedback-commit-immediately-on-rebased-branches]], [[project-branch-rebase]]).

## State after

The shared contract is fixed. Next: Slice A1 -- `loopDesignScore.ts` (+test, extract
`efficiency()` from `WasteVectorDashboardView`) + a read-only `LoopDesignScorePanel`
mounted in `WasteVectorTool` above the List/Dashboard switcher. CSRA untouched
([[fiqh-csra-erased-2026-05-04]]). ADR
[[decisions/2026-06-03-olos-plan-act-closed-loop-workflow]]; entity
[[entities/closed-loop-workflow]].
