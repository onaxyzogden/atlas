# ADR — Atlas B5.2.x.b: cover-crop seed-cost / labor rollup into phasing-budgeting (+ D3 spine composition)

**Date:** 2026-05-20
**Branch:** `feat/atlas-permaculture`
**Sub-project:** B5.2.x.b (closes the remaining B5.2.x candidate
left open by the B5.2.x planner-editor slice — cover-crop windows
now write to the spine and roll up per phase)
**Status:** Accepted — shipped in commits `9e4da381`, `c86a0cb6`,
`cfa2a31c`, `673d40f5`, `d6308aac`, `e014ab3e`
**Related:** [[2026-05-20-atlas-b5-2-x-cover-crop-planner-editor]],
[[2026-05-19-atlas-b5-1-cover-crop-living-roots]],
[[2026-05-19-atlas-b5-2-plant-catalog-cover-crop-backfill]]

---

## Context

B5.2.x shipped the planner editor — `CropArea.coverCropPlan` is now
populated by a real UI. But nothing quantified what those cover-crop
windows cost in seed or seeding labor, or how that cost landed per
project phase. `LaborBudgetSummaryCard` rolled up infrastructure
labor; `BudgetCard` (D3) rolled up goal-compass-generated WorkItem
cost; neither saw cover-crop seed expense or seeding labor.

B5.2.x.b closes that gap two ways:

1. **Read-only rollup card** under `phasing-budgeting` shows per-
   phase cover-crop seed-cost + seeding-labor totals, joined to the
   project's declared phases.
2. **Spine composition** — each `CropCoverWindow` seeds a
   `source: 'cover-crop'` `WorkItem` carrying `costRangeAuto` and
   `materialsAuto` (seed BOM) with `generatedFromCoverCropWindow`
   composite provenance. `BudgetCard` + `ResourcingCard` pick the
   new rows up via the existing `analyzeBudget` / `analyzeResourcing`
   composition with zero further wiring.

## Decision — Approach B (seed into D3 + dedicated rollup card)

**Forks ratified up-front** (via AskUserQuestion):

- **Cost data source:** **Both** — catalog defaults (cited per
  species) + per-window steward override. Effective = override ??
  catalog. Missing data → silently excluded (B4/B5 omitted-not-
  stubbed precedent).
- **Rollup posture:** **Seed into D3** —
  `pushCoverCropPlanToSpine(projectId)` mirrors
  `pushGoalCompassToSpine` 1:1 (replace rows → seed costs → seed
  resources). The dedicated card reads
  `computeCoverCropEconomics(cropAreas, declaredPhases)` directly,
  not the spine — avoids a circular read; the card is the per-
  phase breakout, the spine seeding makes the cover-crop cost
  participate in `BudgetCard`'s project total.
- **Phase grouping:** **Joined** — `CropArea.phase` (free-text)
  resolved against `phaseStore.phases[]` by exact `id` match,
  then case-insensitive `name` match; otherwise an `(Unphased)`
  bucket.

### Schema changes (load-bearing)

Five small additive changes — one **deliberate scoped exception**
to the strictly-additive posture (the `WorkItem.source` enum bump
+ `syncManifest` schemaVersion bump), pre-ratified by the user
knowing the lift, parallel to B5.1's:

1. `CoverCropEntry` gains `seedCostUSDPerAcre?`,
   `seedingLaborHrsPerAcre?`, `seedRateLbPerAcre?` (all optional;
   cited per species from SARE 3rd ed. + USDA-NRCS Plant Materials
   tech notes). 9 of 14 entries populated; 5 perennial
   mulches/herbaceous understory left without data
   (omitted-not-stubbed).
2. `CropCoverWindow` gains `seedCostUSDPerAcreOverride?` +
   `seedingLaborHrsPerAcreOverride?` (`.optional()`, no migration).
3. `WorkItem.source` enum gains the literal `'cover-crop'` — the
   one schema bump. No persist version bump (enum is additive;
   existing rows still validate) but
   `syncManifest['ogden-work-items'].schemaVersion` bumps 1 → 2 to
   record the mutation.
4. `WorkItem.generatedFromCoverCropWindow?: string` — new
   provenance field, composite id `${cropAreaId}__${windowIndex}`,
   mirrors `generatedFromPlantingCalendar`.
5. Three new `workItemStore` actions —
   `replaceCoverCropRows / *Costs / *Resources` — mirror the
   `replaceGoalCompass*` family 1:1 with the source-filter swapped
   `'goal-compass'` → `'cover-crop'`.

### Pure modules (new)

- `coverCropEconomicsMath.ts`:
  - `effectiveSeedCostPerAcre(window, entry)` /
    `effectiveLaborHrsPerAcre(window, entry)` — override wins;
    undefined if neither.
  - `windowEconomics({window, areaM2, catalog})` — per-window USD +
    hours totals.
  - `computeCoverCropEconomics({projectId, cropAreas,
    declaredPhases, catalog})` — full report with per-phase rows
    + project totals + unphased bucket sorted last.
- `coverCropSpineSync.ts`:
  - `seedCoverCropWorkItems({projectId, cropAreas,
    declaredPhases, catalog, now})` — pure builder; one WorkItem
    per window with id `cc__${provenance}`.
  - `seedCoverCropCosts({items, cropAreas, catalog})` →
    `Map<string, CostRange>` with degenerate band
    (low=mid=high=perAcre×acres) since national-average data is a
    single point.
  - `seedCoverCropResources({items, cropAreas, catalog})` →
    `Map<string, {equipment, materials}>` with one
    `{label: '${species} seed', unit: 'lb',
    quantityPerAcre: seedRateLbPerAcre}` BOM line.
  - `pushCoverCropPlanToSpine(projectId)` — orchestrator; reads
    `cropStore` + `phaseStore`, calls the three `workItemStore`
    `replace*` actions in sequence.

### Card surfaces

- **New card:** `CoverCropEconomicsCard` under
  `phasing-budgeting` MODULE_CARDS, sectionId
  `plan-cover-crop-economics`, placed immediately above
  `plan-labor-budget`. Read-only — hero, project totals (USD +
  hours), per-phase rows (cropAreaCount + speciesCount meta),
  unphased bucket sorted last, citation footer (SARE 3rd ed +
  USDA-NRCS).
- **Editor extension:** `CoverCropPlannerCard.AddWindowForm` gains
  a collapsible "+ Advanced (site-specific cost overrides)"
  disclosure exposing two numeric inputs ("Override seed cost
  (USD/acre)", "Override seeding labor (hrs/acre)"). On Save, the
  editor calls `pushCoverCropPlanToSpine(projectId)` after
  `updateCropArea`.

## Posture & covenant

- **Not strictly-additive** — the enum bump + syncManifest version
  bump cross the additive line. Pre-ratified user choice.
- **Single-writer preserved.** Cover-crop spine writes flow through
  the new `replaceCoverCropRows / *Costs / *Resources` actions;
  the editor's draft array is component state. No in-place
  mutation, no parallel store.
- **Preservation gate hard-locked.** Tests deep-freeze input and
  assert `(it.projectId !== projectId || it.source !== 'cover-crop'
  || it.overridden)` rows are bitwise identical post-replace.
  Cross-source gate verified: goal-compass rows untouched by
  cover-crop replace; cover-crop rows untouched by goal-compass
  replace.
- **No `WorkItem.status` mutation.** D1 single-writer discipline
  carried forward.
- **Zero-prereq seeding.** Cover-crop WorkItems get empty
  `dependsOnAuto` — terminate-before-cash-crop ordering is a
  future slice. No scheduled dates either; month-only
  `startMonth/endMonth` lack a year reference.
- **Covenant lock** (`/\b(riba|gharar|csra|salam|investor|
  financing|cost-of-capital)\b/i`) holds. Copy is project-cost
  only — "Seed cost", "Seeding labor hours per acre", "Cover-crop
  seed expense". No "yield" / "return" / "investment" / "payback"
  / "ROI" framing. Grep over all new + edited files finds only
  docstring negative declarations.

## Scope decisions (explicit non-goals)

- **No prerequisite seeding.** Future slice.
- **No scheduled-date seeding.** Stewards can schedule manually
  (sets `overridden: true`).
- **No `LaborBudgetSummaryCard` integration.** Independent data
  path (PhaseTask); the new card is its sibling, not a replacement.
- **No `BudgetCard` redesign.** It picks up cover-crop rows
  automatically through `analyzeBudget`.
- **No site-specific catalog calibration.** Per-window override is
  the calibration knob.

## Files

**New (5):**
- [apps/web/src/features/coverCrops/coverCropEconomicsMath.ts](apps/web/src/features/coverCrops/coverCropEconomicsMath.ts)
- [apps/web/src/features/coverCrops/coverCropSpineSync.ts](apps/web/src/features/coverCrops/coverCropSpineSync.ts)
- [apps/web/src/features/coverCrops/CoverCropEconomicsCard.tsx](apps/web/src/features/coverCrops/CoverCropEconomicsCard.tsx)
- [apps/web/src/features/coverCrops/__tests__/coverCropEconomicsMath.test.ts](apps/web/src/features/coverCrops/__tests__/coverCropEconomicsMath.test.ts) — 23 cases
- [apps/web/src/features/coverCrops/__tests__/coverCropSpineSync.test.ts](apps/web/src/features/coverCrops/__tests__/coverCropSpineSync.test.ts) — 13 cases incl. cross-source preservation
- [apps/web/src/features/coverCrops/__tests__/CoverCropEconomicsCard.test.tsx](apps/web/src/features/coverCrops/__tests__/CoverCropEconomicsCard.test.tsx) — 2 RTL cases

**Edited (7):**
- [packages/shared/src/schemas/workItem.schema.ts](packages/shared/src/schemas/workItem.schema.ts)
  — `'cover-crop'` enum literal + `generatedFromCoverCropWindow?`
- [apps/web/src/store/cropStore.ts](apps/web/src/store/cropStore.ts)
  — 2 optional override fields on `CropCoverWindow`
- [apps/web/src/features/coverCrops/coverCropCatalog.ts](apps/web/src/features/coverCrops/coverCropCatalog.ts)
  — 3 optional cited fields on `CoverCropEntry` + populated 9 of 14
- [apps/web/src/store/workItemStore.ts](apps/web/src/store/workItemStore.ts)
  — 3 new `replaceCoverCrop*` actions mirroring goal-compass family
- [apps/web/src/lib/syncManifest.ts](apps/web/src/lib/syncManifest.ts)
  — `ogden-work-items` schemaVersion 1 → 2
- [apps/web/src/features/coverCrops/CoverCropPlannerCard.tsx](apps/web/src/features/coverCrops/CoverCropPlannerCard.tsx)
  — Advanced disclosure with override inputs + spine push on Save
- [apps/web/src/features/coverCrops/__tests__/CoverCropPlannerCard.test.tsx](apps/web/src/features/coverCrops/__tests__/CoverCropPlannerCard.test.tsx)
  — new spine-push RTL case (5/5 green)
- [apps/web/src/v3/plan/types.ts](apps/web/src/v3/plan/types.ts) +
  [apps/web/src/v3/plan/PlanModuleSlideUp.tsx](apps/web/src/v3/plan/PlanModuleSlideUp.tsx)
  — sectionId entry + lazy import + switch arm

## Verification

- **Targeted vitest** (`coverCropEconomicsMath` 23,
  `coverCropSpineSync` 13, `CoverCropEconomicsCard` 2,
  `CoverCropPlannerCard` 5, `coverCropPlannerMath` 18,
  `workItemStore` family 13 across migration/costs/resources/
  dependencies/fulfil, `livingRootsMath` 12, `coverCropCatalog`
  14, `plantCatalog` 10) — **120/120 green**.
- **Shared vitest:** 266/266 green.
- **Typecheck:** `tsc --noEmit` on `apps/web` + `packages/shared`
  both exit 0.
- **Vite build:** clean.
- **Covenant grep** over all new + edited files: only docstring
  negative declarations + a `livingRootsMath.test.ts` regex
  literal already-asserted. PASS.
- **Cross-source preservation:** verified by the spine-sync test
  — goal-compass overridden + cover-crop overridden rows both
  survive bitwise across either `replace*` call.
- **Per-commit isolation:** seven explicit-path commits land on
  `feat/atlas-permaculture` (`9e4da381` schema → `c86a0cb6` math
  → `cfa2a31c` spine-sync → `673d40f5` card → `d6308aac` editor +
  spine push → `e014ab3e` mount → this wiki commit). Each touches
  only the files documented in its commit message. No `git add
  -A` / `.` used.
- **Branch divergence:** no `git fetch` performed in this session
  (sandbox); no push attempted per standing rule that
  `feat/atlas-permaculture` is rebased out-of-band.
- **Live preview:** card sits behind the `phasing-budgeting`
  Plan slide-up; the known MapLibre/WebGL hang may recur. Per the
  screenshot-honesty rule, no live screenshot claimed. Targeted
  vitest + tsc + RTL happy-path are the authoritative proof
  (B-series precedent).

## Consequences

- **B5.1 + B5.2 + B5.2.x + B5.2.x.b is now end-to-end.** A
  steward draws a `CropArea`, opens `plant-systems` → "Cover-crop
  planner", picks `winter_rye`, optionally sets a site-specific
  $80/acre override, hits Save → the spine receives a
  `source:'cover-crop'` `WorkItem` carrying degenerate cost band +
  seed BOM. `BudgetCard` (Act side) sees a new cover-crop line in
  the project total. `CoverCropEconomicsCard` (Plan side, under
  `phasing-budgeting`) shows the per-phase rollup with override-
  wins-over-catalog totals.
- **Forward queue narrows.** Map-drawn editor, multi-area bulk
  apply, terminate-before-cash-crop prerequisite seeding, and
  scheduled-date seeding all remain on the "if real usage asks
  for it" backlog.
- **Scoped-exception precedent reaffirmed.** B5.1 was the first
  "schema move with user pre-ratification"; B5.2.x.b is the
  second (smaller — additive enum literal + provenance field,
  not a persist migration). The strictly-additive-no-schema-bump
  default still holds for everything in between.
- **D3 composition is no longer goal-compass-only.** `analyzeBudget`
  + `analyzeResourcing` now compose two `source:` streams
  (`'goal-compass'` + `'cover-crop'`); the preservation gate
  semantics are identical for each. Future B-series slices that
  want to seed the spine inherit the same template.
