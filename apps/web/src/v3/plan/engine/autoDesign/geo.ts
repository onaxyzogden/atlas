/**
 * Small turf wrappers shared by the stampers. Isolated so the v7
 * FeatureCollection-style `intersect` signature lives in one place.
 */

import * as turf from '@turf/turf';
import type { Feature, Polygon, MultiPolygon } from 'geojson';

export type PolyFeature = Feature<Polygon>;

/** Coerce a zone geometry to a single-Polygon Feature (largest ring of
 *  a MultiPolygon by area). */
export function toPolygonFeature(
  geom: Polygon | MultiPolygon,
): PolyFeature {
  if (geom.type === 'Polygon') {
    return turf.polygon(geom.coordinates);
  }
  let best: PolyFeature | null = null;
  let bestArea = -1;
  for (const coords of geom.coordinates) {
    const f = turf.polygon(coords);
    const a = turf.area(f);
    if (a > bestArea) {
      best = f;
      bestArea = a;
    }
  }
  return best ?? turf.polygon(geom.coordinates[0] ?? []);
}

/** v7 intersect takes a FeatureCollection of exactly two polygons. */
export function intersectPolys(
  a: PolyFeature,
  b: PolyFeature,
): PolyFeature | null {
  const out = turf.intersect(turf.featureCollection([a, b]));
  if (!out) return null;
  if (out.geometry.type === 'Polygon') {
    return turf.polygon(out.geometry.coordinates);
  }
  // MultiPolygon → largest ring
  let best: PolyFeature | null = null;
  let bestArea = -1;
  for (const coords of out.geometry.coordinates) {
    const f = turf.polygon(coords);
    const ar = turf.area(f);
    if (ar > bestArea) {
      best = f;
      bestArea = ar;
    }
  }
  return best;
}

export { turf };
