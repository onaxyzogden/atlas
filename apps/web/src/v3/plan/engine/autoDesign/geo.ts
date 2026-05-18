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

export type AnyPolyFeature = Feature<Polygon | MultiPolygon>;

/** v7 difference takes a FeatureCollection [minuend, subtrahend].
 *  Returns a − b WITHOUT collapsing a MultiPolygon result (the
 *  remainder may legitimately be several disjoint pieces and the
 *  caller — stripSubdivide — already reduces to its working ring).
 *  `b` null → minuend unchanged; null result → `a` fully consumed. */
export function differencePolys(
  a: AnyPolyFeature,
  b: AnyPolyFeature | null,
): AnyPolyFeature | null {
  if (!b) return a;
  return turf.difference(turf.featureCollection([a, b]));
}

/** a ∪ b, lossless: a MultiPolygon result is preserved so the
 *  accumulating claimed-footprint ledger never forgets a disjoint
 *  earlier claim. `a` null → b. */
export function unionPolys(
  a: AnyPolyFeature | null,
  b: AnyPolyFeature,
): AnyPolyFeature {
  if (!a) return b;
  return turf.union(turf.featureCollection([a, b])) ?? a;
}

export { turf };
