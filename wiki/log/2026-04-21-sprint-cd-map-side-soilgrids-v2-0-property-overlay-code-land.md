# 2026-04-21 — Sprint CD: map-side SoilGrids v2.0 property overlay (code landed; ingest deferred)


Second raster overlay, mirroring Sprint CB/CC's GAEZ architecture for ISRIC SoilGrids v2.0. Operator can toggle "Soil Properties" in `MapLayersPanel`, pick from five properties (bedrock depth, pH, organic carbon, clay, sand) in a floating panel, and see the selected property painted across the world at 250 m. Differs from GAEZ in three intentional ways: (1) manifest is keyed on a single `property` string, not a 4-tuple; (2) the raster endpoint is **not** JWT-gated because SoilGrids is CC BY 4.0 (permissive) — unlike FAO's CC BY-NC-SA 3.0 IGO; (3) per-property color ramps (5 distinct hues) instead of a single mode-switched pair.

**Backend (`apps/api`).**
- `services/soilgrids/SoilGridsRasterService.ts` — clone of `GaezRasterService` with the lookup key simplified to `property`. Manifest at `data/soilgrids/cog/soilgrids-manifest.json`; `fromFile` for local, `fromUrl` for S3 (`SOILGRIDS_S3_PREFIX`). `query(lat, lng)` samples all manifest entries in parallel, applying each entry's optional `scale` factor before returning `{ readings: [{property, value, unit}, ...] }`. GDAL no-data sentinel recognized via `image.getGDALNoData()`.
- `routes/soilgrids/index.ts` — `/query?lat=&lng=`, `/catalog`, `/raster/:property`. Zod validates lat/lng. Range-request logic is identical to GAEZ (206 Partial Content, 416 for malformed/past-EOF, `Accept-Ranges: bytes`). Manifest lookup is the single trust boundary — user-supplied `property` never concatenates into a filesystem path.
- `lib/config.ts` — `SOILGRIDS_DATA_DIR` (default `./data/soilgrids/cog`), `SOILGRIDS_S3_PREFIX` (optional, empty string → undefined).
- `app.ts` — plugin registration at `/api/v1/soilgrids` and a `initSoilGridsService()` init block that logs enabled/disabled based on manifest presence.
- `tests/soilgridsRoutes.test.ts` — 18 new tests mirroring `gaezRoutes.test.ts`: 3 validation + 4 service-interaction + 2 catalog + 9 raster (happy + range + 416 + 404 paths + "no auth gate" assertion). All 18 green. Full API suite 389/389 (was 371/371).
- `data/soilgrids/README.md` + `data/soilgrids/cog/soilgrids-manifest.example.json` — ingest recipe (`gdal_translate -projwin -168 72 -52 24 -co COMPRESS=DEFLATE -co TILED=YES -co COPY_SRC_OVERVIEWS=YES /vsicurl/https://files.isric.org/...`) and manifest shape. Real manifest is gitignored.

**Frontend (`apps/web`).**
- `packages/shared/src/constants/dataSources.ts` — `'soil_properties'` added to `LayerType` union and excluded from `Tier1LayerType`.
- `store/mapStore.ts` — `SoilSelection { property: string }` + `soilSelection` / `setSoilSelection`. Mirrors `gaezSelection` shape; null until the overlay first becomes visible, then seeded from `/catalog`.
- `features/map/soilColor.ts` — `SOIL_RAMPS` record keyed by `SoilRampId` (`sequential_earth` / `diverging_ph` / `sequential_carbon` / `sequential_clay` / `sequential_sand`). Each ramp is a `(range: [min, max]) => { valueToRgba, swatches }` factory so legend labels come out unit-aware. `rampGradientCss(ramp)` builds the CSS gradient for the legend strip. α = 140/255 to match GAEZ.
- `features/map/SoilOverlay.tsx` — `<SoilOverlay>` and `<SoilMapControls>`. Canvas-source + raster layer IDs `soil-properties-source` / `soil-properties-layer`, inserted before the first `symbol` layer so labels stay above the overlay. Decode effect fetches `/api/v1/soilgrids/raster/:property` via `geotiff.js` `fromUrl` with Range requests, paints a 4320×2160 offscreen canvas using the selected ramp, then `src.play(); src.pause()` to force MapLibre to re-read. `raster-opacity: 0.60` (slightly below GAEZ 0.65 so hillshade reads). Hover tooltip rAF-throttles pixel reads and shows `{label} · {formatted value}` with per-property `scale` applied. Controls panel positions at `right: 260` to sit left of the GAEZ picker at `right: 12`.
- `features/map/LayerPanel.tsx` — `LAYER_LABELS` + `LAYER_ICONS` gained entries for `soil_properties` (required by the `Record<LayerType, string>` exhaustiveness, caught by tsc).
- `components/panels/MapLayersPanel.tsx` — new overlay row `{ key: 'soil_properties', label: 'Soil Properties', desc: 'SoilGrids depth, pH, organic carbon, texture' }`. Unlike the existing overlay rows (which toggle MapLibre layers via `setLayoutProperty`), this one flips `visibleLayers` on the store via `setLayerVisible('soil_properties', …)` — the overlay component self-manages its MapLibre layer lifecycle, so the panel is just a store switch. Eye icon reads its state from `visibleLayers.has('soil_properties')` rather than local `overlayStates`.
- `features/map/MapView.tsx` — `<SoilOverlay map={mapRef} />` + `<SoilMapControls />` mounted inside a dedicated `<ErrorBoundary>` after the GAEZ pair (both source/layer IDs distinct, no MapLibre-source collision when both are on).

**Verification (no-manifest mode).** GDAL is not installed on this workstation, so the ingest step is deferred to a machine that has it. Verified end-to-end that the code path survives the "no raster data" case gracefully:
- `curl /api/v1/soilgrids/catalog` → `{entries:[], count:0, attribution:"…CC BY 4.0"}`
- `curl /api/v1/soilgrids/query?lat=43.55&lng=-79.66` → `{fetch_status:"unavailable", message:"SoilGrids rasters not loaded — see apps/api/data/soilgrids/README.md"}`
- `curl /api/v1/soilgrids/raster/bedrock_depth` → 404 JSON
- Toggled `visibleLayers` to include `soil_properties` via the zustand store; `<SoilMapControls>` rendered the empty-manifest state cleanly: "SoilGrids rasters not ingested on this deployment." + "ISRIC SoilGrids v2.0 · CC BY 4.0". No console errors. Network shows the expected harmless 404 on the raster fetch (the overlay still attempts the default `bedrock_depth` fetch even when the catalog is empty — a small polish item, not a crash).
- `tsc --noEmit` clean for `@ogden/api`, `@ogden/web`, `@ogden/shared`.
- `apps/web` Vite production build succeeds (sw.js + 107 precache entries).
- `apps/api` `tsc` build succeeds.
- API vitest: 31 files / 389 tests all green.

**Deferred (does not block code landing).**
- **SoilGrids COG ingest.** Runs on a machine with GDAL installed. Plan: `gdal_translate -projwin -168 72 -52 24 -co COMPRESS=DEFLATE -co TILED=YES -co COPY_SRC_OVERVIEWS=YES /vsicurl/https://files.isric.org/soilgrids/latest/data/<layer>/<layer>.vrt <out>.tif` for BDRICM, phh2o 0-30cm, soc 0-30cm, clay 0-30cm, sand 0-30cm. Populate `apps/api/data/soilgrids/cog/soilgrids-manifest.json` with min/max from `gdalinfo -stats`. Total disk footprint estimated <1 GB across the 5 clipped rasters.
- **Empty-catalog polish.** `SoilOverlay` should skip the `bedrock_depth` default fetch when `catalog.entries` is empty, to avoid the cosmetic 404 in the network tab.
- **Preview-mode screenshot.** The Claude Preview screenshot tool was unresponsive during this session; verification used DOM snapshots + network inspection instead. Visual parity with GAEZ picker hasn't been eyeballed yet; once rasters land, do a side-by-side screenshot run.
- **Point-query cross-check.** Click a parcel, confirm the Site Intelligence panel's bedrock depth (from `lioFetchSoils` / `fetchSoilGrids`) falls within the same color class as the overlay at that pixel. Requires ingest first.

**Commits (pending user approval to commit).**
- `feat(api): add /soilgrids/{catalog,query,raster} routes + SoilGridsRasterService`
- `feat(web): map-side SoilGrids property overlay with per-property ramps + picker`
- `docs(wiki): log Sprint CD — SoilGrids overlay code landed, ingest deferred`
