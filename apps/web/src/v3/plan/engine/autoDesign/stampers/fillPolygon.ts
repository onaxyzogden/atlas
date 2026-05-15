/**
 * fillPolygon — the intervention occupies the whole zone. Used by
 * food forest, cover-crop rebuild, coppice block, pasture renovation,
 * earthen pond placed in a wet zone. Returns the zone's outer ring as
 * a clean Polygon (largest ring of a MultiPolygon).
 */

import type { Polygon, MultiPolygon } from 'geojson';
import { toPolygonFeature } from '../geo.js';

export function fillPolygon(zone: Polygon | MultiPolygon): Polygon[] {
  return [toPolygonFeature(zone).geometry];
}
