/**
 * parcelGeometry — shared GeoJSON polygon helpers for the zone-generator
 * seam. Extracted from `ringSeedGenerator` so the seed path and the
 * "trim seeded zones to parcel" action use one clip/union implementation
 * (a seed's edge and a later trim must agree to the metre).
 *
 * Pure: turf only, no store, no React.
 */

import * as turf from '@turf/turf';

export type Poly = GeoJSON.Polygon | GeoJSON.MultiPolygon;
export type PolyFeature = GeoJSON.Feature<Poly>;

/** a − b. Null when the difference is empty or turf throws on degenerate input. */
export function diff(a: PolyFeature, b: PolyFeature): PolyFeature | null {
  try {
    return (turf.difference(turf.featureCollection([a, b])) ??
      null) as PolyFeature | null;
  } catch {
    return null;
  }
}

/** a ∩ b. Null when they don't overlap or turf throws on degenerate input. */
export function clip(a: PolyFeature, b: PolyFeature): PolyFeature | null {
  try {
    return (turf.intersect(turf.featureCollection([a, b])) ??
      null) as PolyFeature | null;
  } catch {
    return null;
  }
}

/** Union of every polygon/multipolygon feature in a boundary FC. */
export function parcelPolygon(
  fc: GeoJSON.FeatureCollection | null,
): PolyFeature | null {
  if (!fc) return null;
  const polys = fc.features.filter(
    (f): f is PolyFeature =>
      f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon',
  );
  if (polys.length === 0) return null;
  let acc = polys[0]!;
  for (let i = 1; i < polys.length; i++) {
    try {
      const u = turf.union(turf.featureCollection([acc, polys[i]!]));
      if (u) acc = u as PolyFeature;
    } catch {
      /* keep acc */
    }
  }
  return acc;
}
