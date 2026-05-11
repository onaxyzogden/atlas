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

/**
 * Arithmetic centroid of an array of `[lon, lat]` pairs. Used as a
 * single-hop proxy for "the slaughter line" when computing drive
 * times from line → each market node. Returns `null` for an empty
 * input so callers can branch on hub presence.
 *
 * Naive average is correct enough for site-scale clusters (a few
 * stations within a single farm). For continental spreads a great-
 * circle Fréchet mean would be more accurate, but Module 7 is sized
 * for one operation, not a distribution network.
 */
export function computeCentroid(
  points: Array<[number, number]>,
): [number, number] | null {
  if (points.length === 0) return null;
  let lon = 0;
  let lat = 0;
  for (const [x, y] of points) {
    lon += x;
    lat += y;
  }
  return [lon / points.length, lat / points.length];
}

export interface DriveTimeInputs {
  /** Great-circle distance, km. */
  greatCircleKm: number;
  /** Detour multiplier for road km (clamped at >= 1 inside). */
  detourMultiplier: number;
  /** Average drive speed, km/h (clamped at >= 1 inside). */
  avgSpeedKmh: number;
}

export interface DriveTime {
  /** Road km after detour multiplier. */
  roadKm: number;
  /** Drive time, minutes. */
  minutes: number;
}

/**
 * Convert a great-circle km figure into road km + minutes.
 * Detour multiplier and average speed are clamped at 1 so a steward
 * mid-edit (temporarily 0) never explodes the rollup.
 *
 * The card calls turf.distance once per market node to get
 * `greatCircleKm` then runs this helper — the road-km × minute
 * arithmetic is the part that's testable without turf's geodesy.
 */
export function computeDriveTime(i: DriveTimeInputs): DriveTime {
  const safeMult = Math.max(i.detourMultiplier, 1);
  const safeSpeed = Math.max(i.avgSpeedKmh, 1);
  const roadKm = i.greatCircleKm * safeMult;
  const minutes = (roadKm / safeSpeed) * 60;
  return { roadKm, minutes };
}
