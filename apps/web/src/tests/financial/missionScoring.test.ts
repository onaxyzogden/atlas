/**
 * missionScoring.ts — tests for multi-dimensional mission scoring.
 */

import { describe, it, expect } from 'vitest';
import { computeMissionScore } from '../../features/financial/engine/missionScoring.js';
import {
  regenerativeFarmScenario,
  retreatCenterScenario,
  emptyInput,
  minimalScenario,
} from '../helpers/mockFinancialInput.js';
import type { BreakEvenResult, MissionWeights } from '../../features/financial/engine/types.js';

const defaultWeights: MissionWeights = {
  financial: 1,
  ecological: 1,
  spiritual: 1,
  community: 1,
};

function mockBreakEven(midYear: number | null): BreakEvenResult {
  return {
    breakEvenYear: { low: null, mid: midYear, high: midYear ? midYear - 1 : null },
    tenYearROI: { low: -20, mid: 50, high: 100 },
    peakNegativeCashflow: { low: -200000, mid: -150000, high: -100000 },
  };
}

describe('computeMissionScore', () => {
  it('returns overall, financial, ecological, spiritual, community', () => {
    const result = computeMissionScore(regenerativeFarmScenario(), mockBreakEven(5), defaultWeights);
    expect(result).toHaveProperty('overall');
    expect(result).toHaveProperty('financial');
    expect(result).toHaveProperty('ecological');
    expect(result).toHaveProperty('spiritual');
    expect(result).toHaveProperty('community');
  });

  it('all scores are between 0 and 100', () => {
    const result = computeMissionScore(retreatCenterScenario(), mockBreakEven(4), defaultWeights);
    for (const key of ['overall', 'financial', 'ecological', 'spiritual', 'community'] as const) {
      expect(result[key]).toBeGreaterThanOrEqual(0);
      expect(result[key]).toBeLessThanOrEqual(100);
    }
  });

  describe('financial scoring', () => {
    it('fast break-even (≤3 years) → high financial score', () => {
      const result = computeMissionScore(emptyInput(), mockBreakEven(3), defaultWeights);
      expect(result.financial).toBe(95);
    });

    it('no break-even → low financial score (10)', () => {
      const result = computeMissionScore(emptyInput(), mockBreakEven(null), defaultWeights);
      expect(result.financial).toBe(10);
    });

    it('slow break-even (>8 years) → score of 20', () => {
      const result = computeMissionScore(emptyInput(), mockBreakEven(9), defaultWeights);
      expect(result.financial).toBe(20);
    });
  });

  describe('ecological scoring', () => {
    it('conservation-heavy zones → high ecological', () => {
      const result = computeMissionScore(
        {
          ...emptyInput(),
          zones: [
            { id: 'z1', projectId: 'p1', name: 'Conservation', category: 'conservation', areaM2: 80000 },
            { id: 'z2', projectId: 'p1', name: 'Habitation', category: 'habitation', areaM2: 5000 },
          ],
        },
        mockBreakEven(5),
        defaultWeights,
      );
      // 80000 / 85000 ≈ 94% → score 95
      expect(result.ecological).toBe(95);
    });

    it('no zones → ecological score of 0', () => {
      const result = computeMissionScore(emptyInput(), mockBreakEven(5), defaultWeights);
      expect(result.ecological).toBe(0);
    });

    it('small conservation ratio → low score', () => {
      const result = computeMissionScore(
        {
          ...emptyInput(),
          zones: [
            { id: 'z1', projectId: 'p1', name: 'Conservation', category: 'conservation', areaM2: 2000 },
            { id: 'z2', projectId: 'p1', name: 'Habitation', category: 'habitation', areaM2: 50000 },
          ],
        },
        mockBreakEven(5),
        defaultWeights,
      );
      expect(result.ecological).toBeLessThanOrEqual(30);
    });
  });

  describe('spiritual scoring', () => {
    it('spiritual zone + prayer space + bathhouse → high score', () => {
      const result = computeMissionScore(retreatCenterScenario(), mockBreakEven(5), defaultWeights);
      // Has spiritual zone (40) + prayer_space (25) + bathhouse (25) + bonus
      expect(result.spiritual).toBeGreaterThanOrEqual(90);
    });

    it('no spiritual features → score of 0', () => {
      const result = computeMissionScore(emptyInput(), mockBreakEven(5), defaultWeights);
      expect(result.spiritual).toBe(0);
    });
  });

  describe('community scoring', () => {
    it('retreat center has education + commons + retreat zones', () => {
      const result = computeMissionScore(retreatCenterScenario(), mockBreakEven(5), defaultWeights);
      expect(result.community).toBeGreaterThan(0);
    });

    it('empty input → community score of 0', () => {
      const result = computeMissionScore(emptyInput(), mockBreakEven(5), defaultWeights);
      expect(result.community).toBe(0);
    });
  });

  describe('weight customization', () => {
    it('all weights = 0 → overall = 0', () => {
      const result = computeMissionScore(
        regenerativeFarmScenario(),
        mockBreakEven(5),
        { financial: 0, ecological: 0, spiritual: 0, community: 0 },
      );
      expect(result.overall).toBe(0);
    });

    it('only financial weighted → overall matches financial', () => {
      const result = computeMissionScore(
        emptyInput(),
        mockBreakEven(3),
        { financial: 1, ecological: 0, spiritual: 0, community: 0 },
      );
      expect(result.overall).toBe(result.financial);
    });

    it('unequal weights shift the overall', () => {
      const equalResult = computeMissionScore(
        retreatCenterScenario(),
        mockBreakEven(5),
        { financial: 1, ecological: 1, spiritual: 1, community: 1 },
      );
      const ecoHeavyResult = computeMissionScore(
        retreatCenterScenario(),
        mockBreakEven(5),
        { financial: 1, ecological: 10, spiritual: 1, community: 1 },
      );
      // These should differ since eco weighting changes
      expect(ecoHeavyResult.overall).not.toBe(equalResult.overall);
    });
  });
});
