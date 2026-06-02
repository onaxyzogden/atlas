# 2026-06-01 -- Act answerSpec: typed read-only recap of answers already given in the wizard/vision

**Status:** accepted (shipped) | **Branch:** `feat/atlas-permaculture` | **Surface:** Atlas web (`apps/web`) + `@ogden/shared`
**Commit:** `c640acbb` ("typed read-only recap of answers already given in wizard/vision"); not pushed (branch externally rebased; commit-only)
**Entity:** [[entities/act-tier-shell]] | **Log:** [[log/2026-06-01-atlas-act-answerspec-typed-recap]]
**Builds on:** the S1 `visionProfile -> checklist` bridge ([[entities/act-tier-shell]] "Data: Evidence capture persistence" + `computeEffectiveProgress` union)

## Context

On the Act tier-shell, objective-1 (Stratum-1 vision) checklist items re-asked
the steward questions that were ALREADY answered during project creation -- the
Primary Purpose / project type (the wizard's prescribed single-select), the
vision outcomes (multi-select chips), and budget/timeline bands. The steward saw
a blank free-text prompt where they had already made a structured choice
upstream.

A one-way bridge (`visionProfileToChecklist`) already MARKED those S1 items
complete and showed a flat evidence string, but it never (a) showed the answer
in the FORMAT it was originally given (a select as a select, chips as chips, a
band as a band), nor (b) generalised beyond the two hand-coded S1 derivations,
nor (c) offered a way back to where the answer is authored.

Three operator decisions framed the build (approved in plan mode):
1. **Scope** = full framework, all objectives (data-driven, one pass) -- not an
   S1-only special case.
2. **Editing** = read-only recap + "Edit in Plan" link. The Act surface shows
   the prior answer in its original control style, read-only; the item
   auto-satisfies from source data -- NO re-resolution / re-entry in Act.
3. **Format source** = a declarative answer-spec on the checklist item + a typed
   read-only renderer (not per-item bespoke JSX).

Amanah Gate: surfacing already-given answers to reduce duplicate data entry;
no riba / gharar. Clean.

## Decisions

1. **Declarative `answerSpec` on the checklist item, all fields optional.**
   `AnswerSpecSchema` on `PlanDecisionChecklistItemSchema` in
   `packages/shared/.../planStratumObjective.schema.ts`, every field `.optional()`
   per the schema's established discipline, so all existing seed/catalogue
   objects validate unchanged. Shape:
   `{ fieldType: 'single_select'|'multi_select'|'text'|'band'|'steward';
   optionSetId?: AnswerOptionSetId; sourceField: string | string[] (dotted path
   into ProjectMetadata); editRoute: {kind:'wizard-step';step} | {kind:'plan-type'} }`.
   Authored via a new `ckA(id, label, answerSpec)` helper in the catalogues'
   `authoring.ts`, applied to the `s1-vision-c1/c2/c3` items in `universal.ts`.

2. **Resolver + label registry live in `apps/web/src/v3/strata/`, NOT
   `packages/shared`.** They read the apps/web-only `visionBuilderQuestions.ts`
   for human labels, so placing them in shared would require a forbidden
   shared -> web import. `resolveAnswerSpec(metadata, spec): ResolvedAnswer`
   is a pure, deterministic dotted-path reader; `answerOptionLabels.labelForOption`
   maps stored ids to display labels. Render-safe (`isAnswered:false`, empty
   `values`) when metadata is null.

3. **The item auto-satisfies through the EXISTING progress union, not a new
   path.** `computeEffectiveProgress` gains a 5th `metadata?` arg and walks every
   objective's checklist; any item whose `answerSpec` `resolveAnswerSpec` reports
   `isAnswered` is unioned into the flat completion map -- the same idempotent
   "only ever set an id true" mechanic the two bespoke S1 derivations already
   use. Plan, the Act tier-shell, Portfolio cards, and Home urgency all read
   `computeEffectiveProgress` (directly or via `useEffectiveChecklistProgress`),
   so they agree with zero per-surface change; the three call sites
   (`useEffectiveChecklistProgress`, `usePortfolioPlanProgress`,
   `useProjectUrgency`) just thread `project.metadata` through as the 5th arg.

4. **Typed read-only renderer swaps the checkbox, does not replace evidence.**
   `AnswerRecap.tsx` (+ CSS module) renders the resolved value in its original
   control style: `single_select` -> one selected chip; `multi_select` -> chip
   row; `band` -> blue band pills; `steward` -> name/email lines; `text` ->
   read-only prose. A static green check stands in for the (now absent)
   interactive checkbox, and an "Edit in Plan" link routes via `editRoute`
   (`wizard-step` -> `/v3/project/$projectId/wizard/$step`; `plan-type` ->
   `/v3/project/$projectId/plan`). `ActTierExecutionPanel` renders `<AnswerRecap>`
   IN PLACE OF the bare checkbox `<label>` only when `item.answerSpec` is present
   AND resolves answered; every other item (no spec, or unanswered) falls through
   to today's checkbox unchanged. The generic `summary-note` Evidence descriptor
   is untouched -- the recap supplements evidence, it does not replace it.

5. **Preserve the legacy S1 derivations; do not delete in this pass.** The two
   bespoke `deriveStratum1*Map` functions stay until ALL their items carry an
   `answerSpec` and the data-driven path supersedes them -- retire later, per the
   no-deletion-in-revamps convention.

## Alternatives considered

- **Per-item bespoke recap JSX** -- rejected; does not scale to "full framework,
  all objectives" and duplicates control rendering. A declarative spec + one
  typed renderer is the generalisation of the proven S1 bridge.
- **Put the resolver/labels in `packages/shared`** -- rejected; the vision
  option labels live only in apps/web (`visionBuilderQuestions.ts`), and a
  shared -> web import is forbidden. Lifting the label tables into shared was
  possible but out of scope for this pass; the resolver sits in `v3/strata/`
  beside the other effective-progress code instead.
- **Let Act re-resolve / re-author the answer inline** -- rejected per operator
  decision 2; Act is read-only recap + a link back to the authoring surface. The
  item auto-satisfies from source data, so there is no surprise re-entry.
- **A new completion path for answerSpec items** -- unnecessary; the existing
  `computeEffectiveProgress` union already unifies stored + wizard-derived
  completion across all four surfaces. Sourcing one more derivation from
  `answerSpec` keeps a single source of truth.

## Consequences

- `PlanDecisionChecklistItemSchema` gains an optional `answerSpec` (additive;
  895 shared tests unchanged + green).
- `computeEffectiveProgress` is now 5-arity (`metadata?` optional, defaulted);
  the three hook call sites pass `project.metadata`. Behaviour is identical when
  no answerSpec'd item is present.
- New web tests: `resolveAnswerSpec` (8 cases -- missing metadata, single_select
  dotted-path answered/unanswered, multi_select string-array + object-of-arrays
  flatten, band all-axes rule, steward "Name <email>" formatting, text verbatim)
  + 1 `computeEffectiveProgress` union case. apps/web + `@ogden/shared` tsc exit
  0; 908 tests green.
- **Live-verified (2026-06-01):** on "Baseline Test Homestead" (regenerative_farm,
  no visionProfile) the project-type single_select recap rendered "Regenerative
  Farm" as a selected chip with an "Edit in Plan" link; vision items lacking
  source data fell back to plain checkboxes (the documented edge case). No single
  demo project had BOTH a `projectTypeRecord` and a `visionProfile`, so a fully
  populated multi-recap screenshot was not achievable; the project-type recap +
  fallback were screenshot-confirmed.

## Co-mingled commit (institutional note)

`c640acbb` also carries a pre-existing "Raise follow-up need" wiring in
`ActTierExecutionPanel.tsx`/`.module.css` (the `RaiseNeedForm` modal +
`.raisedConfirm`), which was already in the working tree from
[[decisions/2026-06-01-atlas-act-asbuilt-deviation-loop]]'s sibling session and
is inseparable here without interactive (`git add -p`) staging, which is
unsupported in this environment. The two features ride together under this
commit; the message discloses both and carries the attribution trailer. From the
raise-need author's side this same event is recorded as a "rebase-race" in
[[log/2026-06-01-atlas-act-exec-panel-scroll-raise-need]] -- same commit, two
perspectives. Reinforces [[feedback-commit-immediately-on-rebased-branches]].

- ASCII-only copy; CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).
