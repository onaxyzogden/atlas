/**
 * Spatial sampling helpers for layer-vector payloads.
 *
 * Used by downstream features (auto-zoning, design rules, suitability) to
 * answer "how far is this point from the nearest stream?" or "is this point
 * inside a wetland?" given a `SpatialLayerPayload` retained on a
 * `MockLayerResult` (see packages/shared/src/scoring/types.ts).
 *
 * Coordinates: WGS84 lng/lat (EPSG:4326). Distance return values are metres.
 */

import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';

/** Distance in metres from `point` to the nearest vertex/edge of any feature
 *  in `fc`. Returns `Infinity` if the collection has no usable geometries.
 *
 *  Handles Point/LineString/MultiLineString/Polygon/MultiPolygon. For polygons,
 *  measures distance to the boundary (a point inside a polygon is *not*
 *  distance zero — use `isInside` for membership). */
export function distanceToNearest(point: Position, fc: FeatureCollection): number {
  if (!fc?.features?.length) return Infinity;
  const from = turf.point(point);
  let best = Infinity;

  for (const feature of fc.features) {
    const dist = distanceToFeature(from, feature);
    if (dist < best) best = dist;
  }
  return best;
}

/** True iff `point` lies inside any Polygon/MultiPolygon feature in `fc`.
 *  Non-polygon features are ignored. */
export function isInside(point: Position, fc: FeatureCollection): boolean {
  if (!fc?.features?.length) return false;
  const from = turf.point(point);

  for (const feature of fc.features) {
    const g = feature.geometry;
    if (!g) continue;
    if (g.type === 'Polygon' || g.type === 'MultiPolygon') {
      if (turf.booleanPointInPolygon(from, feature as Feature<typeof g>)) return true;
    }
  }
  return false;
}

function distanceToFeature(from: Feature<GeoJSON.Point>, feature: Feature<Geometry> | Feature): number {
  const g = feature.geometry;
  if (!g) return Infinity;

  switch (g.type) {
    case 'Point':
      return turf.distance(from, turf.point(g.coordinates), { units: 'meters' });

    case 'MultiPoint': {
      let best = Infinity;
      for (const c of g.coordinates) {
        const d = turf.distance(from, turf.point(c), { units: 'meters' });
        if (d < best) best = d;
      }
      return best;
    }

    case 'LineString':
      return turf.pointToLineDistance(from, turf.lineString(g.coordinates), { units: 'meters' });

    case 'MultiLineString': {
      let best = Infinity;
      for (const line of g.coordinates) {
        if (line.length < 2) continue;
        const d = turf.pointToLineDistance(from, turf.lineString(line), { units: 'meters' });
        if (d < best) best = d;
      }
      return best;
    }

    case 'Polygon':
    case 'MultiPolygon': {
      // Distance to polygon boundary. (Inside-polygon membership is a separate
      // concern — `isInside` handles that.)
      const rings = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
      let best = Infinity;
      for (const poly of rings) {
        for (const ring of poly) {
          if (ring.length < 2) continue;
          const d = turf.pointToLineDistance(from, turf.lineString(ring), { units: 'meters' });
          if (d < best) best = d;
        }
      }
      return best;
    }

    case 'GeometryCollection': {
      let best = Infinity;
      for (const sub of g.geometries) {
        const d = distanceToFeature(from, { type: 'Feature', geometry: sub, properties: {} });
        if (d < best) best = d;
      }
      return best;
    }

    default:
      return Infinity;
  }
}
