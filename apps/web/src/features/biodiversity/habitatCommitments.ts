/**
 * habitatCommitments — pure selectors over `designElementsStore` that
 * group the unified habitat DesignElement kinds back into a tally shape
 * comparable to the legacy `habitatFeatureStore` rollup.
 *
 * Reads from the post-unification truth source: every habitat commitment
 * is a placed DesignElement (point / line / polygon) with a known
 * `kind`. Used by:
 *   - `FeatureInventoryPanel` (A2) — "Placed on map" summary block.
 *   - `BiodiversityMonitorCard` (A3) — planned-commitments sub-panel.
 *
 * Strictly informational; no covenant. Counts derive from geometry, never
 * from financial or yield-as-return notions.
 */

import * as turf from '@turf/turf';
import type { DesignElement } from '../../store/designElementsStore.js';

/**
 * The seven first-class habitat-only kinds added 2026-05-21, plus the
 * three pre-existing shared kinds (hedgerow / pond / shrub) that B5
 * counts toward habitat coverage too.
 */
export type HabitatCommitmentKind =
  | 'owl-box'
  | 'raptor-perch'
  | 'nest-box'
  | 'brush-pile'
  | 'snag'
  | 'insectary-strip'
  | 'wetland-edge'
  | 'hedgerow'
  | 'pond'
  | 'shrub';

export const HABITAT_COMMITMENT_KINDS: HabitatCommitmentKind[] = [
  'owl-box',
  'raptor-perch',
  'nest-box',
  'brush-pile',
  'snag',
  'insectary-strip',
  'wetland-edge',
  'hedgerow',
  'pond',
  'shrub',
];

export const HABITAT_COMMITMENT_LABELS: Record<HabitatCommitmentKind, string> = {
  'owl-box': 'Owl box',
  'raptor-perch': 'Raptor perch',
  'nest-box': 'Nest box',
  'brush-pile': 'Brush pile',
  snag: 'Standing snag',
  'insectary-strip': 'Insectary strip',
  'wetland-edge': 'Wetland edge',
  hedgerow: 'Hedgerow',
  pond: 'Wildlife pond',
  shrub: 'Shrub',
};

export type HabitatCommitmentUnit = 'count' | 'length-m' | 'area-m2';

export const HABITAT_COMMITMENT_UNIT: Record<
  HabitatCommitmentKind,
  HabitatCommitmentUnit
> = {
  'owl-box': 'count',
  'raptor-perch': 'count',
  'nest-box': 'count',
  'brush-pile': 'count',
  snag: 'count',
  shrub: 'count',
  hedgerow: 'length-m',
  'insectary-strip': 'length-m',
  pond: 'area-m2',
  'wetland-edge': 'area-m2',
};

export interface HabitatCommitmentTally {
  kind: HabitatCommitmentKind;
  label: string;
  unit: HabitatCommitmentUnit;
  /** Number of placed elements of this kind. */
  placed: number;
  /** Sum of line lengths in metres (when `unit === 'length-m'`); otherwise 0. */
  totalLengthM: number;
  /** Sum of polygon areas in m² (when `unit === 'area-m2'`); otherwise 0. */
  totalAreaM2: number;
}

function safeLineLengthM(geometry: GeoJSON.Geometry | null | undefined): number {
  if (!geometry || geometry.type !== 'LineString') return 0;
  try {
    return turf.length(turf.lineString(geometry.coordinates), {
      units: 'meters',
    });
  } catch {
    return 0;
  }
}

function safePolygonAreaM2(
  geometry: GeoJSON.Geometry | null | undefined,
): number {
  if (!geometry || geometry.type !== 'Polygon') return 0;
  try {
    return turf.area(turf.polygon(geometry.coordinates));
  } catch {
    return 0;
  }
}

/**
 * Group habitat-relevant design elements by kind. Returns one row per
 * known `HabitatCommitmentKind`, even when nothing has been placed
 * (so the UI can render an empty row consistently).
 */
export function selectHabitatCommitments(
  designElements: DesignElement[],
): HabitatCommitmentTally[] {
  const rows: HabitatCommitmentTally[] = HABITAT_COMMITMENT_KINDS.map((k) => ({
    kind: k,
    label: HABITAT_COMMITMENT_LABELS[k],
    unit: HABITAT_COMMITMENT_UNIT[k],
    placed: 0,
    totalLengthM: 0,
    totalAreaM2: 0,
  }));
  const byKind = new Map<HabitatCommitmentKind, HabitatCommitmentTally>(
    rows.map((r) => [r.kind, r]),
  );

  for (const el of designElements) {
    const row = byKind.get(el.kind as HabitatCommitmentKind);
    if (!row) continue;
    row.placed += 1;
    if (row.unit === 'length-m') {
      row.totalLengthM += safeLineLengthM(el.geometry);
    } else if (row.unit === 'area-m2') {
      row.totalAreaM2 += safePolygonAreaM2(el.geometry);
    }
  }

  return rows;
}

/** Filter to only the non-zero rows — useful for compact summary UI. */
export function selectPlacedHabitatCommitments(
  designElements: DesignElement[],
): HabitatCommitmentTally[] {
  return selectHabitatCommitments(designElements).filter((r) => r.placed > 0);
}
