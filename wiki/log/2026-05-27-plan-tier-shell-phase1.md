# 2026-05-27 — Plan Tier Shell Phase 1 (12 slices)

Shipped the full 12-slice Phase 1 of the OLOS Plan Tier Shell on
`feat/atlas-permaculture` ([[decisions/2026-05-27-atlas-plan-tier-shell-phase1]]):
the 7-tier vertical spine, ObjectiveColumn, 4-section
ObjectiveDetailPanel (OBJECTIVE / MAP ACTIVATION / YOUR DECISIONS /
REFERENCE), LaunchAct button, TierUnlockCelebration, cyclical-review
banner + modal, and a derive-only Stage Zero Vision Builder bridge. New
spine coexists with the legacy module shell behind a per-project
`planShellMode` header toggle ([[feedback-no-deletion]]).

## Commits

- **1.1 `94225cb6`** — `packages/shared/src/constants/plan/tierObjectives.ts`
  seed (7 tiers, ~16 objectives); status engine
  `tierObjectiveStatus.ts` + `tierState.ts`;
  `cyclicalReviewTrigger.ts` predicate (Phase 4 plumbed via optional
  `observeRevisionFlag` fn).
- **1.2 `cbc70c5c`** — `PlanNavToggle` in header host; per-project
  `planShellMode: 'tier-spine' | 'module-bar'` on `useProjectStore`;
  new projects default to `tier-spine`, MTC_SEED keeps `module-bar`.
- **1.3 `144284a3`** — `/plan/tier/$tierId` +
  `/plan/tier/$tierId/objective/$objectiveId` routes;
  `/plan/module/$module` legacy route untouched.
- **1.4 `7ce755f9`** — `TierSpine` + `TierRow` + `TierLockedPopover`
  with computed state pills; locked-tier acknowledge CTA opens the
  blocking objective.
- **1.5 `4852887a`** — `ObjectiveColumn` (NextUpCard + ParallelCallout
  + ObjectiveCard rows).
- **1.6 `5caec8e4`** — `ObjectiveDetailPanel` with `ObjectiveHeader`
  + `MapActivationStrip` wrapping the existing OLOS
  `OverlayBundleStrip`; map state in lockstep via panel-owned
  `activeOverlayIds`, reset via React `key={objective.id}`.
- **1.7 `a05f47f1`** — `DecisionChecklist` + new `planTierStore`
  (Zustand+persist, key `ogden-plan-tier-progress`);
  checkbox toggles drive `objective.status` via the status engine.
- **1.8 `c3e546b9`** — `DetailsExpander` REFERENCE section, lazy
  embed of legacy module cards via `legacyCardSectionId` →
  `planSectionMap.ts` lookup; T0+T1 objectives seeded with real
  card mappings.
- **1.9 `fd0c8ecb`** — `LaunchActButton` bottom-anchored CTA, visible
  when `outputKind === 'plan-decision-record'` and status `active|
  complete`; routes to existing `ActCommandCentrePage` (Phase 3
  rewires).
- **1.10 `32cb3281`** — `TierUnlockCelebration` modal fires on
  `T_n locked → available` transitions; dedup via per-project
  `celebratedByProject` log persisted in `planTierStore` (version
  2 migrate).
- **1.11 `8497dc92`** — `cyclicalReviewStore` (key
  `ogden-cyclical-review`, version 1); `CyclicalReviewBanner` on
  ObjectiveDetailPanel mounts when `isCyclicalReviewDue` returns
  true; Confirm → `CyclicalReviewModal` "Decision confirmed";
  Revise → clears trigger silently. `window.cyclicalReviewStore`
  exposed in DEV for `forceTrigger` smoke-tests.
- **1.12 `4b8bdba0`** — `visionProfileToChecklist.ts` pure helper
  (`deriveTier0EvidenceMap` + `mergeDerivedIntoProgress`);
  `PlanTierShell` subscribes to `useProjectStore` for the
  `VisionProfile` and merges derived completions into the status
  engine without writing to `planTierStore`; `DecisionChecklist`
  renders derived items checked + disabled with "From Stage Zero
  Vision" badge + evidence text.

## Files of note

- New: `packages/shared/src/constants/plan/tierObjectives.ts`,
  `packages/shared/src/schemas/plan/planTierObjective.schema.ts`,
  `packages/shared/src/relationships/{tierObjectiveStatus,tierState,cyclicalReviewTrigger}.ts`,
  `apps/web/src/store/{planTierStore,cyclicalReviewStore}.ts`,
  `apps/web/src/v3/plan/tiers/*` (~15 files),
  `apps/web/src/v3/plan/tiers/visionProfileToChecklist.ts`,
  `apps/web/src/v3/plan/PlanNavToggle.tsx`.
- Modified: `apps/web/src/v3/plan/PlanLayout.tsx` (branch on
  `planShellMode`), `apps/web/src/store/projectStore.ts` (added
  `planShellMode`), routing under `apps/web/src/routes/index.tsx`,
  `apps/web/src/v3/plan/planSectionMap.ts` (extended for legacy
  embeds).

## Verification per slice

`cd apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc
--noEmit` exit 0 before every commit; `git diff --cached --name-only`
before every commit to catch foreign staged files
([[concepts/parallel-session-coordination]]). Foreign wiki files from
parallel sessions unstaged via `git reset HEAD` before the Slice 1.10
explicit-path stage. No `--force`, no `--no-verify`. Live preview
verification via `preview_eval` + `preview_screenshot` against the
five spec screenshots — all match (Screenshots 1, 2, 3, 4
reproducible in dev; Screenshot 5's "Observe-updated" banner is the
same `CyclicalReviewBanner` component, real trigger predicate wires
in Phase 4).

## Slice 1.12 gate evidence

mtc visionProfile was enriched to populate the five bridge fields:
`primaryOutcomes`, `landIdentity`, `systemsInScope`, `budgetRange`,
`timelineProgress`. All three t0-vision items rendered checked +
disabled with "From Stage Zero Vision" green badge and evidence
text:

- **c1**: "Primary outcomes: Food sovereignty, Soil health, Family
  livelihood. Land identity: Food forest, Family homestead"
- **c2**: "Systems in scope - Food: Orchards, Kitchen garden;
  Animals: Goats, Chickens; Water: Swales, Pond"
- **c3**: "Budget band: Modest. Timeline: Just starting. Constraints:
  Part time attention, Limited cash"

Meta showed `3 / 3 required`. `planTierStore.byProject.mtc['t0-vision']`
deleted from localStorage and reloaded — items remained checked +
disabled (derived=true), confirming the bridge alone drives pre-fill,
not stored progress. T0 spine row reaches COMPLETE without manual
toggling.

## Carry-over to Phase 2

- Wizard Step 2 output must satisfy the same `VisionProfile` contract
  the bridge consumes; Step 3 ("Team") will provide the
  t0-stewardship source the bridge currently leaves unset.
- Retire `StageZeroVisionPage` only after Phase 2 lands
  ([[decisions/2026-05-25-atlas-stage-zero-vision-builder]]).
- Boundary capture moves from Observe's `MapToolbar` into Wizard
  Step 1 (preserves `MapToolbar` itself per [[feedback-no-deletion]]).

## Branch state at session close

`feat/atlas-permaculture` local is 2 commits ahead of
`origin/feat/atlas-permaculture` at session start of the close
operation (Slices 1.11 + 1.12 unpushed). No upstream divergence;
push authorized by steward.
