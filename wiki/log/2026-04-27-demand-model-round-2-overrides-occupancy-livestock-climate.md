# 2026-04-27 — Demand model round 2: overrides, occupancy, livestock, climate


Closed all six round-1 deferrals from the demand-coefficient session earlier
the same day. Decision:
[decisions/2026-04-27-demand-model-round-2.md](decisions/2026-04-27-demand-model-round-2.md).

### Changes (`feat/shared-scoring`)

- [`packages/shared/src/demand/structureDemand.ts`](../packages/shared/src/demand/structureDemand.ts)
  — `StructureLike` gains `demandWaterGalPerDay`, `demandKwhPerDay`,
  `occupantCount`. `RESIDENTIAL_STRUCTURE_TYPES` (cabin/yurt/tent_glamping/
  earthship/bathhouse) gates occupant scaling. Both getters early-return the
  override before greenhouse/occupants/stories scaling.
- [`packages/shared/src/demand/livestockDemand.ts`](../packages/shared/src/demand/livestockDemand.ts)
  *(new)* — `LIVESTOCK_WATER_GAL_PER_HEAD_DAY` by 9-species enum (FAO + NRCS:
  cattle 15, horses 12, pigs 5, sheep/goats 2, ducks_geese 0.3, rabbits 0.25,
  poultry 0.1, bees 0). `getPaddockWaterGalPerDay()` derives total head from
  `headCount ?? round(stockingDensity × areaHa)` and splits across species.
- [`packages/shared/src/demand/cropDemand.ts`](../packages/shared/src/demand/cropDemand.ts)
  — `getCropAreaDemandGalPerM2Yr(spec, climateMultiplier?)` and
  `getCropAreaWaterGalYr(area, climateMultiplier?)` accept optional multiplier;
  new `petClimateMultiplier(petMm, refPetMm = 1100)` clamps to `[0.7, 1.5]`.
- [`packages/shared/src/demand/rollup.ts`](../packages/shared/src/demand/rollup.ts)
  — `SiteDemandInput.paddocks?` + `climateMultiplier?`; `SiteDemand.livestockWaterGalYr`;
  total water = `structureWaterGalPerDay × 365 + cropWaterGalYr + livestockWaterGalYr`.
- [`packages/shared/src/scoring/hydrologyMetrics.ts`](../packages/shared/src/scoring/hydrologyMetrics.ts)
  — `HydroInputs.paddocks?`; PET-driven `climateMultiplier` derived from the
  same `computePet()` call already used for `petMm`, gated on solar/wind/RH
  presence so the legacy fallback path stays at 1.0.
- [`apps/web/src/store/structureStore.ts`](../apps/web/src/store/structureStore.ts)
  — `Structure` adds three optional fields (`demandWaterGalPerDay`,
  `demandKwhPerDay`, `occupantCount`).
- [`apps/web/src/features/structures/StructurePropertiesModal.tsx`](../apps/web/src/features/structures/StructurePropertiesModal.tsx)
  — Two demand-override inputs (placeholders show per-type defaults); 1–8
  occupants slider gated visible-only on residential types.
- [`apps/web/src/components/panels/DesignToolsPanel.tsx`](../apps/web/src/components/panels/DesignToolsPanel.tsx)
  — Both placement and edit handlers forward the three new fields to the store.
- [`apps/web/src/features/crops/waterDemand.ts`](../apps/web/src/features/crops/waterDemand.ts)
  — Removed deprecated `WATER_DEMAND_GAL_PER_M2_YR` flat re-export; only the
  per-area-type signature of `computeWaterGalYr` remains.
- [`apps/web/src/features/dashboard/pages/PlantingToolDashboard.tsx`](../apps/web/src/features/dashboard/pages/PlantingToolDashboard.tsx)
  — Tooltip + footnote callsites migrated to `getCropAreaDemandGalPerM2Yr`
  ("orchard reference" framing).
- [`apps/web/src/features/dashboard/pages/HydrologyDashboard.tsx`](../apps/web/src/features/dashboard/pages/HydrologyDashboard.tsx)
  — Reads `livestockStore.paddocks` (project-filtered) and threads paddocks
  + new structure override fields into the engine.
- [`apps/web/src/features/utilities/utilityAnalysis.ts`](../apps/web/src/features/utilities/utilityAnalysis.ts)
  — `estimateSolarOutput(panelCount, avgIrradiance?)`: irradiance now optional;
  4.5 kWh/m²/day fallback only when undefined or non-positive. TODO removed.
- [`apps/web/src/features/utilities/EnergyDemandRollup.tsx`](../apps/web/src/features/utilities/EnergyDemandRollup.tsx)
  — New `solarIrradianceKwhM2Day?` prop; footnote cites "(NASA POWER)" when
  the climate layer is loaded, else "(temperate-zone default)".
- [`apps/web/src/features/utilities/UtilityPanel.tsx`](../apps/web/src/features/utilities/UtilityPanel.tsx)
  + [`apps/web/src/features/dashboard/pages/EnergyDashboard.tsx`](../apps/web/src/features/dashboard/pages/EnergyDashboard.tsx)
  — Both read `climate.solar_radiation_kwh_m2_day` from siteData and forward.

### Tests + verification

- `packages/shared`: `npx vitest run` 136/136 ✓ — `demand.test.ts` grew 20 → 38
  with structure overrides, occupant scaling, livestock species coverage,
  paddock scaling, multi-species head splitting, PET multiplier endpoints,
  and override-stacks-with-stories.
- `tsc --noEmit` clean for `packages/shared`, `apps/web`, `apps/api`.

### Manual probe targets

- Cabin with `occupantCount = 4` → 240 gal/day (was 60).
- Cattle paddock at 10 head/ha × 2 ha → 300 gal/day in hydrology rollup.
- Climate-loaded solar row → "x.x kWh/m²/day (NASA POWER)" footnote vs.
  "(temperate-zone default — load climate layer for site-specific value)".
- Override `demandWaterGalPerDay = 200` on a 4-occupant cabin → 200 (override wins).

### Out of scope (deferred)

- PlantingTool per-area display rollup intentionally stays at the unscaled
  per-area-type baseline — proxy PET from temperature alone produced
  unrealistic 1.5× clamps; the multiplier belongs in the rollup that has
  full solar/wind/RH input.
- Per-paddock species head-count UI in placement flow.
- Manual "this site is arid" climate-multiplier toggle.
- Project-level "household size" aggregation across structures.
