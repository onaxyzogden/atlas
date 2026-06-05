# 2026-06-01 -- Steward recap reaches per-type projects (universal s1-vision-steward)

**Branch:** `feat/atlas-permaculture` | **Commit:** `6223ade6` (2 files, +35; not pushed)
**Entity:** [[entities/act-tier-shell]] | **Predecessor:** [[log/2026-06-01-atlas-act-answerspec-stewardship-secondary-type]]

Direct follow-up to the stewardship + secondary-type slice, closing its
"recommended next session": the steward recap reached **legacy/untyped projects
only** because the s1-stewardship objective lives solely in the level-3 static
skeleton, while typed projects resolve (levels 1-2 of `useProjectObjectives`) to
the per-type + universal catalogues, which carried **no stewardship surface at
all**.

## Decision (AskUserQuestion)

Operator chose **Option A -- a steward item inside the existing Vision card**, not
a standalone stewardship objective. Rationale: a new universal objective would (a)
trip the 5-15-item catalogue floor (forcing 4 manufactured manual checkboxes with
no data source -> a perpetually-incomplete card) and (b) break every per-type
resolution count test (ecovillage 50 / agritourism 48 / wellness 46 / silvopasture
45 / orchard 44, each keyed to 19 universal objectives). Option A touches zero
count tests and weakens no invariant.

## Changes (2 files)

- `universal.ts`: added an optional `s1-vision-steward` `ckA` item
  (`fieldType: steward`, `sourceField: ['team.primarySteward','team.coStewards']`,
  edit -> `wizard-step team`) to the `s1-vision` objective and appended its id to
  the `s1-vision-dg1` "Purpose & intent" decision group (s1-vision is partitioned;
  `expectFullPartition` requires every item in exactly one group). Reuses the
  identical steward answerSpec from the prior slice; because every primary type
  inherits the shared universal set, the roster recap now reaches ALL typed
  projects at once. `computeEffectiveProgress` auto-satisfies it independently of
  the legacy `deriveStratum1StewardshipMap` bridge (confirmed in
  `effectiveProgress.ts` -- it iterates the resolved objectives' own checklist via
  `resolveAnswerSpec`), so the bridge is left untouched (no-deletion-in-revamps).
- `catalogues.test.ts`: new assertion that `s1-vision-steward` exists in the
  **regen+residential resolved set** (proving per-type reach, not just the raw
  universal array), is optional, and carries the steward answerSpec with
  `sourceField` `['team.primarySteward','team.coStewards']`.

## Verification

Shared typecheck clean; shared suite **897 green** (was 896 -- the new assertion),
incl. `expectFullPartition` and all per-type resolution counts (unchanged); web
typecheck clean.

**Live UI screenshot was BLOCKED** -- the dev bundle would not render (blank across
all routes) because a foreign out-of-band deletion
(`apps/web/src/v3/act/field-action/proof/ProofSyncIndicator.tsx`, shown ` D` in git
status) left a dangling import that breaks vite. Not my change; not touched per
stage-only-my-files + no-deletion rules. Per the no-claim-without-screenshot rule I
do not assert the live render; the `AnswerRecap` steward renderer is unchanged from
the prior slice (already screenshotted on project "k"), and the core fix is proven
at the resolution layer by the green per-type-resolved test. Injected then reverted
a `team` fixture on "Baseline Test Homestead" while attempting live verification.

## Discipline

Staged only the 2 files by explicit path
([[feedback-commit-immediately-on-rebased-branches]]); never `git add -A` on the
foreign-WIP-heavy tree. CSRA untouched ([[fiqh-csra-erased-2026-05-04]]);
ASCII-only.

## Deferred (unchanged)

- `s1-stewardship-c2` answerSpec (role-filtered invites).
- Retiring the `deriveStratum1*Map` derivations.
