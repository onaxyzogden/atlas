/**
 * transitionBudget — Phase D.1.
 *
 * Aggregates `YearlyCashflow[]` into a per-year transition-phase view used
 * by the J-curve renderer (D.4) and the Capital Partner Summary PDF embed
 * (D.7). The Apricot-Lane protocol's Phase 3 J-curve frames regeneration
 * as an early-years dip (capex-heavy establishment) followed by build-up
 * and maturation as revenue ramps and natural-capital appreciation
 * compounds.
 *
 * Decoupled signature: the canonical engine takes a pre-computed
 * `YearlyCashflow[]` so callers that already have one (ScenarioPage,
 * scenarioStore) don't recompute. A thin convenience wrapper
 * (`computeTransitionBudgetFromInputs`) calls `computeCashflow` for
 * callers without one.
 *
 * Phase-band mapping (3-band, year-0 collapses into establishment):
 *   year ≤ 2 → 'establishment'
 *   3 ≤ year ≤ 5 → 'build-up'
 *   year ≥ 6 → 'maturation'
 *
 * Covenant: this module is operating-estimate math. No advance-purchase /
 * ROI / yield framing — labels stay neutral ("revenue", "netCashflow",
 * "cumulativeNetCashflow"). See [[fiqh-csra-erased-2026-05-04]].
 */

import type { CostLineItem, RevenueStream, YearlyCashflow } from './types.js';
import { computeCashflow } from './cashflowEngine.js';
import type { BuildPhase } from '../../../store/phaseStore.js';

export type TransitionPhase = 'establishment' | 'build-up' | 'maturation';

export interface TransitionYear {
  /** 0-indexed year matching `YearlyCashflow.year`. */
  year: number;
  /** Establishment 0-2, build-up 3-5, maturation 6+. */
  phase: TransitionPhase;
  /** `YearlyCashflow.capitalCosts.mid`. */
  capex: number;
  /** `YearlyCashflow.operatingCosts.mid`. */
  opex: number;
  /** `YearlyCashflow.revenue.mid`. */
  revenue: number;
  /**
   * `revenue / max(revenue across horizon)` — 0..1 ramp scalar against
   * the horizon plateau. 0 when plateau is 0 (degenerate / pre-revenue).
   */
  revenueScalar: number;
  /** `YearlyCashflow.netCashflow.mid`. */
  netCashflow: number;
  /** `YearlyCashflow.cumulativeCashflow.mid`. */
  cumulativeNetCashflow: number;
}

export interface JCurveTrough {
  /** argmin cumulativeNetCashflow; null on empty input. Ties → earliest. */
  troughYear: number | null;
  /** Value at trough (typically ≤ 0); 0 on empty input. */
  troughValue: number;
  /**
   * First year `≥ troughYear` where `cumulativeNetCashflow ≥ 0`. `null`
   * if the trajectory never recovers within the horizon.
   */
  breakevenYear: number | null;
}

function phaseFor(year: number): TransitionPhase {
  if (year <= 2) return 'establishment';
  if (year <= 5) return 'build-up';
  return 'maturation';
}

/**
 * Canonical decoupled engine. Labels each year's transition phase and
 * computes `revenueScalar` against the horizon plateau. Pure function;
 * length matches `cashflow.length`.
 */
export function computeTransitionBudget(cashflow: YearlyCashflow[]): TransitionYear[] {
  if (cashflow.length === 0) return [];

  let plateauMid = 0;
  for (const row of cashflow) {
    if (row.revenue.mid > plateauMid) plateauMid = row.revenue.mid;
  }

  return cashflow.map((row) => ({
    year: row.year,
    phase: phaseFor(row.year),
    capex: row.capitalCosts.mid,
    opex: row.operatingCosts.mid,
    revenue: row.revenue.mid,
    revenueScalar: plateauMid > 0 ? row.revenue.mid / plateauMid : 0,
    netCashflow: row.netCashflow.mid,
    cumulativeNetCashflow: row.cumulativeCashflow.mid,
  }));
}

/**
 * Convenience wrapper for callers without a pre-computed cashflow.
 * One-liner: `computeTransitionBudget(computeCashflow(...))`. Default
 * horizon matches `computeCashflow` (10 years).
 */
export function computeTransitionBudgetFromInputs(input: {
  costItems: CostLineItem[];
  revenueStreams: RevenueStream[];
  phases: BuildPhase[];
  horizonYears?: number;
}): TransitionYear[] {
  const horizon = input.horizonYears ?? 10;
  return computeTransitionBudget(
    computeCashflow(input.costItems, input.revenueStreams, input.phases, horizon),
  );
}

/**
 * Detect the J-curve trough (argmin cumulative net) and the first
 * breakeven crossing at or after it. Degenerate empty input returns
 * `{ troughYear: null, troughValue: 0, breakevenYear: null }`.
 */
export function jCurveTrough(years: TransitionYear[]): JCurveTrough {
  if (years.length === 0) {
    return { troughYear: null, troughValue: 0, breakevenYear: null };
  }

  let troughYear = years[0]!.year;
  let troughValue = years[0]!.cumulativeNetCashflow;
  for (const row of years) {
    if (row.cumulativeNetCashflow < troughValue) {
      troughValue = row.cumulativeNetCashflow;
      troughYear = row.year;
    }
  }

  let breakevenYear: number | null = null;
  for (const row of years) {
    if (row.year < troughYear) continue;
    if (row.cumulativeNetCashflow >= 0) {
      breakevenYear = row.year;
      break;
    }
  }

  return { troughYear, troughValue, breakevenYear };
}
