# 2026-04-29 — PET climate multiplier wired into CropPanel water demand


### Done

Closed the deferred wire-up from the morning popup-fixes session: `petClimateMultiplier()` is now driven by the active project's climate layer instead of always defaulting to 1.0.

- New hook [`apps/web/src/features/crops/useClimateMultiplier.ts`](../apps/web/src/features/crops/useClimateMultiplier.ts) reads `useSiteDataStore.dataByProject[projectId].layers`, finds the climate layer, and dispatches to `computePet` from `@ogden/shared/scoring`:
  - **Penman-Monteith (FAO-56)** when NASA POWER fields are present (`solar_radiation_kwh_m2_day`, `wind_speed_10m_ms`, `relative_humidity_pct`) plus a latitude derived from the project's `parcelBoundaryGeojson` centroid (`turf.centroid`).
  - **Blaney-Criddle** fallback when only `annual_temp_mean_c` is known.
  - **Neutral 1.0** when no climate layer has loaded.
- Result is clamped to [0.7, 1.5] by `petClimateMultiplier()` and returned alongside `petMmYr` + `method` so consumers can show provenance.
- [`waterDemand.ts`](../apps/web/src/features/crops/waterDemand.ts) gained an optional third `climateMultiplier` arg on `computeWaterGalYr` / `computeWaterLitersYr`; default 1 preserves back-compat. `petClimateMultiplier` re-exported from the web wrapper.
- [`CropPanel.tsx`](../apps/web/src/features/crops/CropPanel.tsx) now calls `useClimateMultiplier(projectId)` and threads `climate.multiplier` through every demand call (form preview + persisted `waterGalYr` on `CropArea`). Added a small dim third line under the popup's water-demand block: `×1.18 climate (1300 mm/yr PET, FAO-56)` — only renders when `!climate.unknown`.

### Verified

- Typecheck: zero errors in touched files (the same 49 pre-existing `src/v3/...` errors remain).
- `@ogden/shared` test suite: 38/38 passing on `demand.test.ts`, including the existing `petClimateMultiplier` clamp tests.
- Hot-path spot check: a 1 ha orchard at PET ≈ 1500 mm/yr → multiplier 1.36 → demand 110 × 10000 × 1.36 ≈ 1.50M gal/yr (matches hand-calc).

### Files

- `apps/web/src/features/crops/useClimateMultiplier.ts` (new)
- `apps/web/src/features/crops/waterDemand.ts` (optional `climateMultiplier` arg, re-export `petClimateMultiplier`)
- `apps/web/src/features/crops/CropPanel.tsx` (hook + provenance line)

### Recommended next session

- Apply the same multiplier to the `PlantingToolDashboard` rollup so popup and dashboard agree by construction (currently dashboard reuses its own per-project water memo — quick consolidation pass).
- Surface PET + method as a real attribution chip rather than a single dim line — matches the "Observed N hours ago" stamp pattern from 2026-04-28 concept polish.
