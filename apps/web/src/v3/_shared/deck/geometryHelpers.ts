/**
 * Geometry helpers shared by deck.gl-driven 3D layers.
 *
 * Centroid + bounding-box helpers were originally inline in the retired
 * `DesignElementGlbLayer` (three.js custom layer). Lifted here so the new
 * `DesignElementScenegraphLayer` (deck.gl ScenegraphLayer) and any future
 * 3D consumer share the same projection math.
 */

const M_PER_DEG_LAT = 111_320;

/** Simple average of the outer ring (open ring tolerated). */
export function polygonCentroid(poly: GeoJSON.Polygon): [number, number] {
  const ring = poly.coordinates[0] ?? [];
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const pt = ring[i];
    if (!pt) continue;
    sx += pt[0] ?? 0;
    sy += pt[1] ?? 0;
    n++;
  }
  if (n === 0) return [0, 0];
  return [sx / n, sy / n];
}

/** Polygon bounding-box edges in metres at its centroid latitude. */
export function polygonExtentsM(poly: GeoJSON.Polygon): {
  widthM: number;
  depthM: number;
} {
  const ring = poly.coordinates[0] ?? [];
  if (ring.length === 0) return { widthM: 1, depthM: 1 };
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const pt of ring) {
    const lng = pt[0];
    const lat = pt[1];
    if (lng == null || lat == null) continue;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const midLat = (minLat + maxLat) / 2;
  const depthM = (maxLat - minLat) * M_PER_DEG_LAT;
  const widthM =
    (maxLng - minLng) * M_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180);
  return {
    widthM: Math.max(widthM, 0.1),
    depthM: Math.max(depthM, 0.1),
  };
}
