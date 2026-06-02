# 2026-06-01 -- Act answerSpec follow-up: stewardship + secondary-type recaps

**Branch:** `feat/atlas-permaculture` (rebased out-of-band) · **Commit:** `4acef400` (not pushed)
**Surfaces:** `packages/shared` (authoring) + `apps/web` (tests) · **Entity:** [[entities/act-tier-shell]]
**ADR context:** [[decisions/2026-06-01-atlas-act-answerspec-typed-recap]] (the parent feature, `c640acbb`)

## Objective

Extend the shipped answerSpec read-only recap (commit `c640acbb` / Slice 5) from
the three `s1-vision-c1/c2/c3` items to the two remaining operator-requested
source-backed answer kinds: **stewardship** and **project type**. Pure authoring
+ test slice -- the resolver, label registry, `AnswerRecap` renderer, schema
enums, option-set registry, and progress union were all already in place and
already support the `steward` + `multi_select` fieldTypes and the
`projectSecondaryType` option set.

## Scope decisions (AskUserQuestion, narrowing)

1. **Stewardship = c1 only.** Author the `steward` answerSpec on
   `s1-stewardship-c1` only; skip `c2` (role-filtered, keep its legacy
   derivation). Accept that the recap benefits legacy/untyped projects only.
2. **Project-type = add a new secondary-type item.** The primary type is already
   `s1-vision-c1`; author a NEW `s1-vision-c4` over
   `projectTypeRecord.secondaryTypeIds`.

## Changes (4 files, +66/-7)

### `packages/shared/src/constants/plan/stratumObjectives.ts`
Added to `s1-stewardship-c1` ("List primary steward and any co-stewards."):
```ts
answerSpec: {
  fieldType: 'steward',
  sourceField: ['team.primarySteward', 'team.coStewards'],
  editRoute: { kind: 'wizard-step', step: 'team' },
}
```
The resolver's `steward` branch reads each path with OR semantics
(`isAnswered: out.length > 0`): `team.primarySteward` (single object -> one
`Name <email>` line), `team.coStewards` (array -> one line each). `c2` left
untouched on its legacy `deriveStratum1StewardshipMap` derivation.

### `packages/shared/src/constants/plan/catalogues/universal.ts`
Two edits:
- New optional item before `s1-vision-labour`:
  ```ts
  { ...ckA('s1-vision-c4', 'Confirm any secondary land uses layered onto this project', {
      fieldType: 'multi_select',
      optionSetId: 'projectSecondaryType',
      sourceField: 'projectTypeRecord.secondaryTypeIds',
      editRoute: { kind: 'plan-type' },
    }), optional: true }
  ```
- Added `'s1-vision-c4'` to the `s1-vision-dg1` "Purpose & intent" decision group
  itemIds (between c1 and c2).

### `apps/web/src/v3/strata/__tests__/resolveAnswerSpec.test.ts`
Rewrote the steward test from a fabricated `team.members` shape (which never
existed in `ProjectMetadata`) to the real `primarySteward` + `coStewards` shape;
added an unanswered case. 9 tests total.

### `packages/shared/src/constants/plan/__tests__/catalogues.test.ts`
Added an assertion that `s1-vision-c4` exists, is optional, and carries the
`projectSecondaryType` / `secondaryTypeIds` answerSpec.

## Key discovery: resolution path

`apps/web/src/v3/plan/strata/useProjectObjectives.ts` `resolveFromInputs` is a
3-level ladder: (1) `metadata.projectTypeRecord` -> `resolveProjectObjectives`;
(2) bare `projectType` naming a valid PRIMARY type -> per-type; (3) otherwise the
static `PLAN_STRATUM_OBJECTIVES` skeleton. The s1-stewardship objective exists
ONLY in level 3, so the steward recap reaches **only projects with no
projectTypeRecord AND a null/invalid `projectType`** (e.g. test projects "k",
"G", "dd", "gg"; the "Phase 4 Smoke"/"MTC"-style untyped-but-`projectType`-set
projects resolve to a per-type/universal set that omits stewardship). This is the
operator-accepted limited reach.

## The decision-group partition catch

s1-vision is a partitioned objective (dg1 + dg2); `expectFullPartition` in
`catalogues.test.ts` requires every checklist item to appear in EXACTLY ONE
decision group. Adding `s1-vision-c4` to the checklist alone would have broken the
invariant. Fixed proactively by adding it to dg1 before running tests -- suite
stayed green on the first run.

## Verification

- `pnpm --filter @ogden/shared test`: **896 green** (54 files).
- `pnpm --filter @ogden/web test ...`: `resolveAnswerSpec` (9) +
  `computeEffectiveProgress` (5) green. Other web failures (planConflict,
  compassGating, actWorkItemModule, etc.) are a PRE-EXISTING, unrelated
  Act-module-taxonomy refactor already in the working tree -- none touch my files.
- Typecheck: shared + web clean for the touched files (confirmed in prior pass).
- **Live (screenshots):**
  - c4: "Baseline Test Homestead" (regen_farm + secondaryTypeIds `['residential']`)
    -> S1 / "A clear vision..." objective -> Objective tab shows the c1
    "Regenerative Farm" chip AND the new c4 "Confirm any secondary land uses
    layered onto this project" -> green "Residential / Live-In" chip, both
    auto-satisfied.
  - steward: injected a `team.primarySteward`/`coStewards` fixture into the
    static-skeleton project "k" (`635cfdd9...`) localStorage; S1 / "Identify key
    decision-makers and stewards" -> "List primary steward and any co-stewards."
    -> `Aisha Rahman <aisha@ogden.ag>` / `Bilal Haddad <bilal@ogden.ag>` /
    `Omar Said` (name-only handled), c2 a plain checkbox. Fixture reverted after.

## Process notes

- Staged only the 4 files by explicit path (`git add -- <paths>`); NEVER
  `git add -A` -- the working tree carries dozens of unrelated foreign-WIP files.
  Committed with `git commit -F` (here-strings break `-m`) + the
  `Co-Authored-By: Claude Opus 4.8` trailer.
- Branch fetched + divergence-checked before commit (ahead, no behind).
- Preserved both `deriveStratum1*Map` derivations (no-deletion-in-revamps).

## Deferred (out of scope)

- `s1-stewardship-c2` answerSpec -- role-filtered invites
  (contractor/landowner/reviewer); the declarative `steward` field can't express
  the filter and invites carry no `name`.
- Retiring the two `deriveStratum1*Map` derivations -- keep until all their items
  carry answerSpec.
