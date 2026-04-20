# 2026-04-20 — FAO GAEZ v4 self-hosting for Atlas point queries

**Status:** Accepted
**Sprint:** BI
**Context source:** Wiki (entities/gap-analysis.md, entities/api.md, entities/data-pipeline.md)

---

## Context

FAO GAEZ v4 (Global Agro-Ecological Zones) is the authoritative global
crop-suitability + attainable-yield dataset at ~5 arc-minute (~9 km)
resolution. It is the final data-side gap in Cat 12 (Global Data Coverage)
that Atlas could plausibly close without paid or registered-key data.

GAEZ v4 exposes **no public REST or WMS/WFS endpoint for point queries**.
The portal (`gaez.fao.org`) requires click-through license acceptance and
hands out bulk GeoTIFF downloads. To surface GAEZ values in Atlas site
reports we must host the rasters ourselves and query them server-side.

## Decision

Self-host a curated subset of GAEZ v4 **Theme 4 (Suitability + Attainable
Yield)**, current-climate baseline (1981–2010), for 12 staple crops × 4
management regimes (rainfed/irrigated × low/high input) = **96 rasters**
(~2–6 GB pre-COG, ~1–3 GB post-COG).

Serve point queries via:

- **New Fastify route:** `GET /api/v1/gaez/query?lat=&lng=` (unauth, public).
- **New service:** `GaezRasterService` in `apps/api/src/services/gaez/`.
  Uses `geotiff.js` (already a dep) for COG byte-range reads. Transparent
  dual backend — local FS (dev) or HTTPS/S3 (prod) via `GAEZ_S3_PREFIX`.
- **Ingest script:** `apps/api/scripts/convert-gaez-to-cog.ts` shells out
  to `gdal_translate -of COG` and emits a manifest JSON. Operator-facing
  README at `apps/api/scripts/ingest-gaez.md` documents the one-time
  download + convert flow.
- **Frontend adapter:** `fetchGaezSuitability(lat, lng)` in `layerFetcher.ts`
  calls the API and emits a `gaez_suitability` LayerType with per-crop
  suitability class + attainable yield + derived summary (best crop, top-3,
  primary class).

## Alternatives Considered

1. **Defer indefinitely** (status quo) — leaves a documented global-coverage
   gap. Rejected: user explicitly requested infrastructure sprint to close
   the last substantive gap and unlock future raster-backed layers.
2. **Proxy/scrape GAEZ portal** — portal ToS and click-through license make
   this legally and operationally fragile.
3. **Use `gdal-async` Node bindings** for raster I/O — pre-builds exist for
   win32 but the install story is brittle. Rejected in favour of pure-JS
   `geotiff.js` which is already in the dep tree (used by
   `ElevationGridReader`).
4. **Pre-compute point-wise JSON cache** (lat/lng grid → precomputed values)
   — infeasible at global scale; COG byte-range reads are fast enough for
   on-demand queries.

## Consequences

### Positive

- Closes Cat 12 gap #3 (FAO GAEZ v4). Cat 12 → 8/10, total → ~119/120.
- Establishes raster-hosting infrastructure reusable for future Cat 12
  items (Fan et al. groundwater static raster, ESDAC when keys are acquired)
  and for any future high-fidelity raster layer.
- Manifest-driven design means expanding to more crops / climate scenarios
  is a data-only operation (drop files, rerun script, no code change).
- Graceful absence: deployments without the ingest step see a clear
  "GAEZ not loaded" informational layer, not a silent gap or 500.

### Negative / Risks

- **Operational burden:** someone (the operator) must run the manual
  download + conversion step per deployment. Documented in
  `scripts/ingest-gaez.md`.
- **Disk footprint:** ~1–3 GB per deployment. Acceptable.
- **License — CC BY-NC-SA 3.0 IGO:** the **NC (non-commercial) clause** may
  conflict with Atlas's eventual commercial posture. Current pre-launch
  research/planning deployment is compatible, but **legal review is
  required before commercial launch.** Marked as a pre-launch blocker.
- **First-request latency:** each COG requires a header read on first
  access. Mitigated by per-file LRU cache in `GaezRasterService`. Optional
  future optimization: preload headers on worker ready.

## Open Follow-ups

- [ ] Legal review of CC BY-NC-SA 3.0 IGO implications prior to any
      commercial deployment (flag in launch checklist)
- [ ] Production S3 upload + `GAEZ_S3_PREFIX` env config at deploy time
- [ ] Optional: preload COG headers on API ready to eliminate first-query
      cold start (currently ~200–400 ms)
- [ ] Optional expansion: add climate-projection scenarios (RCP4.5/RCP8.5
      2041-2070) once baseline verified in production
