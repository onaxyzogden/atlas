/**
 * Cashflow engine — year-by-year projection combining phased capital costs
 * with ramping revenue streams.
 */

import type { BuildPhase } from '../../../store/phaseStore.js';
import type { CostLineItem, CostRange, RevenueStream, YearlyCashflow } from './types.js';
import { costRange } from './types.js';

/** Operating cost rate as fraction of cumulative capital invested */
const OPERATING_COST_RATE = 0.05;

/**
 * Parse a phase timeframe string into start and end years.
 * Examples: "Year 0-1" -> [0, 1], "Year 1-3" -> [1, 3], "Year 5+" -> [5, 10]
 */
function parseTimeframe(timeframe: string): [number, number] {
  const match = timeframe.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (match?.[1] && match[2]) return [parseInt(match[1], 10), parseInt(match[2], 10)];

  const plusMatch = timeframe.match(/(\d+)\s*\+/);
  if (plusMatch?.[1]) return [parseInt(plusMatch[1], 10), 10];

  const singleMatch = timeframe.match(/(\d+)/);
  if (singleMatch?.[1]) {
    const y = parseInt(singleMatch[1], 10);
    return [y, y + 1];
  }

  return [0, 1];
}

/**
 * Build a mapping from phase name to the years it spans.
 */
function buildPhaseYearMap(phases: BuildPhase[]): Map<string, [number, number]> {
  const map = new Map<string, [number, number]>();
  for (const phase of phases) {
    map.set(phase.name, parseTimeframe(phase.timeframe));
  }
  return map;
}

/**
 * Distribute a cost across the years of its assigned phase.
 */
function distributeCostAcrossYears(
  cost: CostRange,
  phaseYears: [number, number],
  maxYear: number,
): Map<number, CostRange> {
  const [start, end] = phaseYears;
  const yearCount = Math.max(1, Math.min(end, maxYear) - start + 1);
  const perYear: CostRange = {
    low: Math.round(cost.low / yearCount),
    mid: Math.round(cost.mid / yearCount),
    high: Math.round(cost.high / yearCount),
  };

  const yearMap = new Map<number, CostRange>();
  for (let y = start; y <= Math.min(end, maxYear); y++) {
    yearMap.set(y, { ...perYear });
  }
  return yearMap;
}

export function computeCashflow(
  costItems: CostLineItem[],
  revenueStreams: RevenueStream[],
  phases: BuildPhase[],
  years: number = 10,
): YearlyCashflow[] {
  const phaseYearMap = buildPhaseYearMap(phases);
  const cashflow: YearlyCashflow[] = [];

  // Pre-compute yearly capital cost distributions
  const yearlyCosts = new Map<number, CostRange>();
  for (let y = 0; y <= years; y++) {
    yearlyCosts.set(y, costRange(0, 0));
  }

  for (const item of costItems) {
    const phaseYears = phaseYearMap.get(item.phaseName) ?? [0, 1];
    const distribution = distributeCostAcrossYears(item.cost, phaseYears, years);

    for (const [year, cost] of distribution) {
      const existing = yearlyCosts.get(year)!;
      existing.low += cost.low;
      existing.mid += cost.mid;
      existing.high += cost.high;
    }
  }

  // Compute year-by-year
  let cumulativeLow = 0;
  let cumulativeMid = 0;
  let cumulativeHigh = 0;
  let cumulativeCapitalLow = 0;
  let cumulativeCapitalMid = 0;
  let cumulativeCapitalHigh = 0;

  for (let y = 0; y <= years; y++) {
    const capitalCosts = yearlyCosts.get(y) ?? costRange(0, 0);

    // Track cumulative capital for operating cost calculation
    cumulativeCapitalLow += capitalCosts.low;
    cumulativeCapitalMid += capitalCosts.mid;
    cumulativeCapitalHigh += capitalCosts.high;

    // Operating costs scale with cumulative capital invested
    const operatingCosts: CostRange = {
      low: Math.round(cumulativeCapitalLow * OPERATING_COST_RATE),
      mid: Math.round(cumulativeCapitalMid * OPERATING_COST_RATE),
      high: Math.round(cumulativeCapitalHigh * OPERATING_COST_RATE),
    };

    // Revenue: sum across all streams using their ramp schedules
    const revenue: CostRange = costRange(0, 0);
    for (const stream of revenueStreams) {
      const ramp = stream.rampSchedule[y] ?? 0;
      revenue.low += Math.round(stream.annualRevenue.low * ramp);
      revenue.mid += Math.round(stream.annualRevenue.mid * ramp);
      revenue.high += Math.round(stream.annualRevenue.high * ramp);
    }

    // Net = revenue - capital costs - operating costs
    // Note: "low" scenario = low revenue, high costs (worst case)
    // "high" scenario = high revenue, low costs (best case)
    const netCashflow: CostRange = {
      low: revenue.low - capitalCosts.high - operatingCosts.high,
      mid: revenue.mid - capitalCosts.mid - operatingCosts.mid,
      high: revenue.high - capitalCosts.low - operatingCosts.low,
    };

    cumulativeLow += netCashflow.low;
    cumulativeMid += netCashflow.mid;
    cumulativeHigh += netCashflow.high;

    cashflow.push({
      year: y,
      capitalCosts,
      operatingCosts,
      revenue,
      netCashflow,
      cumulativeCashflow: {
        low: cumulativeLow,
        mid: cumulativeMid,
        high: cumulativeHigh,
      },
    });
  }

  return cashflow;
}
