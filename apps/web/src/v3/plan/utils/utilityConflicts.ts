/**
 * utilityConflicts — Plan-stage earthwork conflict detection against
 * OBSERVE-recorded buried utilities.
 *
 * Per ADR 2026-05-10-plan-earthwork-utility-veto.md: any Plan earthwork
 * whose declared `earthworkDepthCm` exceeds 30 cm AND whose geometry
 * comes within 3 m of a `BuriedUtility` LineString must be
 * acknowledged by the steward before persistence.
 *
 * Pure helper. Reads the built-environment store one-shot via
 * `getState()` — does NOT subscribe.
 */

import * as turf from '@turf/turf';
import {
  useBuiltEnvironmentStore,
  type BuriedUtility,
  type BuriedUtilityKind,
} from '../../../store/builtEnvironmentStore.js';

/** Metres of horizontal buffer added around each buried utility line. */
export const UTILITY_CONFLICT_BUFFER_M = 3;

/** Depth threshold (cm) above which a tool's earthworks trigger the check. */
export const UTILITY_CONFLICT_DEPTH_THRESHOLD_CM = 30;

export interface UtilityConflict {
  id: string;
  kind: BuriedUtilityKind;
  label?: string;
}

/**
 * Check a candidate Plan-stage earthwork geometry for conflicts against
 * recorded buried utilities.
 *
 * @returns Array of conflicting utilities. Empty array means clear.
 */
export function checkUtilityConflicts(
  geom: GeoJSON.Geometry,
  projectId: string,
): UtilityConflict[] {
  const utilities = useBuiltEnvironmentStore
    .getState()
    .buriedUtilities.filter((u) => u.projectId === projectId);

  if (utilities.length === 0) return [];

  const candidate = turf.feature(geom);
  const conflicts: UtilityConflict[] = [];

  for (const util of utilities) {
    if (intersectsUtility(candidate, util)) {
      conflicts.push({ id: util.id, kind: util.kind, label: util.label });
    }
  }

  return conflicts;
}

/**
 * True when the candidate earthwork comes within
 * `UTILITY_CONFLICT_BUFFER_M` of the utility line.
 *
 * Strategy: buffer the utility line by 3 m → produces a Polygon →
 * check `booleanIntersects` against the candidate geometry. Works
 * uniformly for Point / LineString / Polygon candidates.
 */
function intersectsUtility(
  candidate: GeoJSON.Feature<GeoJSON.Geometry>,
  util: BuriedUtility,
): boolean {
  const utilFeature = turf.feature(util.geometry);
  const buffered = turf.buffer(utilFeature, UTILITY_CONFLICT_BUFFER_M, {
    units: 'meters',
  });
  if (!buffered) return false;
  try {
    return turf.booleanIntersects(candidate, buffered);
  } catch {
    return false;
  }
}

/** True when the depth (cm) exceeds the configured veto threshold. */
export function depthTriggersVeto(depthCm: number | undefined): boolean {
  return typeof depthCm === 'number' && depthCm > UTILITY_CONFLICT_DEPTH_THRESHOLD_CM;
}
