# 2026-06-01 -- Act: move prefilled answer recap + Edit-in-Plan into the Vision forms modal

**Branch:** `feat/atlas-permaculture` | **Commit:** `6e8bb88c` (not pushed)
**Entity:** [[entities/act-tier-shell]] | **Predecessor:** [[log/2026-06-01-atlas-act-answerspec-typed-recap]]

## What shipped

The three prefilled `s1-vision` checklist answers (project type `c1`, success
criteria `c2`, capital `c3`) appeared TWICE and inconsistently: a read-only recap
card (value + "Edit in Plan" button) in the right sidebar, AND an empty re-ask
textarea tab in the Vision forms modal (formId === checklist item id, 1:1). The
operator asked that the project type and the "Edit in Plan" affordance live in the
modal TabsPanel, not the sidebar. Confirmed via AskUserQuestion: tab body for a
prefilled item = recap value + "Edit in Plan" (read-only, no textarea); sidebar =
keep value, drop its Edit button; scope = all three answerSpec items.

One cohesive commit, 11 files:

1. **New shared `AnswerValue.tsx` (+ `.module.css`)** -- the typed VALUE renderer
   extracted verbatim out of `AnswerRecap` (`single_select` chip / `multi_select`
   chip row / `band` pills / `steward` list / `text` prose, via `labelForOption`).
   Single source of truth across both surfaces; light value pills stay legible as
   light-on-dark tags on the dark modal.
2. **New shared `EditInPlanButton.tsx` (+ `.module.css`)** -- the Edit-in-Plan
   `useNavigate` deep-link extracted from `AnswerRecap.onEdit` (`wizard-step` ->
   `/v3/project/$projectId/wizard/$step`; `plan-type` -> `/v3/project/$projectId/plan`).
   Dark gold token styling for the modal context.
3. **`AnswerRecap.tsx` (+ CSS)** -- sidebar keeps the value (via `<AnswerValue>`),
   drops the Edit button, `onEdit`/`useNavigate`/`Pencil`, local `renderValue`, and
   the `projectId` prop; moved value CSS deleted.
4. **`ActTierExecutionPanel.tsx`** -- drops `projectId` from the `<AnswerRecap>`
   mount; answered-answerSpec guard unchanged.
5. **`VisionFormsTabsModal.tsx` (+ CSS)** -- recap-aware: new props `projectId`,
   `metadata`, `checklistItems`; a tab mapping to an answered answerSpec renders
   prompt + `<AnswerValue>` + hint + `<EditInPlanButton>`, no textarea, Save
   disabled; non-prefilled tabs keep the textarea path; captured dot shows for
   recap tabs.
6. **`ActTierShell.tsx`** -- threads `projectId={id}`,
   `metadata={project.metadata ?? null}`,
   `checklistItems={selectedObjective?.checklist ?? []}` into the modal.
7. **`__tests__/VisionFormsTabsModal.test.tsx`** -- defaults gained the three new
   required props (empty `checklistItems` preserves textarea-path coverage; the
   recap path is covered in preview).

## Verification

tsc clean (web; shared unchanged); modal suite 6/6. Live preview on the operator's
project: sidebar recap shows the value with `editLinks: 0`; the Primary-purpose
modal tab shows "Regenerative Farm" + Edit-in-Plan with `modalTextareas: 0`,
`recapActions: true`, Save disabled, hint "Answered in Plan - edit there to
change"; a non-prefilled tab (Labour inventory) shows `textareas: 1`,
`editInPlan: 0`; Edit-in-Plan on the project-type (c1) tab navigated to
`/v3/project/<id>/plan`. No console errors. Screenshot captured.

## Notes / institutional

- **Foreign-WIP-heavy tree:** the working tree carried extensive out-of-band
  foreign changes (financial, plan CSS, DesignMap, wiki, graphify-out, plus an
  untracked `apps/web/src/v3/strata/` refactor). Each of my 7 modified files was
  diff-inspected to confirm it carried ONLY my hunks before staging exactly the 11
  files by explicit path (`git diff --cached --name-only` verified; never
  `git add -A`). Unlike the predecessor `c640acbb` rebase-race, this slice
  committed cleanly with no co-mingling, reinforcing
  [[feedback-commit-immediately-on-rebased-branches]].
- Not pushed (branch rebased externally).
- ASCII-only copy; CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).

## Follow-up -- dark-mode token fix (`9a53c310`)

The recap card + value chips rendered as a LIGHT card on the dark sidebar under
active dark mode (hardcoded light hex that ignored `data-theme`). Both
`AnswerRecap.module.css` (`.recap`/`.recapCheck`/`.recapLabel`) and
`AnswerValue.module.css` (`.chip`/`.chipSelected`/`.bandPill`/steward/text) were
de-hardcoded to theme tokens (`--color-surface`/`-border`/`-text`/`-accent`/
`-on-accent`/`-surface-alt`/`-success(-muted)`/`-info(-muted)`/`-text-muted`) so
the surfaces follow the active theme. Selected single_select stays sage-green,
band stays info-blue. CSS-only, 2 files; dark-mode verified via `preview_eval`.
Two foreign `ProofSyncIndicator.tsx` files were unstaged before committing. Not
pushed.
