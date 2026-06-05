/**
 * computeProjectBreakEven -- pure, store-free cost-recovery break-even.
 *
 * COVENANT (Amanah Gate): this is cost-recovery TIMING math only -- the year in
 * which cumulative cashflow first turns non-negative, plus the peak capital
 * outlay before recovery. It reuses the existing financial engine and returns
 * ONLY `breakEvenYear` + `peakNegativeCashflow`. It NEVER exposes `tenYearROI`
 * and carries no advance-sale / salam / CSRA / investor / yield framing
 * (wiki/decisions/2026-05-04 fiqh-csra-erased). Revenue refinement stays on the
 * steward-editable `revenueOverrides` path; there is no advance-purchase
 * anywhere in this surface.
 *
 * This file is the PURE core -- it imports only the engine + types, never a
 * store, so it loads (and tests) without Zustand rehydration. The hook-free
 * store-read layer that feeds it lives in `assembleFinancialInputs.ts`. The
 * pure core is pinned against the raw engine pipeline in
 * `__tests__/computeProjectBreakEven.test.ts`, and both it and
 * `useFinancialModel` call the same engine fns so they cannot drift.
 */

import type {
  AllFeaturesInput,
  BreakEvenResult,
  CostRange,
  CostRegion,
  SiteContext,
} from './types.js';
import { computeAllCosts, applyOverrides, sumCosts } from './costEngine.js';
import { detectEnterprises } from './enterpriseDetector.js';
import { computeRevenueStreams, applyRevenueOverrides } from './revenueEngine.js';
import { computeCashflow } from './cashflowEngine.js';
import { computeBreakEven } from './breakEvenEngine.js';
import type { BuildPhase } from '../../../store/phaseStore.js';

/** Everything the cost-recovery pipeline needs, already read out of the stores. */
export interface AssembledFinancialInputs {
  features: AllFeaturesInput;
  region: CostRegion;
  costOverrides: Record<string, Partial<CostRange>>;
  revenueOverrides: Record<string, Partial<CostRange>>;
  phases: BuildPhase[];
  siteContext: SiteContext;
}

/** Cost-recovery-only projection. Deliberately a STRICT SUBSET of
 *  BreakEvenResult -- `tenYearROI` is intentionally absent. */
export interface ProjectBreakEven {
  /**
   * True once the project has >=1 detected enterprise AND non-zero capital --
   * i.e. a cost-recovery model can be computed. `breakEvenYear` may still be
   * all-null ("never recovers within the 10-year horizon") while `hasModel`
   * stays true; the auto-satisfy path keys off `hasModel`, per the locked
   * "computed, even if never" decision.
   */
  hasModel: boolean;
  breakEvenYear: BreakEvenResult['breakEvenYear'];
  peakNegativeCashflow: CostRange;
}

const ZERO_RANGE: CostRange = { low: 0, mid: 0, high: 0 };

const NO_MODEL: ProjectBreakEven = {
  hasModel: false,
  breakEvenYear: { low: null, mid: null, high: null },
  peakNegativeCashflow: { ...ZERO_RANGE },
};

/**
 * Run the existing financial engine over already-assembled inputs and return
 * ONLY the cost-recovery slice. Mirrors useFinancialModel's pipeline
 * (computeAllCosts -> applyOverrides -> detectEnterprises -> computeRevenueStreams
 * -> applyRevenueOverrides -> computeCashflow -> computeBreakEven).
 */
export function computeProjectBreakEven(
  inputs: AssembledFinancialInputs,
): ProjectBreakEven {
  const { features, region, costOverrides, revenueOverrides, phases, siteContext } = inputs;

  const totalFeatures =
    features.zones.length +
    features.structures.length +
    features.paddocks.length +
    features.crops.length +
    features.paths.length +
    features.utilities.length;
  if (totalFeatures === 0) return NO_MODEL;

  const rawCosts = computeAllCosts(features, region, siteContext);
  const costItems = applyOverrides(rawCosts, costOverrides);

  const enterprises = detectEnterprises(
    features.zones,
    features.structures,
    features.paddocks,
    features.crops,
  );

  const totalInvestment = sumCosts(costItems);
  const hasModel = enterprises.length > 0 && totalInvestment.mid > 0;
  if (!hasModel) return NO_MODEL;

  const rawStreams = computeRevenueStreams(enterprises, features, siteContext, region);
  const revenueStreams = applyRevenueOverrides(rawStreams, revenueOverrides);

  const cashflow = computeCashflow(costItems, revenueStreams, phases, 10);
  const breakEven = computeBreakEven(cashflow);

  // COVENANT: take ONLY the cost-recovery fields. `tenYearROI` is dropped here
  // and is never read by this surface.
  return {
    hasModel: true,
    breakEvenYear: breakEven.breakEvenYear,
    peakNegativeCashflow: breakEven.peakNegativeCashflow,
  };
}
