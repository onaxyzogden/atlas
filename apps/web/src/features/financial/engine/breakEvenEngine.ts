/**
 * Break-even analysis — finds the year where cumulative cashflow
 * turns positive under each scenario level.
 */

import type { BreakEvenResult, CostRange, YearlyCashflow } from './types.js';

export function computeBreakEven(cashflow: YearlyCashflow[]): BreakEvenResult {
  const findBreakEvenYear = (level: 'low' | 'mid' | 'high'): number | null => {
    for (const year of cashflow) {
      if (year.cumulativeCashflow[level] >= 0 && year.year > 0) {
        return year.year;
      }
    }
    return null;
  };

  // Total investment = sum of all capital costs
  const totalInvestment: CostRange = cashflow.reduce(
    (acc, y) => ({
      low: acc.low + y.capitalCosts.low,
      mid: acc.mid + y.capitalCosts.mid,
      high: acc.high + y.capitalCosts.high,
    }),
    { low: 0, mid: 0, high: 0 },
  );

  // 10-year ROI
  const lastYear = cashflow[cashflow.length - 1];
  const tenYearROI: CostRange = {
    low: totalInvestment.high > 0
      ? Math.round((lastYear?.cumulativeCashflow.low ?? 0) / totalInvestment.high * 100)
      : 0,
    mid: totalInvestment.mid > 0
      ? Math.round((lastYear?.cumulativeCashflow.mid ?? 0) / totalInvestment.mid * 100)
      : 0,
    high: totalInvestment.low > 0
      ? Math.round((lastYear?.cumulativeCashflow.high ?? 0) / totalInvestment.low * 100)
      : 0,
  };

  // Peak negative cashflow (maximum cash outlay)
  const peakNegativeCashflow: CostRange = {
    low: Math.min(...cashflow.map((y) => y.cumulativeCashflow.low)),
    mid: Math.min(...cashflow.map((y) => y.cumulativeCashflow.mid)),
    high: Math.min(...cashflow.map((y) => y.cumulativeCashflow.high)),
  };

  return {
    breakEvenYear: {
      low: findBreakEvenYear('low'),
      mid: findBreakEvenYear('mid'),
      high: findBreakEvenYear('high'),
    },
    tenYearROI,
    peakNegativeCashflow,
  };
}
