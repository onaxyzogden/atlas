# 2026-04-21 — Sprint CC: GAEZ overlay hardening (hover readout + yield mode + raster auth)


Three polish/hardening items on top of the Sprint CB foundation — all landing in the same files CB touched, committed as three focused commits. None of them are Sprint CD (RCP ingest), which remains deferred to its own planning pass.

**Backend (`apps/api`).**
- `routes/gaez/index.ts` — `/raster/:crop/:waterSupply/:inputLevel/:variable` gains `preHandler: [fastify.authenticate]`. `/catalog` (manifest digest) and `/query` (single-pixel) stay public. Rationale: FAO GAEZ v4 is CC BY-NC-SA 3.0 IGO; streaming raw FAO bytes to anonymous clients is the passive-scrape surface we can close cheaply. The NC-clause business decision itself stays tracked on `wiki/LAUNCH-CHECKLIST.md`.
- `tests/gaezRoutes.test.ts` — 3 new tests (401 no header / 401 malformed / 200 valid JWT) inside the existing raster `describe`. Existing happy-path raster tests gained a helper `authHeader()` that mints a test JWT via `app.jwt.sign({ sub: 'test-user', email: 't@t' })`. Suite: 371/371 green (was 368/368).

**Frontend (`apps/web`).**
- `store/mapStore.ts` — `GaezSelection` grows `variable: 'suitability' | 'yield'` (new `GaezVariable` type). Added `gaezMaxYield` + `setGaezMaxYield()` — the decode effect publishes the per-tile 99th-percentile yield so the Legend can render "~N kg/ha" without a cross-component ref.
- `features/map/gaezColor.ts` — `yieldToRgba(value, maxYield)` + `YIELD_GRADIENT_CSS`. 5-stop viridis-ish ramp (deep purple → blue → teal → green → yellow), linear interp, α≈140/255 so mode-flipping feels consistent. Negative values / NaN → transparent (catches FAO in-band `-1` sentinel).
- `features/map/GaezOverlay.tsx` — major growth in three axes:
  1. **Hover readout.** New `rasterStateRef` captures `{band, width, height, originX, originY, xRes, yRes, noData, variable, maxYield, selection}` at the end of every decode. A new `mousemove`/`mouseleave` effect converts `e.lngLat` → pixel indices via `floor((lng - originX) / xRes)` / `floor((lat - originY) / yRes)` and renders a small fixed-position tooltip (rAF-gated to coalesce 60Hz bursts). Tooltip text mirrors the Site Intelligence panel's GAEZ section: `crop water input · S2` in suitability mode, `crop water input · 5,400 kg/ha` in yield mode. Border color = class swatch (suitability) or ramp color (yield).
  2. **Yield-gradient paint.** Decode effect branches on `selection.variable`. Suitability path unchanged. Yield path samples the band at ~10k points, sorts, takes the 99th percentile as `maxYield`, and paints with `yieldToRgba(v, maxYield)`. `rasterUrl()` now uses `selection.variable` instead of hardcoded `'suitability'`. Sparse-tile fallback: fewer than 100 samples → `maxYield = max(samples)`.
  3. **JWT auth.** Reads `useAuthStore((s) => s.token)` and forwards it as `Authorization: Bearer ...` on both the catalog fetch and the geotiff.js `fromUrl(url, { headers })` call. Verified ahead of time: `RemoteSourceOptions.headers` propagates through geotiff's internal fetch (`node_modules/geotiff/dist-module/source/remote.d.ts`). Unauthenticated catalog fetches surface via the existing "Catalog failed: …" error string.
- `GaezMapControls` — new `<ModeToggle>` segmented-button pair (Class / Yield). Legend swaps between discrete suitability swatches and a continuous gradient strip with `0` / `~N kg/ha` labels (pulled from `useMapStore.gaezMaxYield`).

**Verification.**
- `cd apps/api && npx vitest run` → 371/371 green.
- `cd apps/web && npx tsc --noEmit` → 0 errors.
- Manual (dev): toggle GAEZ, confirm overlay unchanged from CB, hover Iowa → tooltip reads "maize rainfed high · S1"; flip mode → viridis ramp, Iowa bright, Sahara transparent, tooltip reads "maize rainfed high · ~12,000 kg/ha"; log out + refresh → "Catalog failed: 401" surfaces without crash.

**Deferred (Sprint CD and later).** RCP future-scenario ingest (own plan); Web Worker decode offload; per-zoom resolution tiers; side-by-side crop compare / delta viz; touch-device hover equivalent; per-crop calibrated yield ceilings (tile-derived 99th percentile is MVP); per-user rate-limiting on `/raster/*` beyond the global `rateLimit`. FAO NC-license business decision itself stays the launch blocker.

**Commits:**
- `feat(api): require auth on /gaez/raster/:crop/...`
- `feat(web): GAEZ overlay hover readout + yield-gradient mode`
- `docs(wiki): log Sprint CC — GAEZ overlay hardening`
