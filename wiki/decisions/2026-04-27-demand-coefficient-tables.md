# Demand coefficient tables (water + electricity)

**Date:** 2026-04-27
**Status:** accepted
**Scope:** `packages/shared/src/demand/`, `scoring/hydrologyMetrics.ts`, web utility/crop/hydrology/energy dashboards

## Problem

Demand calculations across Atlas were a mix of literal magic numbers and missing models:

- **Crop / orchard water** read from a flat 3-class lookup `{ low: 50, medium: 110, high: 220 }` gal/m²/yr applied to *every* crop area type. Orchards, food forests, market gardens, and windbreaks all rendered identically — the user-flagged "orchard water demand seems hardcoded" symptom.
- **Site irrigation demand** was a placeholder: `irrigationDemandGal = annualRainfallGal * 0.22` in [`hydrologyMetrics.ts`](../../packages/shared/src/scoring/hydrologyMetrics.ts), unrelated to anything actually placed on the site.
- **Structure demand**: didn't exist. The 20 `StructureType` variants (cabin, greenhouse, bathhouse, …) had zero demand fields — Hydrology + Energy dashboards rolled up nothing from structures.
- **Utility demand**: only a manual `demandKwhPerDay?` text override on `Utility`. No defaults — a placed `well_pump` contributed 0 unless the steward typed a number.

## Decision

Single source of truth in `packages/shared/src/demand/`, additive rollup, override-respecting.

### Module layout

```
packages/shared/src/demand/
  structureDemand.ts   # WATER_GAL_PER_DAY + KWH_PER_DAY by StructureType
  utilityDemand.ts     # KWH_PER_DAY by UtilityType (loads, not generation)
  cropDemand.ts        # gal/m²/yr by area type × water-demand class (2D)
  rollup.ts            # sumSiteDemand({ structures, utilities, cropAreas })
  index.ts             # barrel
```

Exposed as a new subpath `@ogden/shared/demand` (mirrors the existing `./scoring` and `./manifest` exports). Not re-exported from the main barrel — keeps the pattern of sub-domain modules separate.

### Per-type tables

- **Structures** (per habitable structure, ≈1 occupant): cabin 60 gal/day + 8 kWh/day; bathhouse 80 + 4; classroom/pavilion/prayer_space 5 + 3; workshop 5 + 6; greenhouse per-m² (0.5 gal/m²/day, 0.05 kWh/m²/day) scaled by `widthM × depthM`; storage/tool sheds 0 + 0.5; solar_array / well / water_tank 0 + 0. `storiesCount` multiplies linearly for non-greenhouse types.
- **Utilities** (electricity loads only): well_pump 6, laundry_station 4, lighting 1, greywater 0.5, septic 0.2; passive (compost, biochar, waste_sorting, water_tank, rain_catchment, …) = 0; generation/storage (solar_panel, battery_room, generator) = 0 (excluded from load sum). Steward-entered `demandKwhPerDay > 0` overrides; ≤ 0 falls through to default.
- **Crops** (per area type × class, gal/m²/yr): orchard 60/110/180; food_forest 50/80/130; silvopasture 30/50/80; row_crop 80/130/200; market_garden 130/200/280; windbreak/shelterbelt 12/20/35. Two-dimensional — orchard medium 110 ≠ market_garden medium 200, closing the original "looks identical for every crop" symptom.

### Engine wiring

`HydroInputs` accepts optional `structures`, `utilities`, `cropAreas`. When any are present, irrigation demand = `sumSiteDemand(...).waterGalYr`. When none are passed, the 22%-of-rainfall fallback stays in place — back-compat for tests and any caller that hasn't been threaded yet.

## Alternatives considered

- **Per-instance override modals** — every structure/utility gets a "set my demand" form. Deferred; defaults + the existing `demandKwhPerDay` text field cover the v1 need without UI scope creep.
- **Climate / PET multiplier on crop demand** — flat 1.0 in this pass. Tracked as a TODO in `cropDemand.ts`; lives next to the existing FAO-56 PET model.
- **Real solar irradiance from NASA POWER** — kept the 4.5 kWh/m²/day literal in `utilityAnalysis.ts` with a TODO. Out of scope; touching solar would require climate-layer wiring.
- **Household occupancy-driven cabin demand** — cabin's 60 gal/day = single-occupant assumption. Per-project occupancy modeling deferred.

## Consequences

- Existing irrigation snapshots still pass: when no entities are placed, the 22% fallback yields the same number it always did.
- New: place a cabin → 21,900 gal/yr appears in the irrigation total. Place a 5,000 m² orchard at medium class → 550,000 gal/yr.
- `WATER_DEMAND_GAL_PER_M2_YR` flat lookup kept as a deprecated re-export from `apps/web/src/features/crops/waterDemand.ts` for one release so the species-rollup callsite in PlantingToolDashboard keeps compiling. Marked for removal.
- Shared package gains a fourth subpath; consumers must import from `@ogden/shared/demand` (not the root barrel).

## Verification

- `packages/shared`: build ✓, vitest 118/118 ✓ including 20 new tests in [`tests/demand.test.ts`](../../packages/shared/src/tests/demand.test.ts) covering coefficient finiteness, area-type ≠ same-class divergence, additivity (2 cabins = 2× one cabin), override semantics, and hydrology back-compat.
- `apps/web`: `tsc --noEmit` ✓; `apps/api`: `tsc --noEmit` ✓; root `npm run lint` ✓.
- Live dev-server module probe confirmed the values quoted above.
