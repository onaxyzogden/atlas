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
