# ADR — Pollinator Corridor: Raster Sample + Polygonisation Toolchain

**Date:** 2026-05-05
**Status:** Accepted
**Refines:** [`2026-05-04-pollinator-corridor-hybrid-landcover.md`](2026-05-04-pollinator-corridor-hybrid-landcover.md) (8.1-A) — locks raster-sample toolchain, hosting layout, and CRS handling. [`2026-05-04-pollinator-corridor-polygonize-friction.md`](2026-05-04-pollinator-corridor-polygonize-friction.md) (8.1-B) — locks the polygonisation tool, simplification rule, and storage strategy left open in `polygonizeBbox(parcel, bufferKm)`.
**Scope:** New raster-sample helpers under `apps/api/src/services/landcover/` (mirrors `services/soilgrids/` and `services/gaez/`); `packages/shared/src/ecology/polygonizeBbox.ts` implementation contract; tile layout under `data/landcover/<source>/<vintage>/`; one new env var (`LANDCOVER_S3_PREFIX`); GDAL Python tooling requirement (`gdal_polygonize.py`).

---

## Context

8.1-A's three land-cover adapters (NLCD/ACI/WorldCover) and 8.1-B's
`polygonizeBbox` library function were both spec'd with the data
contract locked but the **toolchain left implicit**: which library
reads the COGs, where the tiles live, which command polygonises them,
how simplification works, and whether polygonised friction surfaces
get persisted. Without those decisions, two engineers picking up
8.1-A and 8.1-B in parallel will diverge on the basics.

Atlas already has two raster-sample precedents that this ADR mirrors
rather than re-derives:

| Service | Pattern |
|---|---|
| `apps/api/src/services/soilgrids/SoilGridsRasterService.ts` | Manifest on boot; per-property COGs accessed via `geotiff.js` `fromFile` (local) / `fromUrl` (S3). Byte-range reads only; never loads the full raster. |
| `apps/api/src/services/gaez/GaezRasterService.ts` | Same pattern; per-crop suitability COGs sampled at parcel centroid. |

And one polygonisation precedent in the ingest tier:

| Job | Pattern |
|---|---|
| `apps/api/src/jobs/cpcad-ingest.ts` (8.2-B.4, 2026-05-04) | Shells out to `ogr2ogr` via `child_process.spawn`; streams `GeoJSONSeq` from stdout; per-feature UPSERT. Operator points `GDAL_BIN_DIR` at the GDAL install. |

Both precedents are working in production. This ADR carries them
forward rather than introducing a third pattern.

## Decision

### D1 — 8.1-A is **raster-sample only**, not polygonise

The hybrid land-cover ADR's `LandCoverSummary.classes` (per-class
percentage histogram) is fully derivable from a raster-sample over
the parcel polygon — **no polygonisation required at 8.1-A**.
Polygonisation is exclusively an 8.1-B concern (friction surface
input to the patch-graph LCP).

Concretely, `NlcdLandCoverAdapter.fetchForBoundary(parcel)` returns:

```ts
{
  layerType: 'land_cover',
  source: 'NLCD',
  confidence: 'high',
  attributionText: 'USGS National Land Cover Database 2021 (Public Domain)',
  summaryData: {
    classes: { /* canonicalClass → percent */ },
    dominantClass: '...',
    vintage: 2021,
    licence_short: 'USGS-PD',
    pixelCount: <number>,        // sample fidelity
    samplingMethod: 'raster',    // distinguishes from future vector ingest
  },
}
```

No `Feature[]` returned. No vector ingest. ACI and WorldCover
adapters return the same shape with their respective sources.

**Consequence:** 8.1-A unblocks today on the existing `geotiff.js`
toolchain. No GDAL runtime dependency required for the API server
to serve land-cover summaries.

### D2 — Raster-sample toolchain: `geotiff.js` against per-vintage COGs

Each adapter mounts a `LandCoverRasterService` (one per source) at
construction:

```
apps/api/src/services/landcover/
  NlcdRasterService.ts         // ./data/landcover/nlcd/2021/*.tif
  AciRasterService.ts          // ./data/landcover/aci/<year>/*.tif
  WorldCoverRasterService.ts   // ./data/landcover/worldcover/2021/*.tif
```

- Library: **`geotiff.js`** (`fromFile` for local, `fromUrl` for S3 mirror). Same library as `SoilGridsRasterService` and `GaezRasterService`.
- Tile layout: `data/landcover/<source>/<vintage>/<tile>.tif`. Per-vintage subdirectory makes vintage swap a directory rename (no DB changes, no code changes).
- Optional S3 override via `LANDCOVER_S3_PREFIX` env var (e.g. `s3://atlas-data/landcover/`); falls back to local `./data/landcover/` when unset. Mirrors `SOILGRIDS_S3_PREFIX` / `GAEZ_S3_PREFIX`.
- Manifest: each service builds a tile-index manifest at boot (filename → bbox); per-request, the parcel bbox intersects the manifest to pick the 1-N tiles to byte-range read. Same precedent as SoilGrids per-property manifest.

### D3 — Source CRS and reprojection point

Per-source native CRS:

| Source | Native CRS | Authority |
|---|---|---|
| NLCD | EPSG:5070 (Albers Equal Area Conic CONUS) | USGS NLCD product spec |
| ACI | EPSG:3347 (Statistics Canada Lambert Conformal Conic) | AAFC ACI product spec |
| WorldCover | EPSG:4326 (geographic, native) | ESA WorldCover product spec |

**Reprojection happens at the boundary, not at ingest.** The parcel
polygon (EPSG:4326 in PostGIS) is reprojected into the source CRS
**at sample time** using `proj4` (already a `geotiff.js` peer dep);
the raster stays in its native projection on disk. This avoids the
storage cost of reprojecting CONUS-scale rasters and matches the
`SoilGridsRasterService` precedent (which keeps SoilGrids COGs in
their native EPSG:4326 Homolosine).

For 8.1-B polygonisation (D5), the reverse path applies: GDAL
polygonises the tile in its native CRS, then `ST_Transform(geom,
4326)` runs at the PostGIS boundary before the polygons are passed
to the friction surface.

### D4 — Tile acquisition (operator job, not API server)

NLCD and WorldCover ship as country/global mosaics. ACI ships as
provincial tiles. Per-vintage acquisition is an **ingest-tier
operator job**, not an API-server hot path:

```
apps/api/src/jobs/landcover-tile-ingest.ts
```

The job downloads + (if needed) cogifies the source rasters into
`./data/landcover/<source>/<vintage>/`. It runs once per vintage
(NLCD ≈ every 3 years; ACI annual; WorldCover annual). Same
operator-runs-once precedent as `cpcad-ingest.ts`.

Out of scope for this ADR: writing the actual ingest job.
Documented here so a follow-up implementer doesn't conflate
"tiles need to land somewhere" with "the API server downloads
them per request".

### D5 — Polygonisation toolchain (8.1-B): `gdal_polygonize.py` shell-out

`packages/shared/src/ecology/polygonizeBbox.ts` is a **library
function with a thin Node implementation** (Sharp-based or pure-JS
contour tracing) for fixture tests, but production runs delegate
to GDAL via shell-out from the Tier-3 processor:

```ts
// inside PollinatorOpportunityProcessor (Tier-3 worker)
const tile = await rasterService.clipToBbox(parcel, bufferKm);  // tmpdir GeoTIFF in source CRS
const vector = await polygonizeWithGdal(tile);                  // tmpdir GeoJSON in source CRS
const reprojected = await db`SELECT ST_Transform(ST_GeomFromGeoJSON(${vector}), 4326) ...`;
```

**Tool:** `gdal_polygonize.py` (a thin wrapper around GDAL's
`Polygonize()`). Operator-installed alongside the existing GDAL
binaries that `cpcad-ingest.ts` already requires; no new
runtime dependency at the *fleet* level.

**Why not alternatives:**

- **PostGIS `ST_DumpAsPolygons`** — requires the `postgis_raster`
  extension (which Atlas doesn't enable) and full-raster
  polygonisation is heavy. Rejected.
- **`rasterio.features.shapes` (Python)** — would add a Python
  runtime to the API container. Rejected; we already have GDAL
  via `cpcad-ingest`.
- **Pure-JS contour tracing (e.g. `d3-contour`)** — feasible for
  fixture tests but slow on real-world parcel-sized clips and
  produces lower-quality polygons. Kept as the dev/test fallback,
  not the production path.

**Output CRS:** Polygonisation runs in the source raster's native
CRS (D3); reprojection to EPSG:4326 happens via PostGIS
`ST_Transform` after the GeoJSON lands. Avoids the `gdal_polygonize.py`
known issue of producing artefacts when the input raster is
reprojected on-the-fly.

### D6 — Simplification rule

After polygonisation, before passing polygons to the friction
surface, simplify with `ST_SimplifyPreserveTopology(geom, tolerance_m)`:

| Source | Tolerance | Rationale |
|---|---|---|
| NLCD | 30 m | Native pixel resolution; preserve full fidelity at the resolution limit. |
| ACI | 30 m | Native pixel resolution. |
| WorldCover | 10 m | Native pixel resolution. |

`ST_SimplifyPreserveTopology` (vs. `ST_Simplify`) ensures adjacent
polygons stay adjacent — critical for the patch-graph LCP in 8.1-C
where shared edges define the graph topology.

### D7 — Storage: ephemeral per-parcel, not persisted

Polygonised + simplified friction surfaces are **computed in-memory
in 8.1-B's processor and dropped on job completion**. Same trade
the polygonize-friction ADR locked at "tile cache is per-job tmpdir";
this ADR extends that to the polygonised vectors as well.

**Why not persist:**

1. Polygons are a function of `(parcel, vintage, source)` — re-derivable any time. Persistence is a cache, not a source of truth.
2. Vintage updates would require either invalidating cached polygons or accepting drift. Both have ops cost.
3. Pollinator-opportunity is Tier-3; recompute frequency is low.
4. Storage cost of polygonised friction surfaces for thousands of parcels would dominate the database.

If a future profiling pass shows polygonisation is the Tier-3
bottleneck, the cache can be added later as a non-breaking change
(swap the in-memory result for a `pollinator_friction_cache`
PostGIS table keyed by `(parcel_id, source, vintage)`). Not now.

### D8 — `polygonizeBbox` signature lock

```ts
// packages/shared/src/ecology/polygonizeBbox.ts
export async function polygonizeBbox(
  parcel: Feature<Polygon>,
  options: {
    source: 'NLCD' | 'ACI' | 'WorldCover';
    bufferKm?: number;          // default POLLINATOR_BUFFER_KM = 2
    rasterService: LandCoverRasterService;  // injected; per-source
    db: Sql;                    // for ST_Transform boundary
  },
): Promise<{
  features: Feature<Polygon, { classId: string; source: string; vintage: number; areaM2: number }>[];
  vintage: number;
  source: string;
  pixelCount: number;
  polygonizeMs: number;         // for telemetry / fallback timeout
}>;
```

The `rasterService` injection makes the function testable without
touching the file system; fixtures inject a stub service.

## Consequences

**Positive.**
- 8.1-A unblocked on `geotiff.js` only. NLCD/ACI/WorldCover adapters can land before the polygonisation toolchain ships.
- 8.1-B's `polygonizeBbox` has a concrete production toolchain (`gdal_polygonize.py` + PostGIS `ST_Transform` + `ST_SimplifyPreserveTopology`) without inventing a third pattern.
- Tile layout (`data/landcover/<source>/<vintage>/`) is operator-rotateable: drop new tiles into a new vintage subdirectory, restart the worker, done.
- Mirrors two existing services + one existing ingest job; no new architectural surface.

**Negative.**
- GDAL becomes a *Tier-3 worker* runtime dependency (it was already a *one-shot ingest* dependency via `cpcad-ingest.ts`). Mitigation: same `GDAL_BIN_DIR` env var pattern; fail loud at worker boot if missing.
- Per-vintage tile storage (~5 GB NLCD + ~30 GB ACI per year + ~3 GB WorldCover) is non-trivial. Mitigation: S3 prefix override + per-vintage swap means production can keep one vintage hot at a time.
- Reprojection at sample time costs CPU per request; this is the same trade SoilGrids already accepted.

**Neutral.**
- No `computeScores.ts` change.
- No DB schema change. Polygonised surfaces stay ephemeral.
- No new env vars except `LANDCOVER_S3_PREFIX` (optional).

## Implementation slicing

This ADR doesn't add a new phase; it locks the toolchain so the
existing 8.1-A and 8.1-B slices can land:

1. **8.1-A.1 — `LandCoverRasterService` per source + adapters.** Three services + three adapters following the SoilGrids precedent. Tests use fixture COGs.
2. **8.1-A.2 — Country-resolver registry update.** Already spec'd in the hybrid ADR; toolchain choice doesn't change this slice.
3. **8.1-A.3 — Per-feature `samplingMethod: 'raster'` provenance.** Schema add to `summary_data.dataSources[]`.
4. **8.1-B.1 — `polygonizeBbox` library + GDAL shell-out helper.** Production path uses `gdal_polygonize.py`; fixture path uses pure-JS fallback.
5. **8.1-B.2 onward — unchanged from polygonize-friction ADR.** Friction derivation, processor swap, summary-data schema update all consume the locked toolchain.

## Operator notes

- **Tile acquisition** is a one-shot per vintage. Document the `landcover-tile-ingest.ts` job alongside `cpcad-ingest.ts` in `wiki/entities/data-pipeline.md` once it ships.
- **GDAL install** — Tier-3 worker container needs `gdal-bin` (Linux apt) or OSGeo4W (Windows dev). Same install footprint as `cpcad-ingest.ts`. Add a worker-boot smoke check that calls `gdal_polygonize.py --version` and refuses to start if missing.
- **CRS sanity** — log the source CRS + parcel-reprojected bbox at sample time; mismatched CRS is the most common cause of "empty raster sample" bugs in `SoilGridsRasterService` history.

## References

- 8.1-A predecessor: [`2026-05-04-pollinator-corridor-hybrid-landcover.md`](2026-05-04-pollinator-corridor-hybrid-landcover.md)
- 8.1-B predecessor: [`2026-05-04-pollinator-corridor-polygonize-friction.md`](2026-05-04-pollinator-corridor-polygonize-friction.md)
- Scoping ADR: [`2026-05-02-raster-pollinator-corridor-scoping.md`](2026-05-02-raster-pollinator-corridor-scoping.md)
- Raster-sample precedents: `apps/api/src/services/soilgrids/SoilGridsRasterService.ts`, `apps/api/src/services/gaez/GaezRasterService.ts`
- GDAL shell-out precedent: `apps/api/src/jobs/cpcad-ingest.ts` (8.2-B.4)
- External-data reference: [`wiki/concepts/external-data-sources.md`](../concepts/external-data-sources.md)
- Canonical class set: `packages/shared/src/ecology/landCoverClasses.ts` (8.1-A.1, 2026-05-04)
- Plan: `.claude/plans/few-concerns-shiny-quokka.md` Phase 8.1
