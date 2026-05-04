/**
 * effectiveAnchor — pick the best [lng, lat] for sector/zone radiation.
 *
 * Priority:
 *   1. Explicit homestead point (user-placed).
 *   2. Boundary polygon centroid (mean of outer ring vertices, excluding the
 *      closing duplicate). Cheap and good enough for convex-ish parcels;
 *      DiagnoseMap already uses bounds-center for viewport, but the *anchor*
 *      we want for permaculture analysis is the polygon centroid, which is
 *      closer to "where mass sits" than the bbox center.
 *   3. Provided fallback.
 */

export type LngLat = [number, number];

export function polygonCentroid(poly: GeoJSON.Polygon): LngLat | null {
  const ring = poly.coordinates[0];
  if (!ring || ring.length === 0) return null;
  const last = ring.length - 1;
  const closes =
    ring.length > 1 &&
    ring[0]?.[0] === ring[last]?.[0] &&
    ring[0]?.[1] === ring[last]?.[1];
  const end = closes ? last : ring.length;
  if (end === 0) return null;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < end; i++) {
    const p = ring[i];
    if (!p) continue;
    sx += p[0] ?? 0;
    sy += p[1] ?? 0;
  }
  return [sx / end, sy / end];
}

export function getEffectiveAnchor(
  homestead: LngLat | undefined,
  boundary: GeoJSON.Polygon | undefined,
  fallback: LngLat,
): LngLat {
  if (homestead) return homestead;
  if (boundary) {
    const c = polygonCentroid(boundary);
    if (c) return c;
  }
  return fallback;
}
