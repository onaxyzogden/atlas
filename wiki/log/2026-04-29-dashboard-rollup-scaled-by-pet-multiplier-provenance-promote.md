# 2026-04-29 — Dashboard rollup scaled by PET multiplier; provenance promoted to chip


### Done

Follow-up to the morning's CropPanel wire-up: `PlantingToolDashboard`'s water-demand rollup now consumes the same `useClimateMultiplier(projectId)` hook the popup uses, so popup and dashboard agree by construction. The dim provenance line introduced earlier was promoted into a real reusable attribution chip.

- New component [`apps/web/src/features/crops/ClimateAttributionChip.tsx`](../apps/web/src/features/crops/ClimateAttributionChip.tsx) — renders `×{mult} climate · {FAO-56|Blaney-Criddle} · {pet} mm/yr PET` with a tooltip describing the data sources. Returns null when climate is unknown so callers can drop it unconditionally.
- [`CropPanel.tsx`](../apps/web/src/features/crops/CropPanel.tsx): popup's water-demand block now uses `<ClimateAttributionChip className={p.chip} />` instead of the inline dim `<div>`.
- [`PlantingToolDashboard.tsx`](../apps/web/src/features/dashboard/pages/PlantingToolDashboard.tsx):
  - `buildWaterDemandRollup(cropAreas, climateMultiplier = 1)` — optional second arg threaded through `getCropAreaDemandGalPerM2Yr(spec, climateMultiplier)`. Default 1 preserves back-compat.
  - Added `const climateMx = useClimateMultiplier(project.id)` (renamed from `climate` to avoid collision with the existing `ClimateSummary` variable used by suitability/windows/validations/orchardSafety).
  - `waterDemand` useMemo now passes `climateMx.multiplier`.
  - WATER DEMAND `<h2>` section header sports the chip on the right.
  - Footnote conditionally appends "Numbers above are scaled by the site PET multiplier (×N.NN), so they match the drawing-tool popup figures." when climate is known.

### Verified

- Typecheck: zero errors in touched files (`PlantingToolDashboard.tsx`, `CropPanel.tsx`, `ClimateAttributionChip.tsx`, `useClimateMultiplier.ts`). Pre-existing `src/v3/...` errors unchanged.
- Architecturally: the popup's `getCropAreaDemandGalPerM2Yr(spec, climate.multiplier)` and the dashboard's `buildWaterDemandRollup(cropAreas, climateMx.multiplier)` ride the exact same multiplier source — figures cannot drift.

### Files

- `apps/web/src/features/crops/ClimateAttributionChip.tsx` (new)
- `apps/web/src/features/crops/CropPanel.tsx` (chip swap)
- `apps/web/src/features/dashboard/pages/PlantingToolDashboard.tsx` (rollup multiplier + header chip + footnote)
