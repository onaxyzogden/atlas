# 2026-04-28 — Diagnose page: live MapLibre + matrix overlays


### Done

Wired the Matrix Toggles store to a real overlay layer on the Diagnose page (Permaculture Scholar IA: sectors / zones / topography are *site-analysis* tools, so they live on Diagnose, not Discover).

- New container [`apps/web/src/v3/components/DiagnoseMap.tsx`](../apps/web/src/v3/components/DiagnoseMap.tsx) — MapLibre instance + `MapTokenMissing` fallback, render-prop children receive `(map, centroid)`. MTC centroid hard-coded to `[-78.20, 44.50]` for v3.1; real boundary geometry will swap in when the project store gains a parcel feature.
- Three overlay components in [`apps/web/src/v3/components/overlays/`](../apps/web/src/v3/components/overlays/):
  - `TopographyOverlay` — vector contours from MapTiler `CONTOUR_TILES_URL` (source-layer `contour`, `ele` property; thicker stroke + label every 100 m)
  - `SectorsOverlay` — 8 cardinal/intercardinal rays from centroid (mocked 600 m for v3.1)
  - `ZonesOverlay` — 5 concentric rings (Mollison Zones 1–5; mocked 25 / 75 / 200 / 600 / 1500 m radii)
- Each overlay subscribes to its own `useMatrixTogglesStore` boolean and toggles `visibility` via `setLayoutProperty`; layers are added once and never removed (idempotent ensure pattern matched against v1's `MapCanvas`).
- [`DiagnosePage.tsx`](../apps/web/src/v3/pages/DiagnosePage.tsx) gains a "Site analysis" section between StageHero and the category grid, hosting the map.
- Floating legend on the map labels active overlays so the toggle state is visible on the map itself, not only in the sidebar popover.

### Verification

- `tsc --noEmit` clean across `apps/web`.
- Preview reload at `/v3/project/mtc/diagnose`: all three overlays render at `[-78.20, 44.50]` (Ontario), legend reflects active toggles, matrix layers add to `map.getStyle()` (`matrix-{topography,sectors,zones}-{source|fill|line|label}`).
- Sectors-only mode confirmed: 8 directional rays render with N/S/E/W/SW labels; zone rings absent; basemap topo contours remain (those are MapTiler's own, unrelated to our `matrix-topography-line`).
- Switched MapLibre readiness gate from a `ready` boolean to a `useState<Map|null>` so children mount as soon as the map exists; overlays each handle `isStyleLoaded()` themselves. Earlier `ready` gate raced StrictMode's mount/unmount cycle and left only the topography effect surviving.

### Deferred

- **Real sector data.** Sun arc, prevailing wind, fire, water flows currently 8 evenly-spaced rays. Will need a sun-path service (NOAA/NREL) and per-region wind climatology for v3.2.
- **Designer-defined zones.** Mollison's zones are designer-drawn boundaries, not concentric circles. Mock rings communicate the concept but a real parcel needs polygon editing.
- **Parcel boundary in mockProject.** `mockProject.location` lacks lat/lng; centroid hardcoded. When the data layer grows a `boundary: GeoJSON.Polygon`, swap `MTC_CENTROID` for `centroid(boundary)` and re-fit the map to the parcel bounds.
- **Discover-stage "where is it?" map.** Discover is property-shopping (regulatory/zoning context, regional siting); deferred per Permaculture Scholar IA — the matrix overlays don't belong there.

### Recommended next session

- Wire a parcel boundary into the project store and let DiagnoseMap fit to it instead of the hard-coded centroid; once real parcels exist, raster contours from `TERRAIN_DEM_URL` become viable for adaptive contour intervals.
