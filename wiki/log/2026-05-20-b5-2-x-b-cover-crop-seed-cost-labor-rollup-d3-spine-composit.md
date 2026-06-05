# 2026-05-20 — B5.2.x.b: Cover-crop seed-cost / labor rollup + D3 spine composition


**Branch.** `feat/atlas-permaculture`. Seven commits closing the
remaining B5.2.x candidate: quantify what cover-crop windows cost in
seed + seeding labor, surface a per-phase rollup under
`phasing-budgeting`, and seed `source:'cover-crop'` `WorkItem`s onto
the D3 spine so `BudgetCard` + `ResourcingCard` pick them up via the
existing composition. Forks ratified up-front (cost data = catalog
defaults + per-window override, effective = override ?? catalog;
rollup = seed into D3 *and* dedicated card; phase grouping = joined
against declared `BuildPhase[]` by id then case-insensitive name,
else `(Unphased)` bucket sorted last).

**Schema (one deliberate scoped exception, parallel to B5.1).**
`CoverCropEntry` gains three optional cited fields
(`seedCostUSDPerAcre?/seedingLaborHrsPerAcre?/seedRateLbPerAcre?`;
9 of 14 entries populated, 5 perennials/herbaceous-understory left
without data per omitted-not-stubbed). `CropCoverWindow` gains two
optional override fields (`.optional()`, no migration).
`WorkItem.source` enum gains `'cover-crop'` + `WorkItem.generated
FromCoverCropWindow?: string`; persist version unchanged (additive
enum) but `syncManifest['ogden-work-items'].schemaVersion` 1→2
records the mutation. Three new `workItemStore.replaceCoverCrop{Rows,
Costs,Resources}` actions mirror the `replaceGoalCompass*` family 1:1
with the source filter swapped.

**Engines + card.** New `coverCropEconomicsMath.ts`
(`effectiveSeedCostPerAcre/effectiveLaborHrsPerAcre/windowEconomics/
computeCoverCropEconomics`) — pure. New `coverCropSpineSync.ts`
(`seedCoverCropWorkItems/seedCoverCropCosts/seedCoverCropResources/
pushCoverCropPlanToSpine`) — orchestrator mirrors
`pushGoalCompassToSpine` 1:1 (replace rows → seed costs → seed
resources). New `CoverCropEconomicsCard` mounted under
`phasing-budgeting` (sectionId `plan-cover-crop-economics`, above
`plan-labor-budget`) showing project totals + per-phase rows
(cropAreaCount + speciesCount meta) + unphased bucket + SARE/NRCS
citation footer. `CoverCropPlannerCard.AddWindowForm` gains a
collapsible "+ Advanced (site-specific cost overrides)" disclosure
exposing the two numeric overrides; on Save the editor calls
`pushCoverCropPlanToSpine(projectId)` immediately after
`updateCropArea`.

**Covenant + posture.** Preservation gate hard-locked — cross-source
verified: goal-compass overridden + cover-crop overridden rows both
survive bitwise across either family's `replace*` call.
Single-writer preserved; no in-place mutation; no parallel store.
Zero-prereq seeding (cover-crop WorkItems have empty `dependsOnAuto`
— terminate-before-cash-crop is a future slice); no scheduled dates
(month-only window bounds lack a year reference). Covenant clean
(`/\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b/i`
— only docstring negative declarations + the pre-existing
`livingRootsMath` regex literal match); copy strictly project-cost,
no yield-as-return / payback / ROI / investment framing.

**Gate.** Targeted vitest **120/120** (coverCropEconomicsMath 23 +
coverCropSpineSync 13 + CoverCropEconomicsCard RTL 2 +
CoverCropPlannerCard 5 + coverCropPlannerMath 18 + workItemStore
family 13 across migration/costs/resources/dependencies/fulfil +
livingRootsMath 12 + coverCropCatalog 14 + plantCatalog 10), full
web vitest **1485/1485** (142 files), shared vitest **266/266** (19
files), `tsc --noEmit` on `apps/web` + `packages/shared` both exit
0, `vite build` exit 0 (`--max-old-space-size=8192`). Per-task
explicit-path commits on `feat/atlas-permaculture` (no `-A`/`.`):
`9e4da381` schema → `c86a0cb6` math → `cfa2a31c` spine-sync →
`673d40f5` card → `d6308aac` editor + spine push → `e014ab3e`
mount → this wiki commit. **Not pushed** (branch rebased
out-of-band; no `git fetch` performed per standing rule).
Live-preview screenshot disclosed-blocked by the known MapLibre/WebGL
hang behind the `phasing-budgeting` slide-up — targeted vitest +
RTL happy-path + cross-source preservation test are the
authoritative proof (B-series precedent).

**ADR.** [2026-05-20 atlas-b5-2-x-b-cover-crop-seed-cost-labor-rollup](decisions/2026-05-20-atlas-b5-2-x-b-cover-crop-seed-cost-labor-rollup.md).
