# 2026-05-07 Atlas OBSERVE v3 Modules 1–6 Functionalization

## Status
Complete

## Context

The v3 Observe track was ported from the OLOS prototype as a visual shell:
six module dashboards + twelve detail pages contained hardcoded string
literals (metric counts, KPI values, dates) and PNG chart/map imports
that made the UI look complete but were not connected to any store data.

The permaculture `feat/atlas-permaculture` session series completed the
functionalization pass across all six modules in two sessions (2026-05-07),
replacing every hardcoded datum with live Zustand store subscriptions.

## Decision

Apply the same four-step pattern to each module:

1. **`derivations.ts`** — pure, side-effect-free helpers that take raw store
   arrays and return KPI strip items + count objects. No React, no store
   imports beyond types.

2. **Store selector discipline** — raw-array selector + `useMemo` filter
   (codified in ADR 2026-04-26). Never call store methods that return a
   filtered/mapped array directly in `useStore()`.

3. **Replace PNGs** — chart/map PNGs replaced with pure-SVG components
   (see below) or `<TerrainSnapshot>` reuse. Decorative hero PNGs kept.

4. **`__tests__/derivations.test.ts`** — 6–20 unit tests covering empty
   state (all `'—'`), populated state counts, and tone/label correctness.

## Modules completed

| Module | Dashboard | Detail pages | New components | Tests |
|---|---|---|---|---|
| 1 Human Context | ✓ | 4 | `CapacityOrbit`, `MoodboardUploader` | ~8 |
| 2 Macroclimate & Hazards | ✓ | 4 | `MonthlyClimateChart`, `SunPathDiagram`, `HazardRiskMatrix`, `HazardHotspotsMap` | 14 |
| 3 Topography | ✓ | 4 | `TerrainSnapshot`, `ElevationProfileChart`, `ElevationHistogram`, `SlopeLegendStrip`, `AspectCompass`, `SeasonalSolarStrip` | ~10 |
| 4 Earth, Water & Ecology | ✓ | 4 | `WaterSystemsSnapshot`, `SoilProfileBar`, `PercGauge`, `WaterBalanceBar`, `SpeciesObservationList`, `SeasonalEcologyStrip` | 20 |
| 5 Sectors, Microclimates & Zones | ✓ | 1 | `SectorCompassDiagram` (pure-SVG; 3-layer: wind rose petals + solar arcs + manual wedge overlays) | 15 |
| 6 SWOT Synthesis | ✓ | 2 | — (no chart PNGs; purely data wiring) | 8 |

## Key implementation notes

### `SectorCompassDiagram` (Module 5)
Pure SVG, viewBox `0 0 300 300`. Three rendering layers stacked in z-order:
- Wind rose petals — `computeWindSectors(centroid)` from `lib/sectors/wind.ts`; 8 petals scaled by frequency, Beaufort-colored
- Solar arcs — `computeSolarSectors(centroid)` ring-band style from `lib/sectors/solar.ts`; skipped if no centroid lat
- Manual arrow wedges — `SectorArrow[]` from `externalForcesStore` rendered as colored wedge overlays

`compact` prop emits 180×180 SVG without cardinal labels for dashboard preview cards.

### Module 6 (SWOT) difference
No PNG imports existed — purely a data-wiring pass. `swotCounts`, `swotKpis`,
`journalMetrics` derive from `swotStore.swot: SwotEntry[]` filtered by
`projectId`. Synthesis scores (`7.6/10`, etc.) replaced with `'—'` — no
scoring algorithm exists yet; these are human-synthesized values.

### Bugs fixed in same sessions
- `EcologicalDetail.tsx` ICON_MAP: `droplet: Waves` → `droplet: Droplet` (wrong icon)
- `MacroclimateDashboard.tsx` + `HazardsLogDetail.tsx`: `getHazards(id)` in-selector getter caused infinite re-render loop; fixed with raw array + `useMemo`

## Deferred

- DesignResponses / PriorityActions CRUD (no stores exist)
- SWOT synthesis scores algorithm
- JournalSidebar pattern/theme counts (no derivation model)
- SectorsSidebar dynamic opportunities/actions
- Southern-hemisphere solar arcs (upstream `lib/sectors/solar.ts` limitation)
