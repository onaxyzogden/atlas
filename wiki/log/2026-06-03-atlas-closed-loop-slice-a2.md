# 2026-06-03 -- Closed-loop Plan->Act workflow: Slice A2 (per-flow detail editor + loop integrity checklist)

**Branch:** `feat/atlas-permaculture`
**Commit:** `37665eba` -- loopIntegrity helper + FlowDetailPanel + shared
flowFormUtils + selectable WasteVectorListView rows (6 files +662/-14; **not pushed**).
Third slice of the multi-session Plan->Act closed-loop / waste-vector workflow.
See ADR [[decisions/2026-06-03-olos-plan-act-closed-loop-workflow]] and entity
[[entities/closed-loop-workflow]].

## Context

Slices A0 (data-model contract + `flowStatusModel`) and A1 (read-only Loop Design
Score strip) are shipped. Slice A2 adds the first WRITE surface on the A0 fields: a
per-flow design-intent editor for the selected waste-vector, plus a pure
loop-integrity checklist that tells a steward, at a glance, which loop-design slots
are still empty for that flow.

Amanah gate: land-stewardship planning UI; no riba/gharar. Clean.

## What shipped (6 files)

**Create**
- `apps/web/src/features/plan/closedLoop/loopIntegrity.ts` -- pure, render-free.
  `loopIntegrityChecks(flow)` returns five ORDERED checks plus `completeCount` /
  `totalCount`:
  1. **sink** -- `sinkId` is a non-empty id.
  2. **cadence** -- `cadence` is set.
  3. **volume** -- any positive finite `massKgPerMonth` / `volumeLPerMonth` /
     `energyKwhPerMonth` (nutrient-only quantities do NOT satisfy it).
  4. **via** -- `transformationNodeIds` non-empty.
  5. **activeMonths** -- `activeMonths` non-empty.
  Type-only store import (genuinely pure). Exports `LoopIntegrityCheckId`,
  `LoopIntegrityCheck`, `LoopIntegrityResult`.
- `apps/web/src/features/plan/closedLoop/flowFormUtils.ts` -- `parsePositive(s)`
  extracted verbatim from `WasteVectorListView` (empty / NaN / <=0 -> undefined);
  now a single shared pure helper.
- `apps/web/src/features/plan/closedLoop/FlowDetailPanel.tsx` -- selected-flow
  editor. operationalStatus `<select>` (value via `resolveOperationalStatus`) +
  cadence `<select>` ("Not set" -> undefined); mass / volume number inputs kept as
  local strings, committed on blur via `updateMaterialFlow(flow.id, { ... })` through
  `parsePositive`; via-node checkboxes from `useFlowEndpointOptions(project.id)`
  filtered to `kind === "fertility"`; a 12-button activeMonths month grid (sorted);
  the `loopIntegrityChecks` checklist with `completeCount / totalCount` and per-check
  dot. `data-testid="flow-detail-panel"`.
- `apps/web/src/features/plan/closedLoop/FlowDetailPanel.module.css` -- ASCII-only;
  tokens mirror the sibling LoopDesignScorePanel / stageCard palette.
- `apps/web/src/features/plan/closedLoop/__tests__/loopIntegrity.test.ts` -- 9 tests
  (`@vitest-environment happy-dom` for parity with the sibling suites). A typed
  `done(flow, id)` lookup helper narrows around `noUncheckedIndexedAccess` instead of
  raw `.checks[N]` index access (the index access tripped 18 TS2532 errors under the
  web tsconfig; the lookup helper cleared them with no runtime change).

**Modify**
- `apps/web/src/features/plan/WasteVectorListView.tsx` -- removed the local
  `parsePositive` (now imported from `flowFormUtils.js`); list rows are now selectable
  `<button>`s (aria-pressed) that toggle a `selectedId`; renders `<FlowDetailPanel>`
  for the selected flow below the list; the Remove control clears selection when it
  removes the selected flow. Legacy author form + flat list otherwise unchanged.

## Verification

- **Typecheck:** web `tsc --noEmit -p apps/web/tsconfig.json` EXIT 0 (with
  `node --max-old-space-size=8192`); shared `tsc --noEmit` EXIT 0 (run SEPARATELY).
- **Vitest (bounded, `--pool=forks --testTimeout=20000`, from `apps/web`):** the
  whole closedLoop suite 28/28 green (loopIntegrity 9, flowStatusModel 9,
  loopDesignScore 10).
- **Live-verify limitation (honesty gate).** `FlowDetailPanel` lives inside
  `WasteVectorListView` inside `WasteVectorTool` -- the same legacy `PlanModuleSlideUp`
  "soil" module host that A1 found unreachable through the current strata-spine IA via
  automation. Per [[project-screenshot-hang]] honesty discipline, the editor was NOT
  exercised on a live MTC surface this slice. Evidence basis: the passing 28/28 unit
  suite + clean web/shared typecheck + a clean project-scoped store read.
  Follow-up: when A4's "Loop / Handoff" tab re-exposes WasteVectorTool through the
  strata IA, do the deferred live render-verify of the editor + checklist.

## Commit shape

Explicit-path commit (`git add --` the 6 files only), guarded with `Compare-Object`
(intended == staged) run atomically with `git commit -F` in one shell invocation.
Heavy foreign WIP in the working tree left untouched -- never `git add -A`. Commit-only
(not pushed). ASCII-only; JS/JSON apostrophes double-quoted; message via system temp +
`git commit -F` ([[feedback-commit-immediately-on-rebased-branches]],
[[project-branch-rebase]]).

## State after

Plan Module 5 now has a per-flow design-intent editor + loop-integrity checklist on
top of the A0 fields. Next: Slice A3 -- `flowMapGeometry.ts` (+test) and the flow-map
rendering upgrade (`ClosedLoopGraphCard` + `WasteVectorDashboardView`: width-by-volume,
dash-by-status, orphan pulse via CSS @keyframes, via waypoints). CSRA untouched
([[fiqh-csra-erased-2026-05-04]]).
