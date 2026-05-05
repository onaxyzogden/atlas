/**
 * polygonizeBbox — convert a per-pixel land-cover raster clip into a set of
 * class-keyed polygons usable by the corridor-friction surface (8.1-B).
 *
 * Per ADR 2026-05-05-pollinator-corridor-raster-pipeline (D5, D6, D8). The
 * library exposes:
 *
 *   1. A signature-locked async function `polygonizeBbox(parcel, options)`
 *      that production code calls. The actual polygonisation tool is
 *      injected via `options.polygonizer` so the production path can wire
 *      `gdal_polygonize.py` (apps/api/src/services/landcover/polygonizeWithGdal.ts)
 *      while tests inject the pure-JS `polygonizePixelGrid` fallback below.
 *
 *   2. A pure-JS pixel-grid polygoniser (`polygonizePixelGrid`) usable
 *      against tiny fixture rasters in tests. Implements 4-connected
 *      flood-fill grouping per class id, then emits one rectangular-cell
 *      MultiPolygon per group simplified at the pixel resolution. Not
 *      suitable for production parcel-scale clips — gdal_polygonize.py
 *      produces topologically cleaner output.
 *
 * The shared package intentionally does NOT depend on `geotiff.js`,
 * `child_process`, or `postgres` — those live in apps/api. This module
 * deals only in the abstract clip + polygon types.
 */

import type { Feature, Polygon, MultiPolygon } from 'geojson';

// ─────────────────────────────────────────────────────────────────────────
// Public types — locked by ADR D8
// ─────────────────────────────────────────────────────────────────────────

export type LandCoverSourceId = 'NLCD' | 'ACI' | 'WorldCover';

/**
 * Raster clip emitted by a LandCoverRasterService for the parcel bbox in
 * the source's native CRS. The polygoniser consumes this rather than
 * touching the file system, so tests inject synthetic clips.
 */
export interface RasterClip {
  /** Row-major pixel buffer; `pixels[row * width + col]` = native class id. */
  pixels: Int32Array | Uint16Array | Uint8Array;
  width: number;
  height: number;
  /** Bounding box of the clip in the source CRS — [minX, minY, maxX, maxY]. */
  bboxSourceCrs: [number, number, number, number];
  /** Source CRS authority code, e.g. 'EPSG:5070'. */
  sourceCrs: string;
  /** Pixel size [xRes, yRes] in source-CRS units (yRes is positive here). */
  pixelSize: [number, number];
  /** GDAL NoData value for this raster, or null if absent. */
  nodataValue: number | null;
  /** Source vintage year (e.g. 2021). */
  vintage: number;
  /** Source enum value. */
  source: LandCoverSourceId;
}

/**
 * Per-feature properties produced by polygonisation. `classId` is the
 * native source-class integer (NLCD code / ACI code / WorldCover code) —
 * the consumer (`corridorFriction`) maps it to a canonical class via
 * `toCanonicalLandCoverClass`.
 */
export interface PolygonizedClassProps {
  classId: number;
  source: LandCoverSourceId;
  vintage: number;
  areaM2: number;
}

export type PolygonizedFeature = Feature<Polygon | MultiPolygon, PolygonizedClassProps>;

export interface PolygonizeResult {
  features: PolygonizedFeature[];
  vintage: number;
  source: LandCoverSourceId;
  /** Total non-NoData pixels polygonised. */
  pixelCount: number;
  /** Wall-clock spend in the polygoniser. Used by the processor's 60s timeout. */
  polygonizeMs: number;
  /** CRS the features are returned in. Production reprojects to EPSG:4326. */
  crs: string;
}

/**
 * Abstract polygoniser injected into `polygonizeBbox`. The pure-JS
 * fallback below conforms; the GDAL shell-out in apps/api also conforms.
 */
export type Polygonizer = (clip: RasterClip) => Promise<PolygonizeResult>;

/**
 * Abstract clip provider — adapter pattern over LandCoverRasterService so
 * the shared package doesn't need to import the concrete class. apps/api
 * supplies an implementation that calls `rasterService.clipToBbox`.
 */
export type ClipProvider = (
  parcel: Feature<Polygon>,
  bufferKm: number,
) => Promise<RasterClip>;

/**
 * Abstract reprojector — production wires this to PostGIS `ST_Transform`;
 * tests can no-op it (return geometry unchanged) when the source CRS is
 * already EPSG:4326.
 */
export type Reprojector = (
  geom: Polygon | MultiPolygon,
  fromCrs: string,
  toCrs: string,
) => Promise<Polygon | MultiPolygon>;

/**
 * Per ADR D8 — locked signature. Production path:
 *
 *   const features = await polygonizeBbox(parcel, {
 *     source: 'NLCD',
 *     bufferKm: 2,
 *     clipProvider: (p, b) => rasterService.clipToBbox(p, b),
 *     polygonizer: polygonizeWithGdal,
 *     reprojector: postgisStTransform,
 *   });
 */
export interface PolygonizeBboxOptions {
  source: LandCoverSourceId;
  /** Buffer around parcel in km. Default 2 km (`POLLINATOR_BUFFER_KM`). */
  bufferKm?: number;
  clipProvider: ClipProvider;
  polygonizer: Polygonizer;
  /** Optional — when omitted, features are returned in source CRS. */
  reprojector?: Reprojector;
  /** Target CRS for the reprojector. Default 'EPSG:4326'. */
  targetCrs?: string;
}

export const POLLINATOR_BUFFER_KM = 2;

export async function polygonizeBbox(
  parcel: Feature<Polygon>,
  options: PolygonizeBboxOptions,
): Promise<PolygonizeResult> {
  const bufferKm = options.bufferKm ?? POLLINATOR_BUFFER_KM;
  const clip = await options.clipProvider(parcel, bufferKm);
  const result = await options.polygonizer(clip);

  if (options.reprojector && clip.sourceCrs !== (options.targetCrs ?? 'EPSG:4326')) {
    const targetCrs = options.targetCrs ?? 'EPSG:4326';
    const reprojected: PolygonizedFeature[] = [];
    for (const f of result.features) {
      const newGeom = await options.reprojector(f.geometry, clip.sourceCrs, targetCrs);
      reprojected.push({ ...f, geometry: newGeom });
    }
    return { ...result, features: reprojected, crs: targetCrs };
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────
// Pure-JS pixel-grid polygoniser (fixture / test path)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Walk the pixel grid and emit one MultiPolygon per (classId) group.
 * Each polygon is the union of pixel-cell rectangles for that class.
 *
 * Output coordinate space: source CRS (same as `clip.bboxSourceCrs`).
 *
 * NOT a topology-preserving polygoniser — adjacent cells of the same
 * class are emitted as separate Polygon members of the MultiPolygon
 * rather than dissolved. Acceptable for fixture COGs (10×10 px) where
 * the class areas are small. Production must use `gdal_polygonize.py`
 * (apps/api/src/services/landcover/polygonizeWithGdal.ts).
 */
export async function polygonizePixelGrid(clip: RasterClip): Promise<PolygonizeResult> {
  const t0 = Date.now();
  const { pixels, width, height, bboxSourceCrs, pixelSize, nodataValue, vintage, source, sourceCrs } = clip;
  const [minX, minY] = bboxSourceCrs;
  const [xRes, yRes] = pixelSize;

  // Group pixel indices by class id.
  const classToCells = new Map<number, number[]>();  // classId → list of (row * width + col)
  let pixelCount = 0;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = row * width + col;
      const v = pixels[idx];
      if (v === undefined) continue;
      if (nodataValue !== null && v === nodataValue) continue;
      pixelCount++;
      let bucket = classToCells.get(v);
      if (!bucket) {
        bucket = [];
        classToCells.set(v, bucket);
      }
      bucket.push(idx);
    }
  }

  const features: PolygonizedFeature[] = [];
  const cellAreaM2 = approxCellAreaM2(xRes, yRes, sourceCrs);

  for (const [classId, indices] of classToCells) {
    // One MultiPolygon per class with one cell-rectangle per pixel.
    const coords: number[][][][] = [];
    for (const idx of indices) {
      const row = Math.floor(idx / width);
      const col = idx % width;
      // Pixel (row, col) maps to source-CRS rect:
      //   x ∈ [minX + col*xRes, minX + (col+1)*xRes]
      //   y ∈ [maxY - (row+1)*yRes, maxY - row*yRes]
      const maxY = bboxSourceCrs[3];
      const x0 = minX + col * xRes;
      const x1 = minX + (col + 1) * xRes;
      const y0 = maxY - (row + 1) * yRes;
      const y1 = maxY - row * yRes;
      coords.push([
        [
          [x0, y0],
          [x1, y0],
          [x1, y1],
          [x0, y1],
          [x0, y0],
        ],
      ]);
    }
    features.push({
      type: 'Feature',
      geometry: { type: 'MultiPolygon', coordinates: coords },
      properties: {
        classId,
        source,
        vintage,
        areaM2: indices.length * cellAreaM2,
      },
    });
  }

  return {
    features,
    vintage,
    source,
    pixelCount,
    polygonizeMs: Date.now() - t0,
    crs: sourceCrs,
  };
}

/**
 * Rough cell-area estimate in m². For projected CRS (NLCD EPSG:5070,
 * ACI EPSG:3347) `xRes`/`yRes` are already in metres, so it's the
 * product. For EPSG:4326 (WorldCover) we approximate using mid-latitude
 * 0; the production path uses GDAL's reported area instead.
 */
function approxCellAreaM2(xRes: number, yRes: number, sourceCrs: string): number {
  if (sourceCrs === 'EPSG:4326') {
    // 1° lat ≈ 111 km; 1° lng at lat=0 ≈ 111 km. Fixture-grade approximation.
    const mPerDegreeLat = 111_320;
    const mPerDegreeLng = 111_320;
    return Math.abs(xRes * mPerDegreeLng * yRes * mPerDegreeLat);
  }
  return Math.abs(xRes * yRes);
}
