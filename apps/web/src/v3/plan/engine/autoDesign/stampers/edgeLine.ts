/**
 * edgeLine — a line traced along the zone perimeter. Used by
 * permanent perimeter fencing and windward shelterbelt / windbreak.
 */

import type { Polygon, MultiPolygon, LineString } from 'geojson';
import { turf, toPolygonFeature } from '../geo.js';

export function edgeLine(zone: Polygon | MultiPolygon): LineString[] {
  const poly = toPolygonFeature(zone);
  const result = turf.polygonToLine(poly);
  const feat = 'features' in result ? result.features[0] : result;
  if (!feat) return [];
  if (feat.geometry.type === 'LineString') {
    return [feat.geometry];
  }
  // MultiLineString (polygon with holes) → exterior ring only.
  const ring = feat.geometry.coordinates[0];
  return ring ? [{ type: 'LineString', coordinates: ring }] : [];
}
