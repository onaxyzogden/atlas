# 2026-06-01 -- Act answerSpec: typed read-only recap of wizard/vision answers

**Branch:** `feat/atlas-permaculture` | **Commit:** `c640acbb` (not pushed)
**ADR:** [[decisions/2026-06-01-atlas-act-answerspec-typed-recap]] | **Entity:** [[entities/act-tier-shell]]

## What shipped

Act tier-shell objective checklist items that re-ask questions already answered
in project creation now render a prefilled, read-only recap in the original
control style (selected chip / chip row / band pills / steward lines / prose)
plus an "Edit in Plan" link, instead of a blank checkbox/text prompt. The item
auto-satisfies from `ProjectMetadata` -- no re-entry in Act.

5 slices, one commit:
1. **`packages/shared`** -- optional `AnswerSpecSchema` on
   `PlanDecisionChecklistItemSchema` (all `.optional()`, additive); `ckA`
   authoring helper; `s1-vision-c1/c2/c3` answerSpecs in `universal.ts`.
2. **`apps/web/src/v3/strata`** -- pure `resolveAnswerSpec(metadata, spec)`
   (dotted-path read, multi-value + object-of-arrays flatten, band all-axes
   rule, steward "Name <email>" format); `answerOptionLabels.labelForOption`
   id->label registry (placed in `v3/strata`, NOT shared, to avoid a
   shared -> web import of `visionBuilderQuestions.ts`).
3. **`computeEffectiveProgress`** -- new 5th `metadata?` arg unions
   answerSpec-derived completion across all objectives (same idempotent union the
   bespoke S1 derivations use). The three consumers
   (`useEffectiveChecklistProgress`, `usePortfolioPlanProgress`,
   `useProjectUrgency`) thread `project.metadata` through; Plan/Act/Portfolio/Home
   stay coherent with zero per-surface change.
4. **`AnswerRecap.tsx` (+ CSS)** -- typed read-only renderer; `ActTierExecutionPanel`
   swaps the bare checkbox for it when an item carries an answered answerSpec.
5. **Verify + commit** -- tsc clean (web + shared); 908 tests green (8 new
   `resolveAnswerSpec` + 1 `computeEffectiveProgress` union); live screenshot on
   "Baseline Test Homestead" confirmed the project-type "Regenerative Farm" chip
   + "Edit in Plan", with plain-checkbox fallback for data-less items.

## Notes / institutional

- **Preserved** the two legacy `deriveStratum1*Map` derivations (retire only when
  their items carry answerSpec) -- no-deletion-in-revamps.
- **Co-mingled commit:** `c640acbb` also carries the pre-existing "Raise
  follow-up need" wiring (RaiseNeedForm modal + `.raisedConfirm`) that was already
  in the `ActTierExecutionPanel` working tree and is inseparable without
  interactive staging. The commit message discloses both features and carries the
  attribution trailer. Same event is logged from the raise-need side as a
  "rebase-race" in [[log/2026-06-01-atlas-act-exec-panel-scroll-raise-need]].
  Reinforces [[feedback-commit-immediately-on-rebased-branches]] and the
  stage-only-my-files discipline (the commit staged exactly 15 feature files;
  the many unrelated working-tree changes -- financial, plan CSS, DesignMap --
  were left unstaged).
- ASCII-only copy; CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).
