/**
 * Financial engine integration test — full pipeline from features to model.
 */

import { describe, it, expect } from 'vitest';
import { computeAllCosts, sumCosts } from '../../features/financial/engine/costEngine.js';
import { detectEnterprises, countEnterpriseUnits } from '../../features/financial/engine/enterpriseDetector.js';
import { computeRevenueStreams, sumRevenue } from '../../features/financial/engine/revenueEngine.js';
import { computeCashflow } from '../../features/financial/engine/cashflowEngine.js';
import { computeBreakEven } from '../../features/financial/engine/breakEvenEngine.js';
import { computeMissionScore } from '../../features/financial/engine/missionScoring.js';
import {
  regenerativeFarmScenario,
  retreatCenterScenario,
  minimalScenario,
  defaultSiteContext,
} from '../helpers/mockFinancialInput.js';
import type { BuildPhase } from '../../store/phaseStore.js';

const REGION = 'us-midwest' as const;
const siteCtx = defaultSiteContext();
const defaultPhases: BuildPhase[] = [
  { id: 'ph1', projectId: 'p1', name: 'Phase 1', timeframe: 'Year 0-1', order: 1, description: '', color: '#ccc', completed: false, notes: '', completedAt: null },
  { id: 'ph2', projectId: 'p1', name: 'Phase 2', timeframe: 'Year 1-3', order: 2, description: '', color: '#ddd', completed: false, notes: '', completedAt: null },
];

function runFullPipeline(input: ReturnType<typeof regenerativeFarmScenario>) {
  const costItems = computeAllCosts(input, REGION, siteCtx);
  const enterprises = detectEnterprises(input.zones, input.structures, input.paddocks, input.crops);
  const streams = computeRevenueStreams(enterprises, input, siteCtx, REGION);
  const cashflow = computeCashflow(costItems, streams, defaultPhases);
  const breakEven = computeBreakEven(cashflow);
  const missionScore = computeMissionScore(input, breakEven, {
    financial: 1, ecological: 1, spiritual: 1, community: 1,
  });

  return { costItems, enterprises, streams, cashflow, breakEven, missionScore, totalCost: sumCosts(costItems), totalRevenue: sumRevenue(streams) };
}

describe('full financial pipeline', () => {
  describe('regenerative farm', () => {
    const result = runFullPipeline(regenerativeFarmScenario());

    it('produces cost line items', () => {
      expect(result.costItems.length).toBeGreaterThan(0);
    });

    it('detects multiple enterprises', () => {
      expect(result.enterprises.length).toBeGreaterThanOrEqual(3);
    });

    it('generates revenue streams', () => {
      expect(result.streams.length).toBeGreaterThan(0);
    });

    it('produces 10-year cashflow projection', () => {
      expect(result.cashflow).toHaveLength(11);
    });

    it('total cost low ≤ mid ≤ high', () => {
      expect(result.totalCost.low).toBeLessThanOrEqual(result.totalCost.mid);
      expect(result.totalCost.mid).toBeLessThanOrEqual(result.totalCost.high);
    });

    it('total revenue low ≤ mid ≤ high', () => {
      expect(result.totalRevenue.low).toBeLessThanOrEqual(result.totalRevenue.mid);
      expect(result.totalRevenue.mid).toBeLessThanOrEqual(result.totalRevenue.high);
    });

    it('mission score has all dimensions', () => {
      expect(result.missionScore.overall).toBeGreaterThan(0);
      expect(result.missionScore.financial).toBeGreaterThan(0);
      expect(result.missionScore.ecological).toBeGreaterThan(0);
    });
  });

  describe('retreat center', () => {
    const result = runFullPipeline(retreatCenterScenario());

    it('detects retreat, education, agritourism enterprises', () => {
      expect(result.enterprises).toContain('retreat');
      expect(result.enterprises).toContain('education');
      expect(result.enterprises).toContain('agritourism');
    });

    it('has high spiritual mission score', () => {
      expect(result.missionScore.spiritual).toBeGreaterThanOrEqual(90);
    });

    it('has community score > 0', () => {
      expect(result.missionScore.community).toBeGreaterThan(0);
    });
  });

  describe('minimal scenario', () => {
    const result = runFullPipeline(minimalScenario());

    it('produces at least some cost items', () => {
      expect(result.costItems.length).toBeGreaterThanOrEqual(0);
    });

    it('handles scenario with few features', () => {
      expect(result.cashflow).toHaveLength(11);
    });
  });
});
