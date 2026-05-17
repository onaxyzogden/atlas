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
