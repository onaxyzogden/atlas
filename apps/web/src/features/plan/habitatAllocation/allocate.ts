/**
 * Pure allocation analysis for the Habitat Allocation dashboard
 * (Sub-project A2).
 *
 * Answers one design-time question: has the steward allocated enough
 * land to undisturbed habitat / biological corridors? Sums the area of
 * the habitat-category zones against the total parcel area and compares
 * the resulting share to the goal-tree target (`regen-habitat-pct`,
 * default 10 — the Apricot Lane set-aside).
 *
 * No network, no React, no store access — deterministic and unit-tested.
 */

import type { LandZone, ZoneCategory } from '../../../store/zoneStore.js';

/** Zone categories that count as set-aside habitat / corridor land. */
export const HABITAT_ZONE_CATEGORIES: readonly ZoneCategory[] = [
  'conservation',
  'buffer',
  'water_retention',
];

const M2_PER_ACRE = 4046.86;

export type AllocationVerdict = 'on-track' | 'under' | 'no-parcel';

export interface HabitatAllocation {
  /** Total parcel area in m² (null when acreage is unknown). */
  parcelM2: number | null;
  /** Summed area of habitat-category zones in m². */
  allocatedM2: number;
  /** Allocated share of the parcel as a percentage (0 when no parcel). */
  allocatedPct: number;
  /** Target share from the goal tree, as a percentage. */
  targetPct: number;
  /**
   * Shortfall in m² to reach the target (0 when already at/above
   * target; null when the parcel area is unknown).
   */
  gapM2: number | null;
  verdict: AllocationVerdict;
  /** Per habitat-category area breakdown in m² (only non-zero entries). */
  perCategory: Partial<Record<ZoneCategory, number>>;
}

/**
 * @param zones      every drawn zone for the project
 * @param parcelM2   total parcel area in m² (null/0 = unknown)
 * @param targetPct  target habitat share from the goal tree (e.g. 10)
 */
export function computeAllocation(
  zones: LandZone[],
  parcelM2: number | null,
  targetPct: number,
): HabitatAllocation {
  const perCategory: Partial<Record<ZoneCategory, number>> = {};
  let allocatedM2 = 0;

  for (const z of zones) {
    if (!HABITAT_ZONE_CATEGORIES.includes(z.category)) continue;
    const area = Number.isFinite(z.areaM2) ? Math.max(0, z.areaM2) : 0;
    allocatedM2 += area;
    perCategory[z.category] = (perCategory[z.category] ?? 0) + area;
  }

  const hasParcel = parcelM2 != null && parcelM2 > 0;
  const allocatedPct = hasParcel ? (allocatedM2 / parcelM2!) * 100 : 0;

  let verdict: AllocationVerdict;
  let gapM2: number | null;
  if (!hasParcel) {
    verdict = 'no-parcel';
    gapM2 = null;
  } else {
    const targetM2 = (targetPct / 100) * parcelM2!;
    gapM2 = Math.max(0, targetM2 - allocatedM2);
    // tiny epsilon so float noise doesn't flip an exactly-met target
    verdict = allocatedPct >= targetPct - 1e-9 ? 'on-track' : 'under';
  }

  return {
    parcelM2: hasParcel ? parcelM2! : null,
    allocatedM2,
    allocatedPct,
    targetPct,
    gapM2,
    verdict,
    perCategory,
  };
}

/** Acres → m². */
export function acresToM2(acres: number): number {
  return acres * M2_PER_ACRE;
}

/** m² → hectares, rounded to 2 dp (for human-readable gap callouts). */
export function m2ToHa(m2: number): number {
  return Math.round((m2 / 10_000) * 100) / 100;
}

/**
 * Resolve the habitat target % from a flattened goal-tree criteria list.
 * Falls back to the Apricot Lane 10% set-aside when the criterion is
 * absent (e.g. a non-regenerative-farm project type).
 */
export function resolveHabitatTargetPct(
  criteria: { id: string; target: number }[],
  fallback = 10,
): number {
  const c = criteria.find((x) => x.id === 'regen-habitat-pct');
  return c ? c.target : fallback;
}
