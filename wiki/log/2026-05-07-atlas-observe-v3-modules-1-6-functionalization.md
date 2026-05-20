# 2026-05-07 — Atlas OBSERVE v3 Modules 1–6 Functionalization


Completed the full functionalization pass across all six v3 Observe modules
on `feat/atlas-permaculture`. Every hardcoded KPI value, metric count, and
chart/map PNG is now replaced with live Zustand store data or a pure-SVG
component. Empty-state `'—'` shown when stores are empty.

Pattern applied uniformly:
- `derivations.ts` pure helpers (zero React) per module
- raw-array + `useMemo` selector discipline (ADR 2026-04-26)
- chart PNGs → pure-SVG; map PNGs → `<TerrainSnapshot>` reuse; hero PNGs kept
- `__tests__/derivations.test.ts` per module (cumulative 75+ green tests)

New pure-SVG components: `SectorCompassDiagram` (3-layer wind/solar/manual
wedge compass rose), plus topography/earth-water SVG strip set from earlier
in the session series. `SectorCompassDiagram` consumes `computeWindSectors`
+ `computeSolarSectors` from `lib/sectors/` when a project centroid is
available; falls back gracefully. `compact` prop for dashboard preview cards.

Module 6 (SWOT) was purely a data-wiring pass — no PNG imports existed.
Synthesis scores left as `'—'` (no algorithm; human-synthesized values).

Bugs fixed: `EcologicalDetail` ICON_MAP `droplet: Waves → Droplet`;
`MacroclimateDashboard` + `HazardsLogDetail` infinite-loop selector
(`getHazards(id)` in-selector) fixed with raw array + `useMemo`.

ADR: see [2026-05-07-atlas-observe-modules-functionalization.md](decisions/2026-05-07-atlas-observe-modules-functionalization.md)

Verification: tsc exit 0, all derivation tests green, DOM confirms `'—'`
empty state and no chart PNGs across all six modules.
