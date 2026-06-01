# 2026-06-01 -- Act exec panel: scroll containment (sticky header, body-only scroll) + functional "Raise follow-up need"

**Branch.** `feat/atlas-permaculture` (rebased out-of-band; 0 behind / 35 ahead
of origin, **not pushed**). Plan:
`~/.claude/plans/elements-of-this-concept-toasty-ember.md` (final iteration:
"Act exec panel: contain panel height + functional Raise follow-up need").
Entity: [[entities/act-tier-shell]]. Two commit-as-they-verify slices on the
production right-rail `ActTierExecutionPanel`.

## Slice 1 -- contain panel height, sticky header, body-only scroll (`eae3644f`, CSS-only)

The panel's bottom bento (Record button) was clipped until the whole right rail
scrolled, and the objective title + progress bar scrolled away with the body.
Root cause: `.execPanel` was `display:flex; flex-direction:column;
overflow:hidden` with NO height, so it grew past its `.rightBody` scroll
viewport. Three rules in
[ActTierExecutionPanel.module.css](apps/web/src/v3/act/tier-shell/ActTierExecutionPanel.module.css):

- `.execPanel` -- add `height: 100%` (fills the `.rightBody` flex cell instead of
  overflowing it).
- `.execHeaderBox` -- add `flex: 0 0 auto` (title + progress keep natural height,
  never shrink, behave as a fixed header).
- `.execBody` -- add `flex: 1 1 auto; min-height: 0; overflow-y: auto` (ONLY the
  body scrolls; `min-height:0` is load-bearing so the flex item shrinks below
  content and its own overflow engages).

No JSX change -- header and body were already sibling blocks inside `.execPanel`.
`.rightBody`'s own `overflow-y:auto` becomes a harmless no-op (panel now fits its
cell exactly). Preview-verified: `.execBody.scrollHeight > clientHeight`,
header `flex` `0 0 auto`, body `overflow-y` `auto`, panel fits cell.

## Slice 2 -- "Raise follow-up need" creates a tracked ObservationNeed (TSX + 1 CSS rule)

Operator decision: **Full tracked need (reuse RaiseNeedForm).** The inert
`.linkBtn` now opens the shared `RaiseNeedForm` in a `Modal` and creates a real
`ObservationNeed`. Five additive edits to
[ActTierExecutionPanel.tsx](apps/web/src/v3/act/tier-shell/ActTierExecutionPanel.tsx):

- Imports: `Modal`, `RaiseNeedForm` (default), `buildRaisedNeed` +
  `type RaiseNeedInput`, `useObservationNeeds`, `useObservationNeedStore`,
  `type ObserveModule`.
- State: `raising` / `raisedTitle` flags; `createNeed` selector; `needViews =
  useObservationNeeds(projectId)`.
- `meanCenter()` (average existing need centers, `[-78.2, 44.5]` MTC fallback) +
  `raiseFollowUp(input)` -> `buildRaisedNeed(input, { id: crypto.randomUUID(),
  projectId, module: input.module, target: { center: meanCenter() },
  origin: 'manual' })` then `createNeed` + inline confirmation.
- `.linkBtn` `onClick={() => setRaising(true)}` + a `.raisedConfirm` line when
  `raisedTitle` is set.
- `<Modal>` at component root (sibling of the trigger sheet, NOT inside the now-
  scrolling `.execBody`) wrapping `<RaiseNeedForm showModulePicker
  defaultModule={domainId ?? undefined} submitLabel="Raise need" .../>`.

Key facts: `ObserveModule = UniversalDomain`, so the panel's already-derived
`domainId = getPrimaryDomainForObjective(objective)` IS the module (no mapping).
`RaiseNeedForm` is presentational -- returns `RaiseNeedInput & { module }`; the
host owns id/target/origin/persistence. The need lands in the **ObservationNeed**
store (Observe Command Centre + `DomainObservationNeeds`), NOT the panel's "This
need's activity" feed (`observeDataPointStore`). One CSS rule (`.raisedConfirm`,
green confirmation text).

**Preview verification (eval; WebGL screenshot disclosed-transient per
[[project-screenshot-hang]]):** modal opened with `RaiseNeedForm` (domain
`vision-intent` pre-selected for `s2-terrain`); filled title "Recheck terrain
after rains" + reason; "Raise need" -> modal closed, inline confirmation rendered;
`localStorage['ogden-observation-needs']` gained a need under
`createdByProject['8a815400-...']` (origin `manual`, module `vision-intent`,
single required "Summary note" evidence, version 3). tsc (apps/web) EXIT 0.

## Process / covenant -- out-of-band rebase swept Slice 2 into a foreign commit

Slice 1 committed cleanly the moment it verified (`eae3644f`, 1 CSS file, exact
name, BOM-free UTF-8 message). Slice 2 verified but, in the window before its
commit, an **out-of-band rebase actor** ran `git add` + commit on the branch. The
reflog shows `reset: moving to HEAD` (clearing my staged hunk-only index) then
`commit: c640acbb` "feat(act): typed read-only recap of answers already given in
wizard/vision" -- the foreign AnswerRecap / `resolveAnswerSpec` / effectiveProgress
/ schema refactor (15 files). Because my Slice 2 edits were sitting uncommitted in
the same `ActTierExecutionPanel.tsx` working file, the foreign `git add` captured
them too: `git show c640acbb` carries all 5 Slice 2 edits AND the `.raisedConfirm`
CSS (`7 +`). My own `git commit -F` then ran against an empty index -> no-op.

I had prepared the documented hunk-only patch-against-HEAD stage (reconstruct
`HEAD + mine-only` on a temp file, `git diff --no-index` -> patch, rewrite header
paths, `git apply --cached`) precisely to keep the foreign WIP out of my commit --
the staged diff was verified clean (Slice 2 only) and the residual working-tree
diff was verified foreign-only. The rebase landed between that stage and the
commit.

**Outcome.** Slice 2 code is live and intact in HEAD (verified line-by-line in
`c640acbb`), so the feature works. No history surgery was attempted: `c640acbb`
carries substantial foreign work and the branch is rebased externally --
rewriting it would violate [[feedback-no-deletion]] / [[project-branch-rebase]]
and risk wiping the external actor's work. The cost is cosmetic: my Slice 2 is
under a foreign message without my `Co-Authored-By` trailer. **Lesson
([[feedback-commit-immediately-on-rebased-branches]]):** on this branch the
verify->commit window is where the sweep strikes; close it to zero. Foreign WIP
left untouched throughout. CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).
