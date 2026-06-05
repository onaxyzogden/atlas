# 2026-04-29 — Drawing-tool popup fixes (stocking units, computed water, market-garden bundles)


### Done

User flagged three concerns with OLOS map drawing-tool popups; all three resolved in commit `8977b5d` and verified live in preview.

**1. Paddock popup — stocking units per species**
- Added `StockingUnit = 'head' | 'hives' | 'birds'` and `stockingUnit` field to `LivestockSpeciesInfo` in [`apps/web/src/features/livestock/speciesData.ts`](../apps/web/src/features/livestock/speciesData.ts). Cattle/sheep/goats/pigs/horses/rabbits → `head`; poultry/ducks_geese → `birds`; bees → `hives`.
- Retuned rabbits `typicalStocking` 50 → 25/ha (pastured-rabbit norm).
- Both popup render sites ([`PaddockListFloating.tsx:225`](../apps/web/src/features/livestock/PaddockListFloating.tsx), [`LivestockPanel.tsx:271`](../apps/web/src/features/livestock/LivestockPanel.tsx)) now interpolate `info.stockingUnit` instead of hard-coded "head".

**2. Orchard water demand — computed gallons/yr**
- New shared module [`packages/shared/src/demand/cropDemand.ts`](../packages/shared/src/demand/cropDemand.ts) exposes per-area-type × class table (orchard medium=110, market_garden medium=200, etc.) plus optional PET climate multiplier. Re-exported through web wrapper [`apps/web/src/features/crops/waterDemand.ts`](../apps/web/src/features/crops/waterDemand.ts).
- [`CropPanel.tsx`](../apps/web/src/features/crops/CropPanel.tsx) replaces the hard-coded `'medium'` string with computed `~{gal}/yr (~{liters}/yr)`, reactive on `pendingArea` + species-derived demand class. Persists `waterGalYr` onto `CropArea`.
- Verified: 1 ha orchard, medium class → 1.10M gal/yr. Ties out with PlantingToolDashboard rollup.

**3. Market garden — bundle picker + relabel**
- New [`apps/web/src/features/crops/marketGardenBundles.ts`](../apps/web/src/features/crops/marketGardenBundles.ts) defines six bundles (mixed, salad_mix, brassica, roots, solanum, legume) with `spacingM`, `bedWidthM`, `pathWidthM`, `waterDemand`, `rotationFamily`. Helper `computeMarketGardenGeometry()` returns plant + bed counts using bed/path geometry (assumes 30 m bed length).
- `CropPanel.tsx` swaps the orchard spacing slider for a bundle dropdown when `selectedType === 'market_garden'`. `SPACING_NOUN` map relabels "trees" → context-appropriate noun (`trees` / `seedlings` / `plants`) for non-orchard types.
- [`CompanionRotationPlannerCard.tsx`](../apps/web/src/features/crops/CompanionRotationPlannerCard.tsx) prefers `bundle.rotationFamily` over species-text inference when bundle is set.
- `cropStore.ts` gained optional `waterGalYr?: number` and `marketGardenBundle?: string` fields.
- Verified: salad_mix on 1 ha → ~625k plants / 277 beds; brassica on 0.1 ha → ~3,086 plants / 27 beds.

### Verified

- Live preview eval confirmed: bees=4 hives, rabbits=25 head, poultry=birds, orchard 1 ha medium=1.10M gal/yr, market-garden bundle math.
- Typecheck: my touched files clean. (49 pre-existing `src/v3/...` errors unchanged — DiagnoseMap, FiltersBar, SpotlightPulse, rails, Sparkline, exportDiagnoseBrief.test — separate cleanup task.)
- Preview screenshot tool repeatedly timed out on the MapLibre WebGL canvas (30s timeout); verified through `preview_eval` module loads instead per project CLAUDE.md guidance on transparent reporting.

### Files

- `apps/web/src/features/livestock/speciesData.ts`
- `apps/web/src/features/livestock/PaddockListFloating.tsx`
- `apps/web/src/features/livestock/LivestockPanel.tsx`
- `apps/web/src/features/crops/CropPanel.tsx`
- `apps/web/src/features/crops/marketGardenBundles.ts` (new)
- `apps/web/src/features/crops/waterDemand.ts`
- `apps/web/src/features/crops/CompanionRotationPlannerCard.tsx`
- `apps/web/src/store/cropStore.ts`
- `packages/shared/src/demand/cropDemand.ts`

### Recommended next session

- Visual screenshot pass once the MapLibre preview cooperates (or use a reduced-overlay project).
- Resolve the 49 pre-existing typecheck errors in `src/v3/...` rails — separate cleanup.
- Schedule A subcategory picker for AU livestock (still deferred).
- ET0 / climate-driven water adjustment now structurally available via `petClimateMultiplier()` — wire it to a project's climate read-out next.
