# 2026-04-25 — Elevation live-data snake_case/camelCase fix


The Site Intelligence panel "LIVE DATA" row showed `121–201 m` for elevation
on Ontario projects regardless of location, with a "Medium" confidence badge
and a "Live" section header — a deceptive presentation that looked authoritative
but was actually the latitude-based fallback estimate.

### Root cause
The frontend NRCan HRDEM proxy reader at `apps/web/src/lib/layerFetcher.ts`
read its response in camelCase (`d.fetchStatus`, `d.sourceApi`, `d.dataDate`,
`d.rasterUrl`), but the API at `apps/api/src/routes/elevation/index.ts`
emits snake_case (`fetch_status`, `source_api`, `data_date`, `raster_url`,
matching the rest of that payload — `raster_tile`, `original_datum`,
`datum_offset_applied`). The check `d.fetchStatus !== 'complete'` always
tripped (undefined ≠ 'complete'), the `try`/`catch` fell through to
`elevationFromLatitude(lat, lng, country)`, and at lat ≈ 43.48 that returns
`baseElev = 150` ± `[-30, +50]` = **121–201 m** with `confidence: 'medium'`
and `sourceApi: 'Estimated (NRCan HRDEM unavailable)'`. Because climate was
live, the section-level `isLive` flag (any layer live → true) kept the "Live"
badge on, masking the silent fallback.

### Changes
- `apps/web/src/lib/layerFetcher.ts` — `fetchElevationNrcan` now reads
  `d.fetch_status`, `d.source_api`, `d.data_date`, `d.raster_url` to match
  the API payload shape.

### Verification
- `curl /api/v1/elevation/nrcan-hrdem?...` returns 200 with
  `fetch_status: 'complete'`, `source_api: 'NRCan HRDEM Lidar DTM (1m)'`,
  `min_elevation_m: 153`, `max_elevation_m: 195`.
- Browser preview after `localStorage.removeItem('ogden-layer-cache')` and
  reload: elevation row reads `153–195 m` with **High** confidence,
  source `NRCan HRDEM Lidar DTM (1m)`, data date `2026-04-25`.
- Network tab: no `nrcan-hrdem` entries in failed-requests filter
  post-fix.

### Notes
- The lat-based fallback should probably stop reusing
  `confidence: 'medium'` for CA — once the proxy fails it should look like
  fallback, not authoritative. Deferred — not in scope for this fix.
