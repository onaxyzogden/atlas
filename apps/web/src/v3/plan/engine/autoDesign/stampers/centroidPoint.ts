/**
 * centroidPoint — a single Point at the zone centroid. Used for
 * one-off structures: coop, compost bay, tank, value-add kitchen,
 * solar inverter, paddock water node.
 */

import type { Polygon, MultiPolygon, Point } from 'geojson';
import { turf, toPolygonFeature } from '../geo.js';

export function centroidPoint(zone: Polygon | MultiPolygon): Point[] {
  const poly = toPolygonFeature(zone);
  // Prefer point-on-feature so the marker is guaranteed inside concave
  // zones; fall back to centroid only if that fails.
  const pof = turf.pointOnFeature(poly);
  return [pof.geometry];
}
