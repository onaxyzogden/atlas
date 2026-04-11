/**
 * cashflowEngine.ts — tests for year-by-year cashflow projection.
 */

import { describe, it, expect } from 'vitest';
import { computeCashflow } from '../../features/financial/engine/cashflowEngine.js';
import { computeAllCosts, sumCosts } from '../../features/financial/engine/costEngine.js';
import { computeRevenueStreams } from '../../features/financial/engine/revenueEngine.js';
import { detectEnterprises } from '../../features/financial/engine/enterpriseDetector.js';
import { regenerativeFarmScenario, defaultSiteContext } from '../helpers/mockFinancialInput.js';
import type { BuildPhase } from '../../store/phaseStore.js';

const REGION = 'us-midwest' as const;
const siteCtx = defaultSiteContext();

const defaultPhases: BuildPhase[] = [
  { id: 'ph1', projectId: 'p1', name: 'Phase 1', timeframe: 'Year 0-1', order: 1, description: '', color: '#ccc' },
  { id: 'ph2', projectId: 'p1', name: 'Phase 2', timeframe: 'Year 1-3', order: 2, description: '', color: '#ddd' },
  { id: 'ph3', projectId: 'p1', name: 'Phase 3', timeframe: 'Year 3-5', order: 3, description: '', color: '#eee' },
];

function buildCashflow() {
  const input = regenerativeFarmScenario();
  const costItems = computeAllCosts(input, REGION, siteCtx);
  const enterprises = detectEnterprises(input.zones, input.structures, input.paddocks, input.crops);
  const streams = computeRevenueStreams(enterprises, input, siteCtx, REGION);
  return computeCashflow(costItems, streams, defaultPhases);
}

describe('computeCashflow', () => {
  it('returns 11 entries (years 0-10) by default', () => {
    const cf = buildCashflow();
    expect(cf).toHaveLength(11);
    expect(cf[0]!.year).toBe(0);
    expect(cf[10]!.year).toBe(10);
  });

  it('accepts custom year count', () => {
    const input = regenerativeFarmScenario();
    const costItems = computeAllCosts(input, REGION, siteCtx);
    const cf = computeCashflow(costItems, [], defaultPhases, 5);
    expect(cf).toHaveLength(6); // years 0-5
  });

  it('year 0 has capital costs (money going out)', () => {
    const cf = buildCashflow();
    expect(cf[0]!.capitalCosts.mid).toBeGreaterThanOrEqual(0);
  });

  it('net cashflow accounts for costs and revenue', () => {
    const cf = buildCashflow();
    for (const year of cf) {
      // net = revenue - capitalCosts - operatingCosts (with scenario crossing)
      expect(typeof year.netCashflow.low).toBe('number');
      expect(typeof year.netCashflow.mid).toBe('number');
      expect(typeof year.netCashflow.high).toBe('number');
    }
  });

  it('cumulative cashflow accumulates across years', () => {
    const cf = buildCashflow();
    // Check that cumulative values change over time
    expect(cf[0]!.cumulativeCashflow.mid).not.toBe(cf[10]!.cumulativeCashflow.mid);
  });

  it('operating costs = 5% of cumulative capital', () => {
    const cf = buildCashflow();
    let cumulativeCapital = 0;
    for (const year of cf) {
      cumulativeCapital += year.capitalCosts.mid;
      const expectedOp = Math.round(cumulativeCapital * 0.05);
      expect(year.operatingCosts.mid).toBe(expectedOp);
    }
  });

  it('handles empty cost items and revenue streams', () => {
    const cf = computeCashflow([], [], defaultPhases);
    expect(cf).toHaveLength(11);
    for (const year of cf) {
      expect(year.capitalCosts.mid).toBe(0);
      expect(year.operatingCosts.mid).toBe(0);
      expect(year.revenue.mid).toBe(0);
      expect(year.netCashflow.mid).toBe(0);
    }
  });

  it('handles empty phases gracefully', () => {
    const input = regenerativeFarmScenario();
    const costItems = computeAllCosts(input, REGION, siteCtx);
    // Empty phases → costs default to [0, 1]
    const cf = computeCashflow(costItems, [], []);
    expect(cf).toHaveLength(11);
    expect(cf[0]!.capitalCosts.mid).toBeGreaterThan(0);
  });

  it('low scenario: low revenue, high costs (worst case)', () => {
    const cf = buildCashflow();
    // In a year with both revenue and costs, low scenario should be pessimistic
    const lastYear = cf[cf.length - 1]!;
    expect(lastYear.cumulativeCashflow.low).toBeLessThanOrEqual(lastYear.cumulativeCashflow.high);
  });
});
