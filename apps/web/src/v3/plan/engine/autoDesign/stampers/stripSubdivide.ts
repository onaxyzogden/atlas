/**
 * stripSubdivide — equal-area-ish strips along the zone's longest
 * axis. Used by AMP paddocks (cattle / small-ruminant) and annual
 * beds. Strip count derives deterministically from the allocated
 * area (≈1-acre cells, clamped 2–12), so the same allocation always
 * yields the same number of strips.
 */

import type { Polygon, MultiPolygon } from 'geojson';
import { turf, toPolygonFeature, intersectPolys } from '../geo.js';
import { ACRE_M2 } from '../types.js';

export function stripSubdivide(
  zone: Polygon | MultiPolygon,
  areaM2: number,
): Polygon[] {
  const poly = toPolygonFeature(zone);
  const [minX, minY, maxX, maxY] = turf.bbox(poly);
  const widthDeg = maxX - minX;
  const heightDeg = maxY - minY;
  if (widthDeg <= 0 || heightDeg <= 0) return [];

  const n = Math.min(12, Math.max(2, Math.round(areaM2 / ACRE_M2)));
  const splitAlongX = widthDeg >= heightDeg;

  const out: Polygon[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const band = splitAlongX
      ? turf.bboxPolygon([
          minX + widthDeg * t0,
          minY,
          minX + widthDeg * t1,
          maxY,
        ])
      : turf.bboxPolygon([
          minX,
          minY + heightDeg * t0,
          maxX,
          minY + heightDeg * t1,
        ]);
    const clipped = intersectPolys(turf.polygon(band.geometry.coordinates), poly);
    if (clipped && turf.area(clipped) > 1) {
      out.push(clipped.geometry);
    }
  }
  return out;
}
