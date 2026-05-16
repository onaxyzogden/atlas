/**
 * dimensionGeometry — pure parametric helpers for the Dimensions draw mode.
 *
 * Reuses `createFootprintPolygon` from features/structures so the rectangle
 * math (lat/lng correction, rotation around centre) lives in exactly one
 * place. Circle and line use Turf, which the rest of the plan/draw tools
 * already depend on.
 */

import * as turf from '@turf/turf';
import { createFootprintPolygon } from '../../../features/structures/footprints.js';

export type LngLat = [number, number];

/** Rectangle polygon centred on `center`, rotated by `rotationDeg` (CCW). */
export function rectangleAt(
  center: LngLat,
  widthM: number,
  depthM: number,
  rotationDeg: number = 0,
): GeoJSON.Polygon {
  return createFootprintPolygon(center, widthM, depthM, rotationDeg);
}

/** Circular polygon centred on `center` with radius `radiusM`. */
export function circleAt(
  center: LngLat,
  radiusM: number,
  steps: number = 64,
): GeoJSON.Polygon {
  // turf.circle takes radius in chosen units; we use kilometres.
  const radiusKm = radiusM / 1000;
  const feature = turf.circle(center, radiusKm, { steps, units: 'kilometers' });
  return feature.geometry as GeoJSON.Polygon;
}

/**
 * 2-vertex LineString starting at `anchor` and extending `lengthM` metres
 * along compass bearing `bearingDeg` (0 = N, 90 = E, 180 = S, 270 = W).
 */
export function lineFrom(
  anchor: LngLat,
  lengthM: number,
  bearingDeg: number,
): GeoJSON.LineString {
  const distKm = lengthM / 1000;
  const end = turf.destination(anchor, distKm, bearingDeg, { units: 'kilometers' });
  const endCoord = end.geometry.coordinates as LngLat;
  return {
    type: 'LineString',
    coordinates: [anchor, endCoord],
  };
}
