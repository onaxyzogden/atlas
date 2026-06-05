# 2026-06-02 -- Plan objective detail panel reflects wizard-answered checklist items

**Branch:** `feat/atlas-permaculture`
**Plan:** "Plan detail panel ignores wizard-answered checklist items" (single-slice
fix, approved 2026-06-02).
**Commit:** `bff5b64a` -- thread effective progress into `ObjectiveDetailPanel`
(2 files, +22/-7).

## Context

Operator report: on the Plan pages the checklist did NOT show `s1-vision-c1`
("State the primary purpose of this land project...") or `s1-vision-c4` ("Confirm
any secondary land uses...") as complete, even though both are answered in the
project creation wizard -- while the SAME two items DID show complete in the Act
tier-shell. The fix had to make Plan reflect those wizard-derived completions,
matching Act.

## Root cause

Two completion data paths existed and the Plan **detail panel** was on the wrong
one:

- **answerSpec auto-satisfy.** `s1-vision-c1` carries `answerSpec.sourceField =
  'projectTypeRecord.primaryTypeId'` and `s1-vision-c4`
  `'projectTypeRecord.secondaryTypeIds'`
  (`packages/shared/src/constants/plan/catalogues/universal.ts`). The creation
  wizard writes exactly those keys. The single source of truth,
  `useEffectiveChecklistProgress` -> `computeEffectiveProgress(..., metadata)`,
  runs an answerSpec loop (`effectiveProgress.ts`) that auto-satisfies any
  checklist item whose source data is filled in. Act uses it, so Act reflected
  the wizard answers.
- **The Plan stratum spine list already used it too:** `PlanStratumShell`
  computes `effectiveProgress` once and feeds `effectiveProgress.flatMap` to the
  status engine -- so the spine status was already correct.
- **The bug:** `PlanStratumShell` passed only `status` + `visionDerivedMap` down
  to `<ObjectiveDetailPanel>`, NOT the effective completed ids. The panel then
  RE-READ raw store state via
  `usePlanStratumProgressStore(...getCompletedItemIds(projectId, objective.id))`
  and threaded only the Vision-bridge map. Raw store + Vision bridge never run
  the answerSpec auto-satisfy, so c1/c4 never showed complete in the panel's
  `DecisionProgressBar` + `DecisionChecklist`.

## What shipped

Threaded the already-computed effective progress down instead of re-reading the
raw store -- no second hook call, no recompute, single source of truth preserved.

- **`PlanStratumShell.tsx`** -- added a module-level stable
  `EMPTY_COMPLETED: readonly string[] = []` (referential stability) and passed
  `completedItemIds={effectiveProgress.byObjective[activeObjective.id] ??
  EMPTY_COMPLETED}` to the panel mount, mirroring how `status` is already
  threaded.
- **`ObjectiveDetailPanel.tsx`** -- added a `completedItemIds: readonly string[]`
  prop (documented), removed the raw-store `getCompletedItemIds` read, and dropped
  the now-unused `usePlanStratumProgressStore` import. `useProjectStore` stays
  (enterprise-eligibility read). `derivedEvidence={visionDerivedMap}` still passed
  to both children for the "From Stage Zero Vision" display badge.

## Known-separate gap (NOT this bug)

`s1-vision-c2`/`c3` carry `answerSpec.sourceField = 'visionProfile.*'`, which the
creation wizard does NOT write (the Stage Zero Vision Builder is not wired into
the wizard). They will not auto-satisfy from wizard completion under any fix here
-- a separate feature gap. This is why the S1 objective rolls up below full at the
objective level even with c1/c4 satisfied. Noted, out of scope.

## Verification

Typecheck clean for both touched files (the only `tsc` error was in
`store/__tests__/cascadeDelete.test.ts`, an untracked foreign-WIP scratch file --
not part of this change). 21 unit tests green (`checklistProgress` 7,
`DecisionProgressBar` 4, `DecisionChecklist` 10). **Live** on a wizard project
("Halton Hills", primaryTypeId=regenerative_farm, secondaryTypeIds set): the S1
Vision objective detail panel now shows Decision progress **1 / 7** (was 0/7) with
both target item rows `data-complete="true"` -- "State the primary purpose..." and
"Confirm any secondary..." -- and all `visionProfile.*`-sourced items correctly
still incomplete. Real DOM (`preview_eval`) + screenshot evidence captured.

## Commit shape

Explicit-path commit (`git add --` the two files only), guarded with
`Compare-Object` (intended == staged). The guard caught four pre-staged foreign
`store/` files in the index (`cascadeDelete*`, `projectStore*`) -- unstaged before
committing so only the two Plan files landed. Never `git add -A`; heavy foreign
WIP in the working tree (financial, maps, CSS, graphify-out, scratch files) left
untouched ([[feedback-no-deletion]]). Commit-only (not pushed). ASCII-only.

## State after

The Plan objective detail panel now reflects the same checklist completion as the
stratum spine and the Act tier-shell, via the one effective-progress source of
truth. ADR not warranted (mechanism already documented under the grounding/answer-
spec work); see [[entities/web-app]].
