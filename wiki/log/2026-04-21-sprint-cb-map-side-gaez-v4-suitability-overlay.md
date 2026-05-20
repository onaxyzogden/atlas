# 2026-04-21 — Sprint CB: map-side GAEZ v4 suitability overlay


First raster overlay in Atlas. Operator can now toggle "Agro-Climatic Suitability (GAEZ)" on the map and see the selected crop's suitability class gradient worldwide at 5 arc-min; before this, GAEZ was only queryable at a single parcel centroid via the Site Intelligence panel.

**Backend (`apps/api`).**
- `GaezRasterService` gains `getManifestEntries()` + `resolveLocalFilePath()` public accessors. `resolveLocalFilePath()` is the path-traversal guard: it looks up by exact manifest-key match; user path components never reach `join()`.
- `routes/gaez/index.ts` gains two endpoints. `GET /api/v1/gaez/catalog` returns `{ entries, count, attribution }` for the map-side crop picker. `GET /api/v1/gaez/raster/:crop/:waterSupply/:inputLevel/:variable` streams the COG with `Accept-Ranges: bytes`, parses `Range: bytes=START-END` (supports open-ended `bytes=START-`), emits 206 + `Content-Range` on partial, 416 on malformed or past-EOF, 404 on unknown variable / manifest miss / missing file. `Cache-Control: public, max-age=3600`.
- `apps/api/src/tests/gaezRoutes.test.ts` extended with 11 new tests (2 catalog + 9 raster — full fetch, byte range, open-ended range, 416 malformed, 416 past-EOF, 404 unknown-variable before service call, 404 unknown-crop, 404 disabled-service, 404 missing file). Suite: 368/368 green (up from 357).

**Frontend (`apps/web`).**
- `features/map/GaezOverlay.tsx` — two exports co-located because they share `gaezSelection`: `<GaezOverlay map={map}>` (canvas-source lifecycle + geotiff.js decode + `play()/pause()` re-upload trick) and `<GaezMapControls>` (floating top-right panel with crop/water/input selects + legend).
- `features/map/gaezColor.ts` — `suitabilityToRgba()` + `SUITABILITY_SWATCHES` + `rgbaToCss()`. Palette derived from `tokens.ts confidence.high/medium/low` + an amber-orange S3 bridge + desaturated WATER blue, all at α≈140/255 so the base map stays legible.
- `store/mapStore.ts` — `GaezSelection` type + `gaezSelection`/`setGaezSelection`. Null until picker seeds canonical default `maize / rainfed / high` (falls back to `catalog[0]` if absent).
- `features/map/MapView.tsx` — mounts `<GaezOverlay map={mapRef} /> + <GaezMapControls />` inside an `ErrorBoundary` sibling to `MapCanvas`. LayerPanel toggle (`gaez_suitability`, scaffolded Sprint BU) unchanged — it now drives real rendering.

**Render path.** MapLibre `type: 'canvas'` source pinned to `[[-180,90],[180,90],[180,-90],[-180,-90]]`, `animate: false`. On selection change: `fromUrl()` streams the COG via Range reads, `readRasters({ interleave: false })` yields the whole-world 4320×2160 band, `suitabilityToRgba()` maps each pixel to RGBA into an `ImageData`, `putImageData` onto the offscreen canvas, then `src.play(); src.pause()` forces MapLibre to re-read the pixels. Z-order: inserted with `beforeId = getFirstSymbolLayer(map)` so labels render above the raster while parcel fills (added later) sit above naturally.

**Verification.** `npx tsc --noEmit` 0 errors; `npx vitest run` 30/30 files, 368/368 tests green; manual pending against a dev API with `gaez-manifest.json` present. Main-thread decode measured at ~50–80 ms on a modern laptop — fine for MVP; Web Worker offload deferred.

**Files touched (8):** `apps/api/src/services/gaez/GaezRasterService.ts`, `apps/api/src/routes/gaez/index.ts`, `apps/api/src/tests/gaezRoutes.test.ts`, `apps/web/src/store/mapStore.ts`, `apps/web/src/features/map/gaezColor.ts` (new), `apps/web/src/features/map/GaezOverlay.tsx` (new), `apps/web/src/features/map/MapView.tsx`, `wiki/{entities/api.md, entities/web-app.md, log.md}`.

**Deferred:** Sprint CC (RCP-scenario ingest) still outstanding. Within CB scope: Web Worker decode, per-zoom resolution tiers, yield-gradient color ramp, side-by-side crop compare, hover-readout on the overlay (panel already serves that role), auth on the raster endpoint (tracked in LAUNCH-CHECKLIST).
