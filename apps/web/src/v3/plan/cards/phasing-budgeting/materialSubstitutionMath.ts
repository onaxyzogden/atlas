/**
 * materialSubstitutionMath — pure derivations for Rec #5 v2
 * (Material substitution calculator, Permaculture Scholar review
 * 2026-04-28; v2 deferred-queue, 2026-05-25).
 *
 * This module holds the *math* that the catalog data feeds:
 *   - regional cost realism (`resolveCostMultiplier`),
 *   - the ecological mission uplift derived from applied substitutions
 *     (`sumEcoUplift`),
 *   - the per-item establishment-time delta (`establishmentDeltaByItemId`).
 *
 * **Covenant boundary (load-bearing).** The uplift produced here routes
 * to the *ecological* component of `missionScoring` ONLY. It is an
 * ecological-impact signal, never a financial return. `scoreFinancial`
 * is break-even-year-based (a financial-return surface) and MUST remain
 * byte-identical whether or not any substitution uplift is present — the
 * covenant guard test in `missionScoring` asserts exactly that. This module
 * deals only in ecological-impact points and establishment-time deltas;
 * it produces no financial-return figure of any kind. Region multipliers
 * below are *cost realism* (what the work costs in a place), not returns.
 */

import type { CostRange, CostRegion } from '../../../../features/financial/engine/types.js';

// ── Region cost realism ────────────────────────────────────────────────────

/**
 * Per-region cost-of-establishment multipliers. These scale the *cost* of
 * standing up a biological substitution (labour + materials availability),
 * not any return. Anchored to the same ca-ontario baseline (=1.00) the
 * financial engine's `region` default uses, so an unset/baseline region is
 * a no-op.
 */
export const REGION_MULTIPLIERS: Record<CostRegion, number> = {
  'us-midwest': 0.95,
  'us-northeast': 1.12,
  'us-southeast': 0.9,
  'us-west': 1.18,
  'ca-ontario': 1.0,
  'ca-bc': 1.15,
  'ca-prairies': 0.92,
};

/** The neutral region whose multiplier is 1.00 (baseline, no cost shift). */
export const BASELINE_REGION: CostRegion = 'ca-ontario';

/**
 * Scale a fractional cost-multiplier CostRange by the region factor. The
 * result is still a fractional multiplier (applied later to the original
 * line-item cost), so a baseline region returns the input unchanged.
 */
export function resolveCostMultiplier(base: CostRange, region: CostRegion): CostRange {
  const factor = REGION_MULTIPLIERS[region] ?? 1;
  return {
    low: base.low * factor,
    mid: base.mid * factor,
    high: base.high * factor,
  };
}

// ── Applied-substitution metadata ──────────────────────────────────────────

/**
 * The record the card persists per applied substitution (keyed by the cost
 * line-item id) in `financialStore.substitutionMeta`. Cost itself flows
 * through `costOverrides` (unchanged v1 path); this carries only the
 * non-cost dimensions the v2 wiring activates.
 */
export interface SubstitutionMetaEntry {
  /** 0..1 ecological mission-uplift estimate from the catalog row. */
  upliftEstimate: number;
  /** Years-to-function delta, in months, from the catalog row. */
  establishmentMonths: number;
}

/** Points scale: a full 1.0 uplift estimate maps to this many ecological points. */
export const ECO_UPLIFT_POINT_SCALE = 100;
/** Hard cap on total ecological points contributed by substitutions. */
export const ECO_UPLIFT_MAX_POINTS = 25;

/**
 * Sum the ecological mission uplift (in ecological-score *points*, 0..N) from
 * the set of applied substitutions, clamped to `ECO_UPLIFT_MAX_POINTS`. This
 * is the value threaded into `computeMissionScore`'s ecological component.
 */
export function sumEcoUplift(
  meta: Record<string, SubstitutionMetaEntry>,
): number {
  let total = 0;
  for (const entry of Object.values(meta)) {
    total += Math.max(0, entry.upliftEstimate) * ECO_UPLIFT_POINT_SCALE;
  }
  return Math.min(ECO_UPLIFT_MAX_POINTS, Math.round(total));
}

/**
 * Per-item establishment-time delta (months) from applied substitutions —
 * the lag before the biological alternative reaches function. Cost-side
 * metadata only; it carries no return.
 */
export function establishmentDeltaByItemId(
  meta: Record<string, SubstitutionMetaEntry>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [itemId, entry] of Object.entries(meta)) {
    out[itemId] = entry.establishmentMonths;
  }
  return out;
}
