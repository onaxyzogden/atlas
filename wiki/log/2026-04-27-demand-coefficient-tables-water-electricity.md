# 2026-04-27 — Demand coefficient tables (water + electricity)


### Done

**De-hardcoded site demand.** Replaced the `{ low: 50, medium: 110, high: 220 }` flat crop-water lookup, the `irrigationDemandGal = annualRainfallGal * 0.22` placeholder, and the entirely-missing structure/utility demand models with per-type coefficient tables in a new `@ogden/shared/demand` subpath.

New module: [`packages/shared/src/demand/`](../packages/shared/src/demand/) — `structureDemand.ts`, `utilityDemand.ts`, `cropDemand.ts`, `rollup.ts`, `index.ts`. Wired into [`hydrologyMetrics.ts`](../packages/shared/src/scoring/hydrologyMetrics.ts) (accepts optional `structures`/`utilities`/`cropAreas` on `HydroInputs`; falls back to 22% only when none are passed). Web dashboards rerouted: [`HydrologyDashboard.tsx`](../apps/web/src/features/dashboard/pages/HydrologyDashboard.tsx) threads placed entities through; [`EnergyDemandRollup.tsx`](../apps/web/src/features/utilities/EnergyDemandRollup.tsx) sums structure + utility loads via the new helpers; [`PlantingToolDashboard.tsx`](../apps/web/src/features/dashboard/pages/PlantingToolDashboard.tsx) uses the 2D area-type × class table; [`apps/web/src/features/crops/waterDemand.ts`](../apps/web/src/features/crops/waterDemand.ts) became a thin wrapper with the deprecated flat table preserved for one release.

**Tests.** 20 new in [`packages/shared/src/tests/demand.test.ts`](../packages/shared/src/tests/demand.test.ts) covering finiteness of every type's coefficients, greenhouse area scaling, `storiesCount` linearity, override semantics (well_pump 12 wins; 0 falls through), area-type ≠ same-class divergence (orchard:medium ≠ market_garden:medium), rollup additivity (2 cabins = 2× one cabin), and hydrology back-compat (empty inputs → 22% fallback; structure-only → 21,900 gal/yr; crop-only orchard 1000 m² medium → 110,000 gal/yr).

Decision record: [decisions/2026-04-27-demand-coefficient-tables.md](decisions/2026-04-27-demand-coefficient-tables.md).

### Verification

- `packages/shared` build ✓; vitest 118/118 ✓ (20 new in `demand.test.ts`).
- `apps/web` `tsc --noEmit` ✓; `apps/api` `tsc --noEmit` ✓.
- Root `npm run lint` ✓.
- Live dev-server module probe confirmed cabin 60+8, well_pump 6 (override 12), orchard low/med/high = 60/110/180, mixed scenario rollup = 601,100 gal/yr + 19 kWh/day.

### Deferred

- **Per-instance override modals** for structures and utilities (current model: per-type defaults + the existing `demandKwhPerDay` text field).
- **Livestock water demand** — `livestock/speciesData.ts` carries gal/head/day data; not yet folded into `sumSiteDemand`.
- **Household occupancy modeling** — cabin's 60 gal/day = 1-occupant assumption.
- **Real solar irradiance from NASA POWER** — `utilityAnalysis.ts` still uses the 4.5 kWh/m²/day literal (TODO note added).
- **Climate / PET multiplier on crop demand** — flat 1.0 in this pass; lives next to the existing FAO-56 PET model.
- **Drop the deprecated flat `WATER_DEMAND_GAL_PER_M2_YR`** after PlantingTool's species-rollup is migrated to the per-area-type signature.

### Recommended next session

- **Livestock demand into the rollup.** `speciesData.ts` already has gal/head/day; thread `LivestockLike[]` into `sumSiteDemand` and `HydroInputs`.
- Or — **per-instance override UI**. StructurePropertiesModal + utility property modal grow a "demand override" field; defaults remain visible as the placeholder.
