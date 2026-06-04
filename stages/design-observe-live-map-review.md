# Design: Wire a live map into the Observe lens (replace PseudoMap)

**Date:** 2026-06-04
**Project:** Atlas / OLOS -- Observe stage (`module-bar` observational lens)
**Branch:** `feat/atlas-permaculture` (externally rebased; commit each slice on verify, do NOT push)
**Status:** review (awaiting operator approval before writing the implementation plan)
**Amanah gate:** hifz al-ard (land stewardship instrumentation); no riba/gharar. Clean.

---

## Goal

Replace the decorative `PseudoMap` SVG terrain in the Observe lens with a real,
live basemap that renders the project's parcel boundary and its observation
points at their true geographic positions, while preserving the lens's existing
pin visual language and interactions. Projects without geometry keep the
`PseudoMap` as an honest fallback.

The operator selected the `PseudoMap` background `<rect>` in
`ObserveLensDashboard.tsx` (~line 142) and asked to "wire in live map."

## Decisions locked (operator)

1. **Seed real MTC geo + graceful fallback.** Author real demo geometry for the
   Moontrance Creek (`mtc`) builtin so the live map renders meaningfully, AND
   render the real map only where geometry exists -- `PseudoMap` stays the
   fallback for geometry-less projects (and for mock/Millbrook mode).
2. **MTC geo = plausible Ontario placeholder.** A small farm-scale boundary in
   rural Ontario (matching the record's `country: 'CA'` / `provinceState: 'ON'`),
   with the 10 seed observation points scattered within it by domain. Clearly
   demo data; swappable for real coordinates later.
3. **Approach B -- dedicated lightweight `ObserveMap`** built directly on
   `maplibre-gl`, reusing the shared `lib/maplibre.ts` style/token/ESRI-fallback
   helpers (NOT reusing the heavy editing-oriented `MapCanvas`).

## Current-state facts (from exploration)

- Real maps in this app are **MapLibre GL** (`maplibre-gl ^4.7.0`). The shared
  basemap helper is `apps/web/src/lib/maplibre.ts`: token env var
  `VITE_MAPTILER_KEY` (also a `localStorage` override `ogden-maptiler-key`),
  exports `hasMapToken` + `maptilerKey`, and falls back to **ESRI World Imagery
  raster** when no token -- so a basemap renders with or without a key.
- The reusable design canvas `features/map/MapCanvas.tsx` exists but is built for
  editing (MapboxDraw, zones, structures); not used here (Approach A rejected).
- `PseudoMap` (`apps/web/src/v3/observe/lens/components.tsx`, ~lines 44-108) is a
  fixed `viewBox="0 0 720 550"` SVG: a gradient `<rect fill="url(#tg)">`,
  decorative contour paths + ellipses, and one `<g>` per observation. Pins read
  normalized `[0,1]` coords (`px = obs.x*720`, `py = obs.y*550`), colored by lens
  with a divergence triangle variant and a selection pulse ring.
- Pins come from `useLensData().observations: MockObservation[]`
  (`{id, lens, x, y, type, label, age}`), built by `buildObservationPins` in
  `lensData/liveBundle.ts`. With real Point geometry they project into a padded
  `[0.08,0.92]` y-inverted bbox; without geometry they get a deterministic index
  scatter.
- `ObserveDataPoint.locationGeometry` (`packages/shared/.../dataPoint.schema.ts`)
  is a nullable GeoJSON `Point` (`{type:'Point', coordinates:[lng,lat]}`);
  `coordsOf(point)` in `liveBundle.ts` already safe-reads it. **Every MTC seed
  point is currently `null`.**
- The `mtc` builtin project (`store/projectStore.ts`) has
  `parcelBoundaryGeojson: null`, `hasParcelBoundary: false`, no address.

## Architecture

### New component: `apps/web/src/v3/observe/lens/ObserveMap.tsx` (read-only)

- Props:
  ```
  {
    boundary: GeoJSON.FeatureCollection | null;
    bbox: [number, number, number, number];   // [minLng, minLat, maxLng, maxLat]
    markers: ObserveMapMarker[];               // MockObservation & { lng, lat }
    activeLens: string;
    onObsClick: (obs: MockObservation) => void;
    selectedObs: MockObservation | null;
    demoGeometry?: boolean;                    // true -> render "Sample location data" badge
  }
  ```
- Initializes a `maplibregl.Map` using the shared style resolver from
  `lib/maplibre.ts` (MapTiler vector if token, else ESRI raster). Read-only: no
  draw, minimal controls. `fitBounds(bbox)` (padded) on load.
- Adds the parcel boundary as a GeoJSON source with a fill + line layer styled to
  the lens's dark aesthetic (low-opacity fill, accent stroke).
- **Pins as a synced SVG overlay** above the GL canvas: container
  `pointer-events:none`, each pin `pointer-events:auto`. On every map
  `move`/`zoom`/`resize`, re-project each marker `[lng,lat]` -> screen px via
  `map.project(...)` and reposition. Pins reuse the shared `ObservationPin`
  markup, so lens color / divergence triangle / selection pulse / `onObsClick` /
  `selectedObs` behave identically to today.
- Cleans up the map instance + listeners on unmount.

### Extracted subcomponent: `ObservationPin`

Pull the per-observation pin markup out of `PseudoMap` into one small component
taking absolute coords `(px, py)` + `obs` + `selected` + `onClick`. Both
`PseudoMap` (coords from normalized `[0,1]`) and `ObserveMap` (coords from
`map.project`) render the same markup. This is a targeted DRY extraction in code
we are already touching -- no behavior change to `PseudoMap`.

### Mount swap: `ObserveLensDashboard.tsx`

The `<main._canvas>` block (~line 142) becomes
`{map ? <ObserveMap .../> : <PseudoMap .../>}`, where `map` is the new bundle
field. `PseudoMap` stays exported and used (no-deletion). `activeLens`,
`onObsClick`, `selectedObs` thread to whichever renders.

## Data contract (pure layer)

- New pure helper `buildObserveMap(activePoints, parcelBoundary): ObserveMapData | null`
  in `lensData/` (beside `buildObservationPins`, reusing its lens-mapping / type
  / age helpers and `coordsOf`):
  - markers = active points that have a valid Point geometry, each mapped to
    `MockObservation & { lng, lat }`;
  - `boundary` = the project's `parcelBoundaryGeojson` (passed in);
  - `bbox` = computed from the boundary if present, else from the markers;
  - returns **null** when there is no boundary AND zero georeferenced points.
  - `demoGeometry` = true when the boundary/markers came from the builtin seed
    (honest provenance flag; threads to the in-UI "Sample location data" badge).
- New type `ObserveMapData { boundary, bbox, markers, demoGeometry }` and
  `ObserveMapMarker = MockObservation & { lng: number; lat: number }`
  in `types.ts`.
- New optional field on `LensDataBundle`: `map?: ObserveMapData | null`.
  - **Live bundle** (`liveBundle.ts`): `map: buildObserveMap(activePoints, projectBoundary)`
    where `projectBoundary` comes from the project record already read in the hook.
  - **Mock bundle** (`mockBundle.ts`): `map: null` (Millbrook stays PseudoMap ->
    mock mode unchanged).
- The existing normalized `observations` array is retained unchanged for the
  PseudoMap fallback path.

## Seed (plausible Ontario placeholder)

- **`store/projectStore.ts` `mtc` builtin:** set `parcelBoundaryGeojson` to a
  single-Polygon `FeatureCollection` of a ~40 ha farm in rural Ontario centered
  near `[-80.100, 44.300]` (Mulmur/Creemore creek country), extent roughly
  +/-0.0045 deg lng x +/-0.0028 deg lat; set `hasParcelBoundary: true`. ASCII
  only. (If editing the builtin requires a persist version bump -- builtins
  merged into persisted state -- the plan adds a no-op migration; to be confirmed
  during implementation.)
- **`data/builtinObserveDataPoints.ts` MTC bundle:** add an optional `lng`/`lat`
  (or `coordinates`) to `ObserveSeedRow`, threaded through
  `buildBuiltinObserveDataPoints` to set each point's
  `locationGeometry: { type:'Point', coordinates:[lng,lat] }`. The 10 points are
  scattered inside the parcel by domain (water/risk near the creek on the low
  south edge; topography on high NE ground; soil/ecology across fields;
  vision/people near a central homestead; access near the east entrance). Exact
  per-point coordinates are fixed in the implementation plan.

### Seed constraints (forward-compat with later sector/slope/zone overlays)

These are not cosmetic; they protect the v2 overlays (sector wedges, keyline /
slope shading, Zone 0-5 rings) from rework:

- **Full coordinate precision.** Store lng/lat at >=6 decimal places
  (~0.11 m at this latitude). Farm-scale observation is sub-meter; truncating now
  would corrupt the future in-field GPS-capture pipeline and any contour math.
- **Sanely oriented polygon.** Draw the parcel with its long axis along a
  plausible contour / the creek line (a gentle NW-SE lie of the land), NOT an
  arbitrary axis-aligned rectangle, so slope/keyline and sector overlays read
  correctly when added.
- **True-north discipline.** Coordinates are true-north WGS84 lng/lat; do not bake
  in any map-rotation offset. The wind-rose sector overlay (v2) will orient to
  true north off these coordinates, so the seed must be honest to it.
- **Domain-plausible placement.** Water/risk points sit on the low (downhill)
  creek edge; topography on the high ground; this keeps the demo coherent once
  slope shading is layered on. Placement need not be surveyed-accurate (it is
  declared demo data) but must not contradict the slope/water story.

These bind the implementation plan's per-point coordinate choices.

### Demo-data honesty badge (in-UI)

A map manufactures credibility: the instant pins sit on real satellite imagery,
viewers read spatial patterns into them ("the divergences cluster in the SE!")
that are pure artifacts of how the seed was scattered. Seeded geometry must not
be mistaken for surveyed ground truth.

- **Requirement.** When `ObserveMap` renders geometry that is seeded/demo (not
  operator-captured), it shows a small, persistent "Sample location data" badge
  (ribbon/chip in a map corner, lens-dark aesthetic, ASCII copy, non-interactive).
- **Source of truth.** Drive the badge off an explicit, honest signal -- a
  `demoGeometry: true` marker carried on `ObserveMapData` (set by `buildObserveMap`
  when the boundary/points came from the builtin seed), NOT a guess from
  `isBuiltin` alone. The flag is data-honesty metadata, not styling. (This mirrors
  the grounding `{type:'none'}` honest-empty-state ethic: never fake precision we
  do not have.)
- **Forward path.** Once in-field GPS capture lands, captured points clear the
  flag (or render with distinct provenance styling), so the badge disappears for
  real data without further work. This keeps seeded and captured geometry visually
  distinguishable -- the provenance distinction the later epics need.
- **Scope note.** This is the one demo-honesty item that belongs in THIS slice
  (cheap, and it prevents phantom spatial insights the moment the map ships).
  Per-pin provenance styling and capture remain out of scope (below).

## Degrade & edge behavior

- `map` null -> `PseudoMap` (current behavior; covers mock and geometry-less
  live projects).
- No MapTiler token -> ESRI raster basemap (still a real map).
- Boundary present but an individual point lacks geometry -> that point is
  omitted from the map (honest); PseudoMap fallback triggers only at zero
  geometry (no boundary AND no geo points).

## Testing & verification

- **Bounded vitest** (`--pool=forks`, explicit timeout): `buildObserveMap` --
  returns null with no geometry; markers carry correct `lng`/`lat` + lens/type;
  boundary passthrough; bbox computation from boundary and from markers.
- The MapLibre `ObserveMap` component is not unit-tested (WebGL / happy-dom can
  not render GL) -- verified live.
- **Live preview** on `/v3/project/mtc/observe` (Live source): basemap tiles
  render, the MTC polygon draws, the 10 pins sit inside the parcel at plausible
  spots, clicking a pin selects it + opens the detail slide-up, and pan/zoom
  keeps pins glued to their geography, AND the "Sample location data" badge is
  visible (seeded MTC geometry). Screenshot for proof; if
  `preview_screenshot` hangs (known transient) disclose and use `preview_eval`
  DOM/`map.project` reads.
- **Regression:** mock/Millbrook mode still renders `PseudoMap`; `tsc --noEmit`
  EXIT 0; `mockData.ts` untouched; `PseudoMap` export intact.

## Out of scope (YAGNI)

- No new in-app capture of point GPS (operator chose seed-only for the demo).
- No editing/drawing on the Observe map (read-only).
- No migration of `MapCanvas`; no change to the Plan/Act design canvas.
- No seeding geometry for Millbrook/mock or for other builtin projects.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Editing the `mtc` builtin needs a projectStore persist version bump | Med | Med | Confirm builtin/persist merge behavior; add no-op migration if so |
| MapTiler token unset in this environment | Med | Low | ESRI raster fallback renders a basemap regardless; verify in preview |
| SVG overlay blocks map drag gestures | Low | Med | container `pointer-events:none`, pins `pointer-events:auto` |
| External rebase wipes uncommitted slices | Med | High | Commit each slice the moment it verifies; do not push |

## Definition of done

On `/v3/project/mtc/observe` (Live), the Observe canvas shows a real MapLibre
basemap with the seeded MTC parcel boundary and all 10 observation pins at their
true positions, with click-to-select + detail and pan/zoom-glued pins preserving
the existing pin look, and a "Sample location data" badge while the geometry is
seeded/demo. Geometry-less projects and mock mode keep `PseudoMap`.
`buildObserveMap` is pure + unit-tested; `tsc` and bounded tests green;
`mockData.ts` and the `PseudoMap` export intact; live verified (screenshot or
disclosed DOM proof). Each slice committed explicit-path on verify; branch NOT
pushed.
