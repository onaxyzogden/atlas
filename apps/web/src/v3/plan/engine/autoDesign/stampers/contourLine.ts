/**
 * contourLine — clips the project's observed contour lines to the
 * zone. Used by swale systems and the keyline-graded access track,
 * which follow the land's contour rather than a drawn shape.
 *
 * No-op when the project has no contour data: returns []. The
 * orchestrator surfaces a "needs terrain processing" finding so the
 * task still schedules even though no geometry was emitted.
 */

import type { Polygon, MultiPolygon, LineString } from 'geojson';
import { turf, toPolygonFeature } from '../geo.js';
import type { TerrainView } from '../types.js';

export function contourLine(
  zone: Polygon | MultiPolygon,
  terrain: TerrainView,
): LineString[] {
  if (!terrain.contours.length) return [];
  const poly = toPolygonFeature(zone);
  const out: LineString[] = [];

  for (const c of terrain.contours) {
    const line = turf.feature(c.geometry);
    let pieces;
    try {
      pieces = turf.lineSplit(line, poly);
    } catch {
      continue;
    }
    for (const seg of pieces.features) {
      const coords = seg.geometry.coordinates;
      if (coords.length < 2) continue;
      const mid = coords[Math.floor(coords.length / 2)]!;
      if (turf.booleanPointInPolygon(turf.point(mid), poly)) {
        out.push(seg.geometry);
      }
    }
  }
  return out;
}
