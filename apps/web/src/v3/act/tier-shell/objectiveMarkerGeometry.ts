// objectiveMarkerGeometry.ts
//
// Real per-objective marker positions for the Act tier map. The only data that
// links geometry to an objective is FieldAction (planObjectiveId + an optional
// locationGeometry), so each objective's pin sits at the centroid of its field
// actions' logged locations. Objectives with no geo-bearing actions get NO
// entry, so the map renders no pin for them (hide-until-real; there is no
// synthetic fallback position). Pure — no React, no store reads. Mirrors the
// planObjectiveId grouping in objectiveProgress.ts.

import type { FieldAction } from '@ogden/shared';
import { polygonCentroid } from '../../../lib/geo.js';

type LngLat = [number, number];

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Coerce an unknown GeoJSON position to a finite [lng, lat], else null. */
function asLngLat(pt: unknown): LngLat | null {
  if (!Array.isArray(pt)) return null;
  const lng = pt[0];
  const lat = pt[1];
  return isFiniteNumber(lng) && isFiniteNumber(lat) ? [lng, lat] : null;
}

function averagePoints(points: readonly LngLat[]): LngLat | null {
  if (points.length === 0) return null;
  let sx = 0;
  let sy = 0;
  for (const [lng, lat] of points) {
    sx += lng;
    sy += lat;
  }
  return [sx / points.length, sy / points.length];
}

/**
 * One representative [lng, lat] for a field action's geometry, or null when the
 * geometry is absent/malformed. Point -> the point; Polygon -> vertex-average
 * centroid (reuses lib/geo `polygonCentroid`); LineString -> vertex average.
 * The schema types `coordinates` as `unknown`, so every access is guarded.
 */
export function representativePoint(
  geometry: FieldAction['locationGeometry'],
): LngLat | null {
  if (!geometry) return null;
  const { type, coordinates } = geometry;
  if (type === 'Point') {
    return asLngLat(coordinates);
  }
  if (type === 'LineString') {
    if (!Array.isArray(coordinates)) return null;
    const pts = coordinates
      .map(asLngLat)
      .filter((p): p is LngLat => p !== null);
    return averagePoints(pts);
  }
  if (type === 'Polygon') {
    if (!Array.isArray(coordinates)) return null;
    // polygonCentroid guards each vertex, so malformed rings yield null safely.
    return polygonCentroid({
      type: 'Polygon',
      coordinates,
    } as unknown as GeoJSON.Polygon);
  }
  return null;
}

/**
 * Per-objective marker positions, keyed by objective id. Groups field actions
 * by planObjectiveId in one pass, then averages each objective's representative
 * points. Only objectives with at least one valid point get an entry — callers
 * render no marker for objectives absent from the result (hide-until-real).
 */
export function computeObjectiveMarkerPositions(
  objectives: ReadonlyArray<{ id: string }>,
  actions: readonly FieldAction[],
): Record<string, LngLat> {
  const grouped = new Map<string, FieldAction[]>();
  for (const a of actions) {
    const bucket = grouped.get(a.planObjectiveId);
    if (bucket) bucket.push(a);
    else grouped.set(a.planObjectiveId, [a]);
  }
  const out: Record<string, LngLat> = {};
  for (const objective of objectives) {
    const points: LngLat[] = [];
    for (const a of grouped.get(objective.id) ?? []) {
      const p = representativePoint(a.locationGeometry);
      if (p) points.push(p);
    }
    const pos = averagePoints(points);
    if (pos) out[objective.id] = pos;
  }
  return out;
}
