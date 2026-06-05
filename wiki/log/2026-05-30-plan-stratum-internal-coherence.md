# 2026-05-30 -- Plan stratum internal-coherence pass: rename residual "tier" identifiers + discriminator migrate

Cosmetic-only follow-up to the same-day [[log/2026-05-30-plan-stratum-rename]]
(ADR [[decisions/2026-05-30-atlas-plan-stratum-rename]]). That session carried
"Tier 0-6 -> Stratum 1-7" through every user-facing surface and data-contract
value but **deliberately kept** the internal code identifiers -- filenames, React
component names, helper/route-const names, the persisted view-discriminator value
`'tier-spine'`, and CSS class names -- as opaque labels to bound the diff. The
Session Debrief recommended closing that residual; the steward approved this pass.
**No correctness change** except one steward-chosen sub-change: the discriminator
value rename `'tier-spine' -> 'stratum-spine'` with a `projectStore` persist
v6 -> v7 migrate (chosen via AskUserQuestion over keeping the value opaque).

## Scope (Plan-spine code tree only)

The Definition of Done was "no residual 'tier' identifier in the Plan-spine code
tree except the documented intentional residuals" -- where "Plan-spine code tree"
= the `strata/` directory, the store, the routes, `PlanLayout`/`PlanNavToggle`,
the 4 renamed shared files, and the discriminator. The Plan **stage module**
content (`cards/`, `layers/`, `draw/`, `data/`) has its own unrelated "tier"
concepts and was out of scope, as was the denylist.

## Slice A -- packages/shared (`0c514335`)

`git mv` four files + re-point the `src/index.ts` barrel: `tierObjectives.ts ->
stratumObjectives.ts`, `planTierObjective.schema.ts ->
planStratumObjective.schema.ts`, `relationships/tierState.ts -> stratumState.ts`,
`relationships/tierObjectiveStatus.ts -> stratumObjectiveStatus.ts`, plus
intra-file residual `Tier`/`tier` identifiers in those files and their `__tests__`
(`remap*` + historical comments excepted). `tsc --noEmit` clean in
`packages/shared` (web left RED, committed shared alone).

## Slices B-D -- apps/web (`d50b1f39`)

One commit (interdependent via tsc). **B** store/routes/manifest/discriminator:
`git mv store/planTierStore.ts -> planStratumStore.ts`
(`usePlanTierProgressStore -> usePlanStratumProgressStore`, `migratePlanTierProgress
-> migratePlanStratumProgress`; KEY `ogden-plan-tier-progress` + `toProgressMap`
kept), `lib/syncManifest.ts` import path+symbol (storeKey + `schemaVersion 3`
kept), `routes/index.tsx` route consts (`v3PlanTierRoute -> v3PlanStratumRoute`,
`v3PlanTierObjectiveRoute -> v3PlanStratumObjectiveRoute`), and the discriminator:
`PlanShellMode = 'stratum-spine' | 'module-bar'`, `getPlanShellMode` default ->
`'stratum-spine'`, persist `version: 6 -> 7` + a `version < 7` migrate branch
rewriting only `'tier-spine' -> 'stratum-spine'`. **C** directory `git mv
v3/plan/tiers/ -> v3/plan/strata/` + 5 component renames (`PlanTierShell ->
PlanStratumShell`, `TierRow -> StratumRow`, `TierSpine -> StratumSpine`,
`TierUnlockCelebration -> StratumUnlockCelebration`, `TierLockedPopover ->
StratumLockedPopover`) + their `.module.css` siblings + keyframes
(`tier-row-highlight-pulse`, `tierUnlockFade`/`tierUnlockRise` -> stratum-prefixed)
+ co-located `.tierTitle`-style classes; `T0_TIER_ID -> S1_STRATUM_ID`;
`deriveTier0EvidenceMap`/`deriveTier0StewardshipMap -> deriveStratum1*`. **D**
compiler-guided consumer cascade (`PlanLayout`, `PlanNavToggle`,
`WizardCompletionScreen`, home `StageStatusRow`/`useProjectUrgency`, act
`ViewAObjectiveExecution`/`ActFieldActionLayout`, `cyclicalReviewStore`,
`projectWizardStore`, intra-`strata/` `ObjectiveDetailPanel`/`ObjectiveHeader`/
`useProjectObjectives`). Gate: `apps/web` `tsc --noEmit` (8GB heap) EXIT 0.

## Slice E -- tests (`569bd890`)

`git mv store/__tests__/planTierStore.migrate.test.ts ->
planStratumStore.migrate.test.ts` (imports + symbol refs updated) + **new**
`store/__tests__/projectStore.migrate.test.ts` exercising the live persist option
(`useProjectStore.persist.getOptions().migrate`): a v6 blob with projects on
`'tier-spine'` / `'module-bar'` / unset, asserting `'tier-spine' ->
'stratum-spine'`, others verbatim, `version` 7, projects-order + `activeProjectId`
preserved, idempotent on v7, and projectless-state tolerant.

## Slice cleanup (`5bba6993`)

One stale doc-comment in `ActFieldActionLayout.tsx` ("Mirrors PlanTierShell's
role") corrected to "Mirrors PlanStratumShell's role".

## Key finding -- manifest schemaVersion is independent of persist version

The `planShellMode` rename rides over sync inside each project object (the
`ogden-projects` descriptor syncs the `whole` persisted state), but the
`ogden-projects` manifest `schemaVersion` was **deliberately NOT bumped** (stays
4). `schemaVersion` is independent of the persist `version`: it is the
wire-vocabulary marker compared against incoming server blobs (a newer-than-mine
blob is skipped whole), and the `syncManifest.test.ts` skew guard only asserts each
descriptor carries a numeric `schemaVersion` -- it does **not** require equality
(live proof: `ogden-projects` persist **7** / manifest **4**, green). Bumping it
would make old clients skip the entire projects blob over one cosmetic field;
instead an unmatched `planShellMode` degrades gracefully to module-bar rendering
and the persist `migrate()` normalizes the local value. **This corrects the prior
ADR/log claim that "the skew guard requires they match"** -- reconciled in the ADR
Addendum this session.

## Verification

- **Typecheck:** `packages/shared` `tsc --noEmit` exit 0 (Slice A); `apps/web`
  `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` EXIT 0 (after Slice D).
- **Vitest (scoped):** renamed `planStratumStore.migrate` round-trip (incl. a full
  `persist.rehydrate` v2-blob round-trip proving saved progress survives) + new
  `projectStore.migrate` v6 -> v7 + `useProjectUrgency` + `PerProjectHomePage`
  rename-touched suites green (34 passed, exit 0). The full `apps/web`
  together-run is known to hang on a foreign timer suite -- per-file isolation is
  authoritative.
- **Preview regression (screenshot captured):** seeded a non-builtin project on the
  live dev origin (the spine only renders for non-builtin projects;
  `getPlanShellMode` returns `'module-bar'` for `isBuiltin`, and MTC_SEED is
  builtin), opened Plan, and the spine still renders **S1 .. S7** with a "Plan
  stratum spine" heading -- internal rename only, UI byte-identical to before.
- **Discriminator migrate smoke (live browser):** seeded `ogden-projects` with a v6
  blob whose active project carried `planShellMode: 'tier-spine'`, reloaded; the
  store rehydrated at persist version 7 with `planShellMode: 'stratum-spine'` and
  Plan opened in the spine view -- proving the v7 migrate fired (had it not, the
  stale `'tier-spine'` would fail PlanLayout's `=== 'stratum-spine'` check and
  module-bar would render instead).
- **Denylist + coherence grep:** pipeline (`Tier1LayerType`, "Tier-1/Tier-3"),
  subscription ("Stewarding-tier"), showcase (`'dreaming'|'transitioning'|
  'stewarding'`), and Act `tier-prototype` all intact; the `strata/` dir + 4
  renamed shared files carry only the documented intentional residuals.

## Documented intentional residuals (kept "tier" by design)

Persist KEY strings (`ogden-plan-tier-progress` etc. -- renaming orphans saved
data); `remapTierId`/`remapId`/`remapRef` + `remapSlug.ts` (they map *from* the
old tier vocabulary); manifest `schemaVersion`/`storeKey` strings; `toProgressMap`.

## Branch state

`feat/atlas-permaculture` (rebased out-of-band [[project-branch-rebase]]). Four
explicit-path commits `0c514335` -> `d50b1f39` -> `569bd890` -> `5bba6993` (foreign
`a5cfcc6f` "Wellness catalogue" wiki commit landed between A and B-D mid-session
and incidentally carried the `planStratumStore.ts` rename's git-mv -- benign); this
wiki reconciliation (ADR Addendum + this entry + the `log.md` pointer) lands as a
fifth commit. **Not pushed** -- push only after the steward says go, with a `git
fetch origin` + divergence check first
([[feedback-commit-immediately-on-rebased-branches]]). The 17-file foreign
parallel-session dirty set left untouched per [[feedback-no-deletion]]; `git add`
by explicit path only. CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]);
ASCII-only copy.
