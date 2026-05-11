/**
 * Module 7 sizing primitives — pure types + helpers, no zustand.
 *
 * Lives in its own file so the formula can be unit-tested without
 * pulling the `persist` middleware (which crashes at module-eval in
 * vitest's node environment because there's no localStorage).
 *
 * The store re-exports these symbols, so card components import from
 * `agribusinessStore.js`; only the test imports from here directly.
 */

export interface AgribusinessSizing {
  /** Annual head count produced through this line. */
  annualHead: number;
  /** Average dressed weight per bird, kg. */
  dressedKg: number;
  /** Processing days per year (i.e. days the slaughter line actually runs). */
  processingDays: number;
  /** Carton/freezer pack density, kg/m³. */
  packDensityKgPerM3: number;
  /** Detour multiplier for drive-time rollup (great-circle → road km). */
  detourMultiplier: number;
  /** Average drive speed for drive-time rollup, km/h. */
  avgSpeedKmh: number;
}

export const DEFAULT_SIZING: AgribusinessSizing = {
  annualHead: 2000,
  dressedKg: 1.8,
  processingDays: 40,
  packDensityKgPerM3: 250,
  detourMultiplier: 1.3,
  avgSpeedKmh: 60,
};

/**
 * Steady-state weekly product, kg/wk. Treats the processing line as
 * running 5 days per processing-week, so `peak = annualKg ÷ weeks`
 * where `weeks = max(processingDays / 5, 1)`. Floor of 1 week prevents
 * divide-by-zero when a steward is mid-edit and processingDays
 * temporarily reads 0.
 *
 * Pure — exported for re-use across the three Module 7 cards and for
 * unit testing. Both ColdChainCoverageCard and MarketDistributionCard
 * derive their headline figure from this; touching the formula here
 * is the only way to drift the rollup.
 */
export function computePeakWeekKg(sizing: AgribusinessSizing): number {
  return (
    (sizing.annualHead * sizing.dressedKg) /
    Math.max(sizing.processingDays / 5, 1)
  );
}

export type ColdChainVerdict =
  | 'no-units'
  | 'no-capacity'
  | 'ok'
  | 'caution'
  | 'short';

export interface ColdChainInputs {
  unitCount: number;
  totalCapacityM3: number;
  requiredM3: number;
}

/**
 * Cold-chain coverage verdict. Cascade matches the original card
 * implementation: empty / zero-capacity cases short-circuit before
 * the percentage ladder so a "0 placed" steward sees the prompt to
 * place a unit rather than a misleading "short" verdict.
 *
 * Coverage = totalCapacityM3 / requiredM3 × 100. The 120 / 80
 * thresholds are inclusive (>=) — landing on 120 reads "ok" and
 * landing on 80 reads "caution". Coverage of 0 (no required volume
 * AND units placed with capacity) falls through to "short".
 */
export function computeColdChainVerdict(i: ColdChainInputs): ColdChainVerdict {
  if (i.unitCount === 0) return 'no-units';
  if (i.totalCapacityM3 === 0) return 'no-capacity';
  const pct = i.requiredM3 > 0 ? (i.totalCapacityM3 / i.requiredM3) * 100 : 0;
  if (pct >= 120) return 'ok';
  if (pct >= 80) return 'caution';
  return 'short';
}

export type MarketVerdict =
  | 'no-nodes'
  | 'no-demand'
  | 'undersold'
  | 'oversold'
  | 'concentrated'
  | 'ok';

export interface MarketInputs {
  nodeCount: number;
  totalDemandKg: number;
  /** Highest single-channel weekly demand, kg. */
  largestKindKg: number;
  weeklyProductKg: number;
}

/**
 * Market distribution verdict. Cascade matches the original card:
 * empty / zero-demand short-circuit; coverage band 80-120 % is "ok"
 * unless one channel takes more than 70 % of total demand (then
 * "concentrated"). Strict inequalities (`<` 80, `>` 120, `>` 0.7) —
 * landing exactly on a boundary reads "ok".
 */
export function computeMarketVerdict(i: MarketInputs): MarketVerdict {
  if (i.nodeCount === 0) return 'no-nodes';
  if (i.totalDemandKg === 0) return 'no-demand';
  const coverage =
    i.weeklyProductKg > 0 ? (i.totalDemandKg / i.weeklyProductKg) * 100 : 0;
  if (coverage < 80) return 'undersold';
  if (coverage > 120) return 'oversold';
  const concentration =
    i.totalDemandKg > 0 ? i.largestKindKg / i.totalDemandKg : 0;
  if (concentration > 0.7) return 'concentrated';
  return 'ok';
}
