# 2026-06-03 -- Closed-loop Plan->Act workflow: Slice A4 (approval gate + Act handoff contract)

**Branch:** `feat/atlas-permaculture`
**Commit:** `627503e9` -- `loopApprovalGate` + `loopHandoffContract` pure helpers
(+13 tests), `ActHandoffPreviewPanel`, the domain-guarded `PlanToActHandoff.onEmit`
enrichment, and the "Loop / Handoff" tab on `WasteVectorTool` (8 files; **not
pushed**). Fifth and FINAL slice of Phase A of the multi-session Plan->Act
closed-loop / waste-vector workflow. See ADR
[[decisions/2026-06-03-olos-plan-act-closed-loop-workflow]] and entity
[[entities/closed-loop-workflow]].

## Context

Slices A0-A3 shipped the data-model contract, the read-only score strip, the
per-flow editor + integrity checklist, and the flow-map rendering upgrade. A4
closes Phase A: it defines the cross-phase data contract Phase B will consume,
gates approval, and previews + triggers the enrichment onto the existing
`ActHandoffPackage` -- WITHOUT a schema change and WITHOUT a second handoff path.

Amanah gate: land-stewardship planning UI; no riba/gharar. Clean.

## What shipped (8 files)

**Create**
- `apps/web/src/features/plan/closedLoop/loopApprovalGate.ts` -- pure, render-free.
  `canApproveLoop(validation, allowOrphanOutputs) -> { ok, counts, reason }`.
  Blocking order (first failure wins the reason): empty flows -> dangling endpoints
  (any flow with a null source OR sink) -> orphan fertility (no flow in or out;
  blocks even with the escape hatch) -> orphan outputs (fertilityWithoutFeedstock)
  unless `allowOrphanOutputs`. `counts` always populated. Mirrors the existing
  `getAllowOrphanOutputs(project)` escape-hatch precedent (there is no `statusGate.ts`).
- `apps/web/src/features/plan/closedLoop/loopHandoffContract.ts` -- THE cross-phase
  contract. Pure `buildLoopActPayload(project, flows, infra, validation)` maps the
  MaterialFlow design onto the EXISTING `ActHandoffPackageSchema` (no schema change):
  throughput -> one material per flow with the dominant unit (kg/month > L/month >
  kWh/month); per-flow cadence -> monitoring requirements (cadence via
  `cadenceLabel`); closed flows (both endpoints pinned) -> success criteria; the
  source->via...->sink graph -> a topology-ordered `sequence` (upstream-first, pure
  cycles broken deterministically in stable input order). Returns
  `Partial<ActHandoffPackage>` (the four enriched arrays + a `workScope` summary;
  id/projectId/planDecisionRecordId/createdAt stay with the store's `createPackage`)
  plus a `LoopActSummary` for the preview. Endpoint labels resolve node labels ->
  infra type -> free-text -> id.
- `apps/web/src/features/plan/closedLoop/ActHandoffPreviewPanel.tsx` (+ `.module.css`)
  -- read-only "what approval will generate": the gate verdict chip + reason, a
  counts row (flows / closed-loop / dangling / orphan outputs with warn cues), the
  workScope, and four preview lists (materials / monitoring / success / ordered
  sequence). All logic in the two tested helpers; this file only wires data + markup.
- Two test files (`@vitest-environment happy-dom` for parity): `loopApprovalGate.test.ts`
  (6: empty / dangling count / orphan-fertility-blocks-even-with-hatch /
  orphan-outputs-blocked-when-off / -permitted-when-on / fully-closed approves) and
  `loopHandoffContract.test.ts` (7: empty design / throughput->dominant unit /
  monitoring only with labelled cadence / success only closed / sequence upstream
  ordering with via waypoints / pure-cycle stable break / free-text+id fallback).

**Modify**
- `apps/web/src/v3/olos/handoff/PlanToActHandoff.tsx` -- additive, domain-guarded
  (`objective.domain === "soil"`) branch in `onEmit`: when the domain matches and a
  project is loaded, `buildLoopActPayload({ id: projectId }, loopFlows, loopInfra,
  loopValidation).payload` enriches the `createPackage` args (workScope / sequence /
  materials / successCriteria / monitoringRequirements). Every other domain keeps
  today's empty arrays -- single handoff path. Hook reads are unconditional;
  `useClosedLoopValidation` is fed a minimal `{ id: projectId } as LocalProject`
  stub because the hook reads ONLY `project.id` (verified), keeping the call legal
  under the Rules of Hooks regardless of project load.
- `apps/web/src/features/plan/WasteVectorTool.tsx` -- `View` type widened to
  `'list' | 'dashboard' | 'loop'`; a third "Loop / Handoff" tab renders
  `ActHandoffPreviewPanel`. Reuses module routing; no new route, no StageShell slot.

## Verification

- **Typecheck:** shared `tsc --noEmit` EXIT 0. Web `tsc --noEmit -p
  apps/web/tsconfig.json` (with `node --max-old-space-size=8192`) reports ONLY the
  2 untracked foreign-WIP `apps/web/src/compost/ObserveStage.tsx` errors (`??`, not
  mine, externally rebased in per [[project-branch-rebase]]); my 8 files produce
  zero errors. Left untouched per the foreign-WIP never-edit discipline.
- **Vitest (bounded, `--pool=forks --testTimeout=20000`, from `apps/web`):** the
  closedLoop suite 53/53 green (loopApprovalGate 6 + loopHandoffContract 7 added to
  the prior 40). The two modified surfaces have no unit tests (logic lives in the
  tested pure helpers).
- **Live-verify limitation (honesty gate).** The new "Loop / Handoff" tab lives
  inside `WasteVectorTool` -- the same legacy `PlanModuleSlideUp` "soil" module host
  that A1/A2/A3 found unreachable through the current strata-spine IA via automation.
  Adding the tab did NOT change that host's reachability, so the panel + the
  end-to-end emit (orphan -> gate blocked -> wire -> gate clears -> emit populates
  the Act package) were NOT exercised on a live MTC surface this slice. Per
  [[project-screenshot-hang]] honesty discipline this is reported, not fabricated.
  Evidence basis: the 53/53 unit suite + clean shared typecheck + clean web
  typecheck for the touched files. The deferred live render-verify for the whole of
  Phase A now depends on a strata-IA route to WasteVectorTool (a separate surfacing
  task, not part of the helper/contract work).

## Commit shape

Explicit-path commit (`git add --` the 8 files only), guarded with `Compare-Object`
(intended == staged) run atomically with `git commit -F` in one shell invocation.
The untracked foreign-WIP `src/compost/` tree and all other dirty/`??` paths were
NOT staged -- never `git add -A`. Commit-only (not pushed). ASCII-only; JS/JSON
apostrophes double-quoted; message via system temp + `git commit -F`
([[feedback-commit-immediately-on-rebased-branches]]).

## State after

**Phase A (Plan-side enrichment) is COMPLETE.** A steward can design closed loops
(A0-A2), see them scored (A1) and rendered with throughput / status / via / orphan
signal (A3), preview the gate verdict + the exact Act payload approval will
generate (A4), and -- for the soil domain -- emit a handoff package enriched with
materials / monitoring / success criteria / an ordered sequence built from the
loop, all onto the EXISTING `ActHandoffPackageSchema`. `buildLoopActPayload` +
`canApproveLoop` are the public contract Phase B consumes. Next: Phase B (re-detail
at start) -- the animated approval-transition that GENERATES stewardship routines
onto `stewardshipRoutineStore` (+ execution/group stores). CSRA untouched
([[fiqh-csra-erased-2026-05-04]]).
