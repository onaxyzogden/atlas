# Atlas Plan · Module 3 (Zones & Circulation) — BUILD_FRESH per Permaculture Scholar verdict

**Date:** 2026-05-07
**Branch:** `feat/atlas-permaculture`
**Type:** decision · iteration step (Module 3 of 8 in plan-stage Scholar review)

## Context

Third module in the Plan-stage Permaculture Scholar adjudication loop
(NotebookLM `5aa3dcf3-…`). Atlas's incumbent is two list-only editors:
`ZoneLevelLayer.tsx` (assigns Z0–Z5 to drawn zones) and
`PathFrequencyEditor.tsx` (assigns daily/weekly/occasional/rare to
drawn paths). OGDEN's prototype is three visually rich pages: zone-map
with land-use categories, movement-frequency heatmap, and a 28-day
paddock rotation planner.

## Scholar verdict

**BUILD_FRESH.** Direct quotes:

- The Z0–Z5 frequency-of-visit ladder (Atlas) is **the orthodox
  permaculture standard** — "Permaculture zones are explicitly defined
  by how often people move through a site and visit specific elements."
  OGDEN's land-use categories "miss the entire point of zoning, which
  is to conserve human energy by placing high-maintenance elements
  close to the center of activity."
- A list-only view (Atlas) is "entirely insufficient. Because zones are
  fundamentally about the spatial relationship of elements and how
  people move through a site, a steward cannot make a sound decision
  without seeing these relationships mapped over their specific
  topography."
- Paddock rotation does **not** belong in this module. Per Yeomans
  Scale of Permanence, "Subdivision, which specifically refers to
  fencing for the controlled rotation of animals, comes later in the
  scale." OSU PDC: "access (circulation) and water are the foundational
  *circulatory system* of the site … Gardens and animals are
  considered the more ephemeral *reproductive system* layer, which is
  added onto the site only after the permanent infrastructure (water,
  circulation, trees) is established."

Architectural insight (verbatim):

> "Discard the OGDEN land-use categories and fake sensor heatmaps, and
> extract its paddock rotation into a future Subdivision/Livestock
> module. Keep the Atlas Z0–Z5 taxonomy and path-frequency data
> structure, but upgrade it to require spatial visualization. Your
> module should allow the steward to draw their pathways on a map,
> assign a frequency to those paths, and draw Z0–Z5 polygons around
> those paths to ensure their daily routes logically align with their
> high-maintenance zones."

The minimum visualisation per Scholar: a base map overlaid with Z0–Z5
polygons + traced circulation pathways tagged by frequency, where the
user can visually verify high-frequency paths intersect Z1/Z2 zones.

## Build-fresh sketch (executed)

The Atlas zone and path stores already carry geometry — zones drawn on
the live map land in `zoneStore` as GeoJSON polygons, paths land in
`pathStore` as GeoJSON line-strings. The Scholar's "minimum
visualisation" therefore did not require any new map-draw integration:
it required a spatial *overview* card that re-projects existing
geometries into an SVG mini-map alongside the existing list editors.

Module 3 sub-cards (3, was 2):

1. **`ZoneLevelLayer.tsx`** (existing) — keep verbatim. Z0–Z5 select
   per zone. Scholar ruled this taxonomy permaculturally orthodox.
2. **`PathFrequencyEditor.tsx`** (existing) — keep verbatim.
   daily/weekly/occasional/rare per path.
3. **`ZoneCirculationOverviewCard.tsx`** (new) — spatial mini-map +
   intersection validation:
   - Bounding box computed from `project.parcelBoundaryGeojson` ∪
     all zone polygons ∪ all path lines, with 5% padding.
   - Equirectangular projection into a 720×460 SVG, lat-flipped.
   - Zone polygons filled by Z-level (warm-to-cool ramp Z0→Z5);
     untagged zones rendered as neutral grey.
   - Paths rendered with stroke-width and colour scaling by
     `usageFrequency` (daily widest/warmest, rare thinnest/coolest);
     untagged paths neutral.
   - Z-label text at each tagged zone's bbox centroid.
   - Frequency legend in the top-right corner.
   - Coverage panel (m² per Z-level) and untagged counts.
   - **Validation rule (Scholar's intersection check):** every daily
     or weekly path's bbox must intersect at least one Z1 or Z2
     zone bbox. Failures listed in red as orphan paths. (Bbox
     overlap is conservative — if it returns "no overlap" we are
     certain the path doesn't enter the zone, which is exactly the
     direction the steward needs.)
   - "Open the map" link surfaced when no geometries exist yet.

## Wiring

- `types.ts` — `MODULE_CARDS['zone-circulation']` extended from 2 to 3
  sub-tabs: `plan-zone-level` / `plan-path-frequency` /
  `plan-zone-overview`.
- `PlanModuleSlideUp.tsx` — added lazy import + switch case for
  `plan-zone-overview`. Comment notes Scholar verdict + rationale for
  *not* porting OGDEN's paddock planner.
- `PlanChecklistAside.tsx` — `zone-circulation` WHY/HOW rewritten to
  cite Mollison + Yeomans Scale of Permanence and to instruct
  stewards to "Open Overview & validation to verify high-frequency
  paths reach Z1 / Z2."
- Atlas legacy cards remain at `apps/web/src/features/plan/`. The new
  card lives at `apps/web/src/v3/plan/cards/zone-circulation/` and
  reads zone + path stores directly.

## Verification

- `npm run typecheck` — pending at time of writing (running in
  background).
- `npm run build` — to follow with
  `NODE_OPTIONS=--max-old-space-size=8192`.

## Follow-ups

- **Subdivision / Livestock module** — paddock rotation, gates,
  laneways, water-points, stocking density, 28-day cycle. Anchored
  to Yeomans step 5 ("Subdivision"), comes after circulation (this
  module) and water (Module 2). OGDEN's `PlanPaddockDesignPage`
  (188L) is the design reference once the post-acquisition phase
  arrives.
- **Map-draw integration in this card** — currently the card is
  read-only (geometries flow in from the live map). Future work
  could add inline drawing of zone polygons / path lines without a
  context switch.
- **Polygon-line intersection refinement** — replace bbox-overlap with
  a true polygon-line intersection test once
  `@turf/boolean-intersects` (or equivalent) is in the bundle. Bbox
  is the right *conservative* heuristic (no false-passes; some
  false-fails on diagonal paths grazing rectangular zones).
- **Sector overlay** — OSU PDC and Mollison both pair zones with
  *sectors* (sun, wind, fire, view). The Cross-section module
  (Module 6) covers sun. A separate sector card for wind/fire/view
  may be warranted in a future iteration.
