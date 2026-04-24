/**
 * breakEvenEngine.ts — tests for break-even analysis.
 */

import { describe, it, expect } from 'vitest';
import { computeBreakEven } from '../../features/financial/engine/breakEvenEngine.js';
import { computeCashflow } from '../../features/financial/engine/cashflowEngine.js';
import { computeAllCosts } from '../../features/financial/engine/costEngine.js';
import { computeRevenueStreams } from '../../features/financial/engine/revenueEngine.js';
import { detectEnterprises } from '../../features/financial/engine/enterpriseDetector.js';
import { regenerativeFarmScenario, emptyInput, defaultSiteContext } from '../helpers/mockFinancialInput.js';
import type { BuildPhase } from '../../store/phaseStore.js';
import type { YearlyCashflow, CostRange } from '../../features/financial/engine/types.js';

const REGION = 'us-midwest' as const;
const siteCtx = defaultSiteContext();

const defaultPhases: BuildPhase[] = [
  { id: 'ph1', projectId: 'p1', name: 'Phase 1', timeframe: 'Year 0-1', order: 1, description: '', color: '#ccc', completed: false, notes: '', completedAt: null },
  { id: 'ph2', projectId: 'p1', name: 'Phase 2', timeframe: 'Year 1-3', order: 2, description: '', color: '#ddd', completed: false, notes: '', completedAt: null },
];

function buildBreakEven() {
  const input = regenerativeFarmScenario();
  const costItems = computeAllCosts(input, REGION, siteCtx);
  const enterprises = detectEnterprises(input.zones, input.structures, input.paddocks, input.crops);
  const streams = computeRevenueStreams(enterprises, input, siteCtx, REGION);
  const cashflow = computeCashflow(costItems, streams, defaultPhases);
  return computeBreakEven(cashflow);
}

describe('computeBreakEven', () => {
  it('returns breakEvenYear, tenYearROI, peakNegativeCashflow', () => {
    const result = buildBreakEven();
    expect(result).toHaveProperty('breakEvenYear');
    expect(result).toHaveProperty('tenYearROI');
    expect(result).toHaveProperty('peakNegativeCashflow');
  });

  it('breakEvenYear values are numbers or null', () => {
    const result = buildBreakEven();
    for (const level of ['low', 'mid', 'high'] as const) {
      const val = result.breakEvenYear[level];
      expect(val === null || (typeof val === 'number' && val > 0)).toBe(true);
    }
  });

  it('tenYearROI has low/mid/high', () => {
    const result = buildBreakEven();
    expect(typeof result.tenYearROI.low).toBe('number');
    expect(typeof result.tenYearROI.mid).toBe('number');
    expect(typeof result.tenYearROI.high).toBe('number');
  });

  it('peakNegativeCashflow is negative or zero', () => {
    const result = buildBreakEven();
    expect(result.peakNegativeCashflow.low).toBeLessThanOrEqual(0);
    expect(result.peakNegativeCashflow.mid).toBeLessThanOrEqual(0);
  });

  it('returns null break-even for costs-only (never profitable)', () => {
    const input = regenerativeFarmScenario();
    const costItems = computeAllCosts(input, REGION, siteCtx);
    // No revenue streams → never breaks even
    const cashflow = computeCashflow(costItems, [], defaultPhases);
    const result = computeBreakEven(cashflow);
    expect(result.breakEvenYear.low).toBeNull();
    expect(result.breakEvenYear.mid).toBeNull();
    expect(result.breakEvenYear.high).toBeNull();
  });

  it('handles empty cashflow array', () => {
    const result = computeBreakEven([]);
    expect(result.breakEvenYear.low).toBeNull();
    expect(result.breakEvenYear.mid).toBeNull();
    expect(result.breakEvenYear.high).toBeNull();
  });

  it('ROI is 0 when no investment', () => {
    const cashflow = computeCashflow([], [], defaultPhases);
    const result = computeBreakEven(cashflow);
    expect(result.tenYearROI.low).toBe(0);
    expect(result.tenYearROI.mid).toBe(0);
    expect(result.tenYearROI.high).toBe(0);
  });
});
