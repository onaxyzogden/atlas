/**
 * bboxRect — a clean rectangle inscribed in the zone, sized so its
 * area ≈ the allocation, centered on the zone centroid, then clipped
 * back to the zone. Used by orchard block and kitchen garden where
 * tidy rows matter more than filling every corner.
 */

import type { Polygon, MultiPolygon } from 'geojson';
import { turf, toPolygonFeature, intersectPolys } from '../geo.js';

export function bboxRect(
  zone: Polygon | MultiPolygon,
  areaM2: number,
): Polygon[] {
  const poly = toPolygonFeature(zone);
  const zoneArea = turf.area(poly);
  if (zoneArea <= 0) return [];

  const bboxPoly = turf.bboxPolygon(turf.bbox(poly));
  // Shrink the bbox about the centroid until its (clipped) area is at
  // or below the target. sqrt because area scales with the square.
  const target = Math.min(areaM2, zoneArea);
  const factor = Math.min(1, Math.sqrt(target / Math.max(turf.area(bboxPoly), 1)));
  const scaled = turf.transformScale(bboxPoly, factor, {
    origin: turf.centroid(poly),
  });
  const clipped = intersectPolys(
    turf.polygon(scaled.geometry.coordinates),
    poly,
  );
  return clipped && turf.area(clipped) > 1
    ? [clipped.geometry]
    : [poly.geometry];
}
