/**
 * recordAsBuiltDeviation - the Act-stage write for the as-built deviation
 * loop. Builds a DIVERGENT `ObserveDataPoint` for a specific placed Plan
 * feature and records it in the Observe substrate. It does NOT mutate any
 * Plan geometry store: "Act adds, it does not edit Plan decisions." The Plan
 * reconciliation card (Plan stage) is where a steward later chooses to apply
 * the change to the design or keep the plan.
 *
 * The emitted point carries:
 *  - `domainId`         = domainForFeatureKind(kind) so the divergence lands on
 *                         the right Observe domain and lights the matching Plan
 *                         objective's pill (via domain overlap in
 *                         `usePlanRevisionFlagSync`).
 *  - `sourceFeatureRef` = { kind, id } so the Plan card targets the exact
 *                         feature rather than re-discovering it by proximity.
 *  - `statusOutput`     = 'needs_investigation' (the lightest divergent status
 *                         that still forces the Plan revision flag).
 *  - `measurementValue` = the `AsBuiltDiff` (attribute or geometry).
 *  - `locationGeometry` = the feature centroid (when known) so the store's
 *                         existing proximity supersession keeps one active
 *                         divergence per feature/area.
 */

import {
  domainForFeatureKind,
  type AsBuiltDiff,
  type AsBuiltFeatureKind,
  type ObserveDataPoint,
} from '@ogden/shared';
import { useObserveDataPointStore } from '../../../store/observeDataPointStore.js';

export interface RecordAsBuiltDeviationParams {
  projectId: string;
  kind: AsBuiltFeatureKind;
  featureId: string;
  diff: AsBuiltDiff;
  /** Feature centroid `[lng, lat]` for proximity supersession; null if unknown. */
  centroid?: [number, number] | null;
  /** Focused Plan objective, when the Act surface has one; null otherwise.
   *  The objective pill still lights via domain overlap when this is null. */
  sourceObjectiveId?: string | null;
}

/**
 * Centroid of a GeoJSON Polygon's outer ring (mean of vertices, excluding the
 * closing duplicate). Returns null for an empty/degenerate ring. Good enough
 * to geo-anchor an as-built divergence point for proximity supersession.
 */
export function polygonCentroid(
  polygon: GeoJSON.Polygon,
): [number, number] | null {
  const ring = polygon.coordinates[0] ?? [];
  const first = ring[0];
  const last = ring[ring.length - 1];
  const verts =
    ring.length > 1 &&
    first !== undefined &&
    last !== undefined &&
    first[0] === last[0] &&
    first[1] === last[1]
      ? ring.slice(0, -1)
      : ring;
  if (verts.length === 0) return null;
  let sx = 0;
  let sy = 0;
  for (const v of verts) {
    sx += v[0] ?? 0;
    sy += v[1] ?? 0;
  }
  const n = verts.length;
  return [sx / n, sy / n];
}

export function recordAsBuiltDeviation(
  params: RecordAsBuiltDeviationParams,
): ObserveDataPoint {
  const {
    projectId,
    kind,
    featureId,
    diff,
    centroid = null,
    sourceObjectiveId = null,
  } = params;

  const point: ObserveDataPoint = {
    id: crypto.randomUUID(),
    projectId,
    domainId: domainForFeatureKind(kind),
    sourceType: 'divergence_evidence',
    sourceActionId: null,
    sourceFeedEntryId: null,
    sourceObjectiveId,
    sourceFeatureRef: { kind, id: featureId },
    locationGeometry: centroid
      ? { type: 'Point', coordinates: centroid }
      : null,
    cycleId: 0,
    isSuperseded: false,
    supersededBy: null,
    statusOutput: 'needs_investigation',
    measurementValue: diff,
    proofItems: [],
    capturedAt: new Date().toISOString(),
    capturedBy: 'act-as-built',
  };

  useObserveDataPointStore.getState().recordDataPoint(point);
  return point;
}
