# 2026-04-21 — ISRIC SoilGrids v2.0 self-hosting for map-side property overlay

**Status:** Accepted (code landed; ingest deferred to a box with GDAL)
**Sprint:** CD
**Context source:** Wiki (entities/api.md, entities/web-app.md, decisions/2026-04-20-gaez-self-hosting.md)

---

## Context

Atlas had one data-driven raster overlay (GAEZ crop suitability, Sprint CB/CC) and point-value soil queries (LIO + CanSIS + ISRIC point API), but no way to visualize soil properties *spatially* before clicking a site. The operator asked for a soil-depth overlay; the scope was widened in planning to a five-property family (bedrock depth, pH, organic carbon, clay, sand) so pH / texture / OC drop in with only a manifest entry + ramp.

SoilGrids v2.0 exposes a REST point API at `rest.isric.org` but **no WMS/WCS endpoint** for tiled overlays. Consistent with the GAEZ decision (2026-04-20), the only path to spatial visualization is to host the COGs ourselves.

## Decision

Clone the GAEZ architecture end-to-end for SoilGrids, with three deliberate deltas:

1. **Manifest keyed on a single `property` string** (not a 4-tuple `crop × water × input × variable`). The ingest produces 5 rasters, not 96.
2. **No JWT gate on `/raster/:property`.** SoilGrids is CC BY 4.0 (permissive attribution-only), unlike FAO's CC BY-NC-SA 3.0 IGO which drove the auth gate in Sprint CC. The attribution string is surfaced on every response (`ISRIC SoilGrids v2.0 — CC BY 4.0`) and the picker legend.
3. **Per-property color ramps** instead of a single mode-switched pair. Five ramps (`sequential_earth`, `diverging_ph`, `sequential_carbon`, `sequential_clay`, `sequential_sand`) live in `apps/web/src/features/map/soilColor.ts`, each a `(range) => { valueToRgba, swatches }` factory so legend labels come out unit-aware.

Serve via:

- **Fastify routes:** `GET /api/v1/soilgrids/{query?lat&lng, catalog, raster/:property}` — clone of `/gaez/*` with the 4-tuple parameters collapsed to `property`. Range-request logic identical.
- **Service:** `SoilGridsRasterService` in `apps/api/src/services/soilgrids/`, using `geotiff.js` with local FS (dev) or HTTPS/S3 (prod) via `SOILGRIDS_S3_PREFIX`.
- **Frontend:** `SoilOverlay` + `SoilMapControls` in `apps/web/src/features/map/SoilOverlay.tsx`. Canvas-source + raster-layer lifecycle tied to `useMapStore.visibleLayers.has('soil_properties')`, same pattern as GAEZ. Picker floats at `right: 260` so it sits next to the GAEZ picker at `right: 12`.
- **Panel toggle:** new row in `MapLayersPanel` that flips `visibleLayers` via `setLayerVisible('soil_properties', …)` rather than MapLibre `setLayoutProperty`, since the overlay self-manages its MapLibre layer.

## Alternatives Considered

1. **Defer indefinitely** — leaves spatial soil intelligence permanently absent. Rejected: operator asked explicitly, and the work is a near-copy of GAEZ.
2. **Proxy ISRIC's `rest.isric.org` point API tile-by-tile** — N² requests per visible viewport, rate-limit risk, catastrophic latency. Rejected.
3. **Render from CanSIS / LIO tiled services** — Ontario + Canada only; loses the global-coverage property the overlay is meant to establish.
4. **Inline a third-party tile provider (MapTiler SoilGrids add-on, etc.)** — subscription cost, no global coverage guarantee across all five properties, couples our map to a vendor.

## Consequences

- **Disk footprint** — US+CA clip (lat 24–72, lng -168 to -52) keeps the five COGs under ~1 GB total. Full global would be ~10× and unnecessary for v1 (project boundaries are US/CA).
- **License obligation** — CC BY 4.0 attribution only. Picker legend shows "ISRIC SoilGrids v2.0 · CC BY 4.0" at all times; attribution also returned on `/catalog` and `/query`. No commercial/ND restriction to track on the launch checklist.
- **Ingest requires GDAL.** The `gdal_translate -projwin` recipe is documented in `apps/api/data/soilgrids/README.md`. A workstation without GDAL cannot complete the ingest locally (same as GAEZ).
- **Opens the door for a third overlay family.** The `LayerType` + store-slice + overlay-component + picker-panel + `MapLayersPanel` row pattern is now established in duplicate (GAEZ, SoilGrids). A shared `useRasterOverlay(…)` hook could be extracted when the third one lands; not yet.

## Implementation Scope (landed in Sprint CD)

- `apps/api/src/services/soilgrids/SoilGridsRasterService.ts`
- `apps/api/src/routes/soilgrids/index.ts`
- `apps/api/src/tests/soilgridsRoutes.test.ts` (18 tests)
- `apps/api/data/soilgrids/{README.md, cog/soilgrids-manifest.example.json}`
- `apps/api/src/{app.ts, lib/config.ts}` — plugin registration + env config
- `apps/web/src/features/map/{SoilOverlay.tsx, soilColor.ts}`
- `apps/web/src/features/map/{MapView.tsx, LayerPanel.tsx}` — mount + label/icon
- `apps/web/src/store/mapStore.ts` — `soilSelection` slice
- `apps/web/src/components/panels/MapLayersPanel.tsx` — overlay toggle row
- `packages/shared/src/constants/dataSources.ts` — `'soil_properties'` LayerType

## Deferred

- SoilGrids COG ingest (requires GDAL on the target machine — not available on the authoring workstation).
- Empty-catalog polish in `SoilOverlay` (skip the default `bedrock_depth` fetch when `catalog.entries` is empty).
- Point-query cross-check between overlay pixels and the Site Intelligence panel's bedrock depth (requires ingest).
- Screenshot-based visual parity check with GAEZ picker (preview screenshot tool was unresponsive; verification used DOM snapshots).

## References

- [Sprint CB operation log](../log.md#2026-04-20--sprint-cb-map-side-gaez-v4-suitability-overlay) — overlay architecture template
- [Sprint CC operation log](../log.md#2026-04-21--sprint-cc-gaez-overlay-hardening-hover-readout--yield-mode--raster-auth) — hover-readout, auth-gate patterns
- [2026-04-20 GAEZ self-hosting decision](2026-04-20-gaez-self-hosting.md) — sibling decision this one mirrors
- ISRIC SoilGrids v2.0 — https://soilgrids.org — CC BY 4.0
