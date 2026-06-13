/**
 * Shared geographic helpers.
 *
 * Coordinate convention: **`[lng, lat]` tuples**, matching Mapbox / GeoJSON
 * order and the way every spatial store in this codebase already persists
 * centroids (`Guild.center`, `FertilityInfra.center`, `Zone.center`, ...).
 * Callers that hold scalar `lat` / `lng` numbers should wrap them as
 * `[lng, lat]` at the call site — **not** `[lat, lng]`. Getting this wrong
 * silently transposes the globe.
 *
 * Extracted 2026-05-12 from four duplicate inline implementations
 * (`layerFetcher.ts`, `GPSFieldStatusCard.tsx`,
 * `ArrivalSequenceDesignCard.tsx`, `FertilityColocationCard.tsx`).
 */

import * as turf from '@turf/turf';

/** Earth's mean radius in metres (WGS-84 sphere approximation). */
const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two `[lng, lat]` points, in metres.
 */
export function haversineM(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const c = s1 * s1 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * s2 * s2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(c)));
}

/**
 * Great-circle distance between two `[lng, lat]` points, in kilometres.
 */
export function haversineKm(a: [number, number], b: [number, number]): number {
  return haversineM(a, b) / 1000;
}

/**
 * Naïve vertex-average centroid of the first ring of a polygon —
 * the closing-vertex repeat biases the result by sub-metre amounts at
 * parcel scale, below other sources of noise. Returns `null` when the
 * ring is empty or contains no valid `[lng, lat]` vertices.
 *
 * Returned as `[lng, lat]` to match GeoJSON / `Structure.center` /
 * `Utility.center` conventions.
 */
export function polygonCentroid(geom: GeoJSON.Polygon): [number, number] | null {
  const ring = geom.coordinates[0];
  if (!ring || ring.length === 0) return null;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const pt of ring) {
    if (!pt || pt.length < 2) continue;
    const lng = pt[0];
    const lat = pt[1];
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;
    sx += lng;
    sy += lat;
    n += 1;
  }
  if (n === 0) return null;
  return [sx / n, sy / n];
}

/**
 * Parcel area from a boundary, in the project's preferred unit
 * (`metric` → hectares, `imperial` → acres), rounded to 2 dp.
 * Best-effort: returns `null` on any turf failure (matches the wizard).
 */
export function parcelAcreage(
  geo: GeoJSON.Geometry | GeoJSON.Feature | GeoJSON.FeatureCollection,
  units: 'metric' | 'imperial',
): number | null {
  try {
    const areaM2 = turf.area(geo);
    return units === 'metric'
      ? Math.round((areaM2 / 10000) * 100) / 100
      : Math.round((areaM2 / 4046.86) * 100) / 100;
  } catch {
    return null;
  }
}

/**
 * Parcel area in **acres**, the canonical storage unit for `project.acreage`.
 *
 * The backend authoritatively computes `acreage` as
 * `ST_Area(boundary::geography) / 4046.86` (acres) and overwrites the local
 * value on every boundary sync (`applyServerAcreage`). Client write paths must
 * store acres too, so locally-computed and server-recomputed values agree
 * regardless of the project's display `units`. Use `formatParcelArea` to render
 * this value in the steward's preferred unit. Best-effort: `null` on any turf
 * failure (matches `parcelAcreage`).
 */
export function parcelAcres(
  geo: GeoJSON.Geometry | GeoJSON.Feature | GeoJSON.FeatureCollection,
): number | null {
  try {
    return Math.round((turf.area(geo) / 4046.86) * 100) / 100;
  } catch {
    return null;
  }
}

/** Acres → hectares (1 acre = 0.404686 ha). */
const HA_PER_ACRE = 0.404686;

/**
 * Convert a canonical **acres** value (`project.acreage`) to the numeric value
 * in the project's preferred unit (hectares for `metric`, acres for `imperial`).
 * Use this for callers that render the number and its unit separately (e.g. the
 * v3 `Candidate.acreage` / `acreageUnit` pair); use `formatParcelArea` when a
 * formatted string is wanted.
 */
export function parcelAreaValue(
  acres: number,
  units: 'metric' | 'imperial',
): number {
  return units === 'metric' ? acres * HA_PER_ACRE : acres;
}

/**
 * Inverse of `parcelAreaValue`: convert a value already expressed in the
 * project's preferred display unit (hectares for `metric`, acres for
 * `imperial`) back to canonical **acres**. Use this when a caller holds a
 * display-unit area (e.g. v3 `location.acreage`) but needs acres to compare
 * against turf-measured geometry, which is always acres (`parcelAcres`).
 */
export function parcelAreaToAcres(
  value: number,
  units: 'metric' | 'imperial',
): number {
  return units === 'metric' ? value / HA_PER_ACRE : value;
}

/**
 * Format a canonical **acres** value (`project.acreage`) for display in the
 * project's preferred unit: hectares for `metric`, acres for `imperial`.
 * Returns an em dash for nullish / non-finite input.
 */
export function formatParcelArea(
  acres: number | null | undefined,
  units: 'metric' | 'imperial',
): string {
  if (acres == null || !Number.isFinite(acres)) return '—';
  return units === 'metric'
    ? `${(acres * HA_PER_ACRE).toFixed(2)} ha`
    : `${acres.toFixed(2)} ac`;
}

/**
 * Raw parcel area in square metres (geodesic, turf). `parcelAcreage` rounds
 * to ha/ac for display; this is the unrounded m² some callers (e.g. water
 * catchment sizing) need. Best-effort: `null` on any turf failure.
 */
export function parcelAreaM2(
  geo: GeoJSON.Geometry | GeoJSON.Feature | GeoJSON.FeatureCollection,
): number | null {
  try {
    return turf.area(geo);
  } catch {
    return null;
  }
}

/**
 * Extract a polygon/multipolygon geometry from a stored boundary, regardless
 * of which of the three shapes the persistence layer captured.
 *
 * `ParcelBoundaryGeojson` is a Zod union of `FeatureCollection | Feature |
 * Polygon` (see `packages/shared/src/schemas/project.schema.ts`). Wizard +
 * Observe write paths normalize to `FeatureCollection` via `parseGeoFile` /
 * `toFeatureCollection`, but stored values from older sessions or alternate
 * draft paths can be bare `Feature` or raw `Polygon`. Readers that assume
 * `.features[0].geometry` crash on the latter two shapes — this helper
 * normalizes on the read side so callers don't have to.
 */
export function extractBoundaryGeometry(
  boundary:
    | GeoJSON.Polygon
    | GeoJSON.MultiPolygon
    | GeoJSON.Feature
    | GeoJSON.FeatureCollection
    | undefined
    | null,
): GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined {
  if (!boundary) return undefined;
  if (boundary.type === 'FeatureCollection') {
    return boundary.features[0]?.geometry as
      | GeoJSON.Polygon
      | GeoJSON.MultiPolygon
      | undefined;
  }
  if (boundary.type === 'Feature') {
    return boundary.geometry as
      | GeoJSON.Polygon
      | GeoJSON.MultiPolygon
      | undefined;
  }
  if (boundary.type === 'Polygon' || boundary.type === 'MultiPolygon') {
    return boundary;
  }
  return undefined;
}

/** True only for a real, finite number (excludes NaN / +-Infinity). */
function isFiniteCoord(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Outer rings of a Polygon or MultiPolygon as a flat list of rings. */
function outerRings(
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): GeoJSON.Position[][] {
  if (geom.type === 'Polygon') {
    const ring = geom.coordinates[0];
    return ring ? [ring] : [];
  }
  // MultiPolygon: coordinates is Position[][][] — one [rings] per polygon.
  return geom.coordinates
    .map((poly) => poly[0])
    .filter((ring): ring is GeoJSON.Position[] => Array.isArray(ring));
}

/**
 * Vertex-average centroid of a Polygon OR MultiPolygon, averaging every outer
 * ring's finite `[lng, lat]` vertices. Hardens `polygonCentroid` (Polygon-only;
 * its `typeof === 'number'` check lets `NaN` through, since `typeof NaN ===
 * 'number'`) by requiring `Number.isFinite`. Returns `null` when no finite
 * vertex exists — callers must fall back to a known-finite center.
 *
 * Returned as `[lng, lat]`. Accepts `undefined` (returns `null`) so callers can
 * pass an unresolved boundary straight through to a `?? fallbackCenter`.
 */
export function boundaryCentroid(
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined,
): [number, number] | null {
  if (!geom) return null;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const ring of outerRings(geom)) {
    for (const pt of ring) {
      if (!Array.isArray(pt) || pt.length < 2) continue;
      const lng = pt[0];
      const lat = pt[1];
      if (!isFiniteCoord(lng) || !isFiniteCoord(lat)) continue;
      sx += lng;
      sy += lat;
      n += 1;
    }
  }
  if (n === 0) return null;
  return [sx / n, sy / n];
}

/**
 * Normalize a boundary to a single render-safe `GeoJSON.Polygon` whose outer
 * ring has at least 4 positions that are ALL finite `[lng, lat]` pairs. For a
 * MultiPolygon, the first polygon is chosen. Returns `undefined` when nothing
 * valid exists, so map consumers (e.g. `DiagnoseMap`) simply draw no outline
 * and center on their finite centroid prop instead of crashing on NaN.
 *
 * Guards the case where `extractBoundaryGeometry` yields a MultiPolygon (or a
 * Polygon with non-finite vertices) that downstream code mis-treats as a plain
 * single-ring Polygon.
 */
export function renderablePolygon(
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined,
): GeoJSON.Polygon | undefined {
  if (!geom) return undefined;
  const ring =
    geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0]?.[0];
  if (!Array.isArray(ring) || ring.length < 4) return undefined;
  for (const pt of ring) {
    if (!Array.isArray(pt) || pt.length < 2) return undefined;
    if (!isFiniteCoord(pt[0]) || !isFiniteCoord(pt[1])) return undefined;
  }
  return { type: 'Polygon', coordinates: [ring] };
}
