# Demand model round 2 — overrides, occupancy, livestock, climate

**Date:** 2026-04-27
**Status:** accepted
**Scope:** `packages/shared/src/demand/`, `scoring/hydrologyMetrics.ts`, web utility/structure/hydrology/planting/energy dashboards
**Follows:** [2026-04-27-demand-coefficient-tables.md](2026-04-27-demand-coefficient-tables.md)

## Problem

Round 1 (de-hardcoding water + electricity coefficients) closed with six items deferred. They split cleanly into four phases:

- **A1** — `getStructureWaterGalPerDay` / `getStructureKwhPerDay` had no per-instance override, unlike `getUtilityKwhPerDay` which already honoured `demandKwhPerDay > 0`.
- **A2** — The deprecated `WATER_DEMAND_GAL_PER_M2_YR` flat re-export survived the round 1 migration; PlantingTool still read it at two display callsites.
- **B** — Cabin = 60 gal/day, bathhouse = 80 gal/day encoded a 1-occupant assumption with no escape hatch.
- **C** — `LIVESTOCK_SPECIES` carried narrative water notes ("40-80 L/head/day for cattle") but no machine-readable coefficients. `sumSiteDemand` had no livestock arm.
- **D1** — `estimateSolarOutput()` used a literal `avgIrradiance = 4.5` with a TODO to thread NASA POWER `solar_radiation_kwh_m2_day` through.
- **D2** — `cropDemand.ts` documented "climate / PET multiplier × 1.2 in arid zones — deferred, flat 1.0 in this pass." `petModel.ts` already computed FAO-56 ET₀ from inputs the climate layer provides.

## Decision

### A1 — Structure overrides (mirror utility pattern)

`StructureLike` and `Structure` gain optional `demandWaterGalPerDay` + `demandKwhPerDay`. Both getters early-return the override when `> 0`, before greenhouse per-m² scaling, occupants, and `storiesCount`. `StructurePropertiesModal` exposes two numeric inputs with the per-type default rendered as the placeholder so stewards see what they're overriding.

### A2 — Flat table removed

`WATER_DEMAND_GAL_PER_M2_YR` and the legacy `(areaM2, demand: WaterDemandClass)` overload of `computeWaterGalYr` deleted. Only `(areaM2, { areaType, waterDemandClass? })` remains. `PlantingToolDashboard` tooltip + footnote callsites migrated to `getCropAreaDemandGalPerM2Yr({ areaType: 'orchard', … })`, framed as "orchard reference" so the displayed numbers remain interpretable.

### B — Residential occupancy

`RESIDENTIAL_STRUCTURE_TYPES = ['cabin', 'yurt', 'tent_glamping', 'earthship', 'bathhouse']`. Only those scale by `occupantCount` (default 1). Multipliers stack: a 2-story 4-occupant cabin = 60 × 4 × 2 = 480 gal/day. Override outranks occupant scaling. Modal exposes a 1–8 occupants slider, gated visible-only on residential types.

### C — Livestock module

New `packages/shared/src/demand/livestockDemand.ts`:

```ts
type LivestockSpecies = 'sheep' | 'cattle' | 'goats' | 'poultry' | 'pigs'
                      | 'horses' | 'ducks_geese' | 'rabbits' | 'bees';
LIVESTOCK_WATER_GAL_PER_HEAD_DAY: Record<LivestockSpecies, number>;
//  sheep 2, cattle 15, goats 2, poultry 0.1, pigs 5,
//  horses 12, ducks_geese 0.3, rabbits 0.25, bees 0
getPaddockWaterGalPerDay({ species[], stockingDensity, areaM2, headCount? }): number;
```

Sources: FAO livestock water requirement tables + USDA NRCS livestock watering guidelines. Total head = `headCount ?? round(stockingDensity × areaHa)`. Multi-species paddock splits head equally across species (so a cattle+sheep paddock at 10 head = 5 cattle × 15 + 5 sheep × 2 = 85 gal/day, not 150).

`SiteDemandInput` gains `paddocks?: LivestockLike[]`, `SiteDemand` gains `livestockWaterGalYr`. `HydroInputs` carries `paddocks` through. `HydrologyDashboard` reads from `livestockStore` and threads project-filtered paddocks into the engine.

### D1 — Real solar irradiance

`estimateSolarOutput(panelCount, avgIrradiance?)` now treats irradiance as optional; falls back to 4.5 kWh/m²/day only when undefined or non-positive. `EnergyDemandRollup` accepts `solarIrradianceKwhM2Day?: number`. `UtilityPanel` and `EnergyDashboard` read `climate.solar_radiation_kwh_m2_day` from the existing siteData layer summary and forward it. The footnote now cites the value used: "irradiance: 5.2 kWh/m²/day (NASA POWER)" vs. "(temperate-zone default — load climate layer for site-specific value)" when the layer hasn't loaded.

### D2 — PET-driven climate multiplier

`petClimateMultiplier(petMm, refPetMm = 1100)` clamped to `[0.7, 1.5]`. FAO-56 temperate baseline = 1100 mm/yr. Returns 1 for non-finite or non-positive inputs.

`getCropAreaDemandGalPerM2Yr` and `getCropAreaWaterGalYr` accept an optional second arg `climateMultiplier`. `sumSiteDemand` accepts `climateMultiplier` and applies it inside the crop reducer. `computeHydrologyMetrics` derives the multiplier from the same `computePet()` call it already runs (gated on solar/wind/RH presence so the legacy fallback path stays at 1.0).

PlantingTool's per-area display rollup intentionally stays unscaled — proxy PET from temperature alone produced unrealistic 4–5× multipliers, and the multiplier belongs in the rollup that has full climate data anyway.

## Alternatives considered

- **Apply climate multiplier in PlantingTool too.** Tried, reverted: without solar/wind/RH the temperature-only Blaney-Criddle proxy produced PET ≈ 5000 mm/yr at 12 °C and clamped every site to 1.5×. The Hydrology dashboard owns the full climate input set; PlantingTool's per-area numbers stay comparable across sites without it.
- **Per-paddock species head-count UI.** Deferred. Stocking density × area is sufficient for the rollup; explicit head-count override in the model is enough until the UI flow is reworked.
- **Manual "this site is arid" multiplier toggle.** Deferred until PET-driven default is observed in the wild.
- **Per-structure occupancy aggregation to project-level "household size".** Each structure carries its own occupants — no project-wide aggregation needed yet.

## Consequences

- All six round-1 deferrals are closed.
- `demand.test.ts` grows 20 → 38 tests: structure override + occupant scaling, livestock species coefficients + paddock scaling + multi-species splitting, PET multiplier endpoints, and rollup wiring.
- `HydrologyDashboard` now changes its irrigation total when occupancy or paddocks change — visible feedback for a previously inert input.
- Legacy 22%-of-rainfall fallback path untouched: callers without placed entities still get the same number.

## Verification

- `packages/shared`: vitest 136/136 ✓ (38 demand tests).
- `apps/web` / `apps/api` / `packages/shared`: `tsc --noEmit` ✓.
- Manual probe targets: cabin with `occupantCount=4` → 240 gal/day; cattle paddock at 10 head/ha × 2 ha → 300 gal/day; loaded climate layer renders "x.x kWh/m²/day (NASA POWER)" instead of silent 4.5.

## Out of scope

- Backend scoring solar irradiance — engine already accepts `solarRadKwhM2Day` on `HydroInputs`; only the web utility-rollup display was being threaded.
- Aggregated household stat at the project level.
- Per-paddock species headcount UI.
