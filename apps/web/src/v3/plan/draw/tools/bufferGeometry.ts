/**
 * bufferGeometry — turf.buffer wrapper used by the setback ring tool and
 * by inline edit re-anchoring.
 *
 * Returns a Polygon or MultiPolygon offset outward from `source` by
 * `distanceM` metres, or `undefined` if the buffer collapses (e.g.,
 * negative distance large enough to swallow a polygon, or a
 * pathologically small line). Lives outside `setbackStore.ts` so the
 * pure data layer doesn't pull in `@turf/turf`.
 */

import * as turf from '@turf/turf';

export type BufferableGeometry =
  | GeoJSON.Polygon
  | GeoJSON.MultiPolygon
  | GeoJSON.LineString;

export function bufferGeometry(
  source: BufferableGeometry,
  distanceM: number,
): GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined {
  const buffered = turf.buffer(turf.feature(source), distanceM, {
    units: 'meters',
  });
  if (!buffered) return undefined;
  const g = buffered.geometry;
  if (g.type === 'Polygon' || g.type === 'MultiPolygon') return g;
  return undefined;
}
