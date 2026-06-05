/**
 * pickClickedFeature — disambiguates which sub-geometry the steward clicked
 * when MapLibre's `queryRenderedFeatures` returns a tile-batched Multi*
 * feature.
 *
 * Background: OpenMapTiles batches many disjoint footprints under one
 * tile-local feature id (notably `building`, `water`, `waterway`). A naïve
 * `coordinates[0]` shortcut therefore captures an arbitrary sub-geometry —
 * the root cause of the wrong-feature-adoption bug fixed for buildings on
 * 2026-05-16. The helpers below are deterministic so re-clicking the same
 * feature yields the same ring/segment, which is what downstream
 * geometry-based dedup relies on.
 */

import * as turf from '@turf/turf';

/** Pick the Polygon ring whose interior contains the click point; fall back
 *  to the ring whose centroid is nearest (covers tall basemap buildings
 *  viewed under pitch where the click `lngLat` lands outside the footprint).
 *  Returns null if `geom` is neither Polygon nor MultiPolygon, or if the
 *  MultiPolygon has no coordinates. */
export function pickClickedPolygon(
  geom: GeoJSON.Geometry,
  click: [number, number],
): GeoJSON.Polygon | null {
  if (geom.type === 'Polygon') return geom;
  if (geom.type !== 'MultiPolygon' || geom.coordinates.length === 0) return null;

  const point = turf.point(click);
  let nearest: { poly: GeoJSON.Polygon; metres: number } | null = null;
  for (const coords of geom.coordinates) {
    if (!coords || coords.length === 0) continue;
    const poly: GeoJSON.Polygon = { type: 'Polygon', coordinates: coords };
    if (turf.booleanPointInPolygon(point, poly)) return poly;
    try {
      const metres = turf.distance(point, turf.centroid(poly), {
        units: 'meters',
      });
      if (!nearest || metres < nearest.metres) nearest = { poly, metres };
    } catch {
      /* skip degenerate ring */
    }
  }
  return nearest?.poly ?? null;
}

/** Pick the LineString segment of a (Multi)LineString whose nearest point
 *  to the click is closest in metres. Returns the input unchanged for a
 *  plain LineString; null for an empty MultiLineString. */
export function pickClickedLine(
  geom: GeoJSON.Geometry,
  click: [number, number],
): GeoJSON.LineString | null {
  if (geom.type === 'LineString') return geom;
  if (geom.type !== 'MultiLineString' || geom.coordinates.length === 0)
    return null;

  const point = turf.point(click);
  let nearest: { line: GeoJSON.LineString; metres: number } | null = null;
  for (const coords of geom.coordinates) {
    if (!coords || coords.length < 2) continue;
    const line: GeoJSON.LineString = { type: 'LineString', coordinates: coords };
    try {
      const snapped = turf.nearestPointOnLine(line, point, { units: 'meters' });
      const metres = (snapped.properties?.dist as number | undefined) ?? Infinity;
      if (!nearest || metres < nearest.metres) nearest = { line, metres };
    } catch {
      /* skip degenerate segment */
    }
  }
  return nearest?.line ?? null;
}
