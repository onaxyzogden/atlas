/**
 * transitionBudget tests — Phase D.1.
 *
 * Cover:
 *  - phase labelling (year 0-2 establishment, 3-5 build-up, 6+ maturation)
 *  - capex / opex / revenue / netCashflow / cumulativeNetCashflow passthrough
 *  - revenueScalar monotone non-decreasing for a single saturating stream
 *  - jCurveTrough: trough detected, breakeven detected, no-breakeven horizon,
 *    degenerate empty input
 *  - computeTransitionBudgetFromInputs end-to-end with the C.7 livestock
 *    revenue stream
 */

import { describe, it, expect } from 'vitest';
import {
  computeTransitionBudget,
  computeTransitionBudgetFromInputs,
  jCurveTrough,
} from '../transitionBudget.js';
import { computeCashflow } from '../cashflowEngine.js';
import { buildLivestockRevenueStream } from '../livestockRevenue.js';
import { computeRotationCalendar } from '../../../livestock/engine/rotationEngine.js';
import type { CostLineItem, RevenueStream, YearlyCashflow } from '../types.js';
import type { Paddock, LivestockSpecies } from '../../../../store/livestockStore.js';
import type { BuildPhase } from '../../../../store/phaseStore.js';

function paddock(id: string, overrides: Partial<Paddock> = {}): Paddock {
  return {
    id,
    projectId: 'p1',
    name: `Paddock ${id}`,
    color: '#000',
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]] },
    areaM2: 10_000,
    grazingCellGroup: null,
    species: ['cattle'] as LivestockSpecies[],
    stockingDensity: null,
    fencing: 'electric',
    guestSafeBuffer: false,
    waterPointNote: '',
    shelterNote: '',
    phase: 'plan',
    notes: '',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

const PHASES: BuildPhase[] = [
  { id: 'ph1', projectId: 'p1', name: 'Phase 1', timeframe: 'Year 0-1', order: 1, description: '', color: '#ccc', completed: false, notes: '', completedAt: null },
];

function capex(id: string, mid: number, phaseId: string): CostLineItem {
  return {
    id,
    name: id,
    sourceType: 'structure',
    sourceId: id,
    category: 'infrastructure',
    phase: phaseId,
    phaseName: 'Phase 1',
    cost: { low: mid * 0.9, mid, high: mid * 1.1 },
    confidence: 'medium',
    assumptions: [],
  };
}

describe('computeTransitionBudget — phase labelling', () => {
  it('labels year 0-2 establishment, 3-5 build-up, 6+ maturation', () => {
    const cashflow: YearlyCashflow[] = Array.from({ length: 11 }, (_, y) => ({
      year: y,
      capitalCosts: { low: 0, mid: 0, high: 0 },
      operatingCosts: { low: 0, mid: 0, high: 0 },
      revenue: { low: 0, mid: 0, high: 0 },
      netCashflow: { low: 0, mid: 0, high: 0 },
      cumulativeCashflow: { low: 0, mid: 0, high: 0 },
    }));
    const result = computeTransitionBudget(cashflow);
    expect(result[0]!.phase).toBe('establishment');
    expect(result[1]!.phase).toBe('establishment');
    expect(result[2]!.phase).toBe('establishment');
    expect(result[3]!.phase).toBe('build-up');
    expect(result[4]!.phase).toBe('build-up');
    expect(result[5]!.phase).toBe('build-up');
    expect(result[6]!.phase).toBe('maturation');
    expect(result[7]!.phase).toBe('maturation');
    expect(result[10]!.phase).toBe('maturation');
  });
});

describe('computeTransitionBudget — passthrough', () => {
  it('passes capex / opex / revenue from the underlying mid triple', () => {
    const cashflow: YearlyCashflow[] = [
      {
        year: 0,
        capitalCosts: { low: 80, mid: 100, high: 120 },
        operatingCosts: { low: 4, mid: 5, high: 6 },
        revenue: { low: 0, mid: 0, high: 0 },
        netCashflow: { low: -126, mid: -105, high: -84 },
        cumulativeCashflow: { low: -126, mid: -105, high: -84 },
      },
      {
        year: 1,
        capitalCosts: { low: 0, mid: 0, high: 0 },
        operatingCosts: { low: 4, mid: 5, high: 6 },
        revenue: { low: 16, mid: 20, high: 24 },
        netCashflow: { low: 10, mid: 15, high: 20 },
        cumulativeCashflow: { low: -116, mid: -90, high: -64 },
      },
    ];
    const result = computeTransitionBudget(cashflow);
    expect(result[0]!.capex).toBe(100);
    expect(result[0]!.opex).toBe(5);
    expect(result[0]!.revenue).toBe(0);
    expect(result[1]!.capex).toBe(0);
    expect(result[1]!.opex).toBe(5);
    expect(result[1]!.revenue).toBe(20);
  });

  it('passes netCashflow and cumulativeNetCashflow from .mid', () => {
    const cashflow: YearlyCashflow[] = [
      {
        year: 0,
        capitalCosts: { low: 80, mid: 100, high: 120 },
        operatingCosts: { low: 0, mid: 0, high: 0 },
        revenue: { low: 0, mid: 0, high: 0 },
        netCashflow: { low: -120, mid: -100, high: -80 },
        cumulativeCashflow: { low: -120, mid: -100, high: -80 },
      },
      {
        year: 1,
        capitalCosts: { low: 0, mid: 0, high: 0 },
        operatingCosts: { low: 0, mid: 0, high: 0 },
        revenue: { low: 40, mid: 50, high: 60 },
        netCashflow: { low: 40, mid: 50, high: 60 },
        cumulativeCashflow: { low: -80, mid: -50, high: -20 },
      },
    ];
    const result = computeTransitionBudget(cashflow);
    expect(result[0]!.netCashflow).toBe(-100);
    expect(result[0]!.cumulativeNetCashflow).toBe(-100);
    expect(result[1]!.netCashflow).toBe(50);
    expect(result[1]!.cumulativeNetCashflow).toBe(-50);
  });
});

describe('computeTransitionBudget — revenueScalar', () => {
  it('is 0..1, ends at 1.0 against the horizon plateau, year 0 = 0', () => {
    const calendar = computeRotationCalendar({
      paddocks: Array.from({ length: 11 }, (_, i) => paddock(`p${i}`)),
      herdSize: 50,
      grazeDaysPerPaddock: 6,
    });
    const stream = buildLivestockRevenueStream(calendar, {
      pricePerAuDay: { low: 2, mid: 3, high: 4 },
    });
    const cashflow = computeCashflow([], [stream], PHASES, 10);
    const result = computeTransitionBudget(cashflow);

    expect(result[0]!.revenueScalar).toBe(0);
    // Monotone non-decreasing across the horizon.
    for (let y = 1; y < result.length; y++) {
      expect(result[y]!.revenueScalar).toBeGreaterThanOrEqual(result[y - 1]!.revenueScalar);
    }
    expect(result[result.length - 1]!.revenueScalar).toBe(1.0);
  });

  it('is 0 when plateau is 0 (no revenue at all)', () => {
    const cashflow: YearlyCashflow[] = Array.from({ length: 3 }, (_, y) => ({
      year: y,
      capitalCosts: { low: 0, mid: 0, high: 0 },
      operatingCosts: { low: 0, mid: 0, high: 0 },
      revenue: { low: 0, mid: 0, high: 0 },
      netCashflow: { low: 0, mid: 0, high: 0 },
      cumulativeCashflow: { low: 0, mid: 0, high: 0 },
    }));
    const result = computeTransitionBudget(cashflow);
    expect(result.every((y) => y.revenueScalar === 0)).toBe(true);
  });
});

describe('jCurveTrough', () => {
  it('detects trough at year 0 when capex front-loads and revenue follows', () => {
    const years = computeTransitionBudget([
      { year: 0, capitalCosts: { low: 80, mid: 100, high: 120 }, operatingCosts: { low: 0, mid: 0, high: 0 }, revenue: { low: 0, mid: 0, high: 0 }, netCashflow: { low: -120, mid: -100, high: -80 }, cumulativeCashflow: { low: -120, mid: -100, high: -80 } },
      { year: 1, capitalCosts: { low: 0, mid: 0, high: 0 }, operatingCosts: { low: 0, mid: 0, high: 0 }, revenue: { low: 16, mid: 20, high: 24 }, netCashflow: { low: 16, mid: 20, high: 24 }, cumulativeCashflow: { low: -104, mid: -80, high: -56 } },
      { year: 2, capitalCosts: { low: 0, mid: 0, high: 0 }, operatingCosts: { low: 0, mid: 0, high: 0 }, revenue: { low: 40, mid: 50, high: 60 }, netCashflow: { low: 40, mid: 50, high: 60 }, cumulativeCashflow: { low: -64, mid: -30, high: 4 } },
      { year: 3, capitalCosts: { low: 0, mid: 0, high: 0 }, operatingCosts: { low: 0, mid: 0, high: 0 }, revenue: { low: 56, mid: 70, high: 84 }, netCashflow: { low: 56, mid: 70, high: 84 }, cumulativeCashflow: { low: -8, mid: 40, high: 88 } },
    ]);
    const trough = jCurveTrough(years);
    expect(trough.troughYear).toBe(0);
    expect(trough.troughValue).toBe(-100);
  });

  it('detects breakeven at the first ≥0 crossing after the trough', () => {
    const years = computeTransitionBudget([
      { year: 0, capitalCosts: { low: 80, mid: 100, high: 120 }, operatingCosts: { low: 0, mid: 0, high: 0 }, revenue: { low: 0, mid: 0, high: 0 }, netCashflow: { low: -120, mid: -100, high: -80 }, cumulativeCashflow: { low: -120, mid: -100, high: -80 } },
      { year: 1, capitalCosts: { low: 0, mid: 0, high: 0 }, operatingCosts: { low: 0, mid: 0, high: 0 }, revenue: { low: 16, mid: 20, high: 24 }, netCashflow: { low: 16, mid: 20, high: 24 }, cumulativeCashflow: { low: -104, mid: -80, high: -56 } },
      { year: 2, capitalCosts: { low: 0, mid: 0, high: 0 }, operatingCosts: { low: 0, mid: 0, high: 0 }, revenue: { low: 40, mid: 50, high: 60 }, netCashflow: { low: 40, mid: 50, high: 60 }, cumulativeCashflow: { low: -64, mid: -30, high: 4 } },
      { year: 3, capitalCosts: { low: 0, mid: 0, high: 0 }, operatingCosts: { low: 0, mid: 0, high: 0 }, revenue: { low: 56, mid: 70, high: 84 }, netCashflow: { low: 56, mid: 70, high: 84 }, cumulativeCashflow: { low: -8, mid: 40, high: 88 } },
    ]);
    const trough = jCurveTrough(years);
    expect(trough.breakevenYear).toBe(3);
    expect(trough.breakevenYear).toBeGreaterThanOrEqual(trough.troughYear ?? -1);
  });

  it('returns null breakeven when cumulative never recovers within horizon', () => {
    const years = computeTransitionBudget([
      { year: 0, capitalCosts: { low: 800, mid: 1000, high: 1200 }, operatingCosts: { low: 0, mid: 0, high: 0 }, revenue: { low: 0, mid: 0, high: 0 }, netCashflow: { low: -1200, mid: -1000, high: -800 }, cumulativeCashflow: { low: -1200, mid: -1000, high: -800 } },
      { year: 1, capitalCosts: { low: 0, mid: 0, high: 0 }, operatingCosts: { low: 0, mid: 0, high: 0 }, revenue: { low: 1, mid: 1, high: 1 }, netCashflow: { low: 1, mid: 1, high: 1 }, cumulativeCashflow: { low: -1199, mid: -999, high: -799 } },
      { year: 2, capitalCosts: { low: 0, mid: 0, high: 0 }, operatingCosts: { low: 0, mid: 0, high: 0 }, revenue: { low: 1, mid: 1, high: 1 }, netCashflow: { low: 1, mid: 1, high: 1 }, cumulativeCashflow: { low: -1198, mid: -998, high: -798 } },
    ]);
    const trough = jCurveTrough(years);
    expect(trough.troughYear).toBe(0);
    expect(trough.troughValue).toBe(-1000);
    expect(trough.breakevenYear).toBeNull();
  });

  it('returns { troughYear: null, troughValue: 0, breakevenYear: null } for empty input', () => {
    expect(jCurveTrough([])).toEqual({ troughYear: null, troughValue: 0, breakevenYear: null });
  });
});

describe('computeTransitionBudgetFromInputs — integration', () => {
  it('feeds C.7 livestock stream end-to-end and produces a finite J-curve', () => {
    const calendar = computeRotationCalendar({
      paddocks: Array.from({ length: 11 }, (_, i) => paddock(`p${i}`)),
      herdSize: 50,
      grazeDaysPerPaddock: 6,
    });
    const stream: RevenueStream = buildLivestockRevenueStream(calendar, {
      pricePerAuDay: { low: 2, mid: 3, high: 4 },
    });

    const costItems: CostLineItem[] = [capex('barn', 50_000, 'ph1')];

    const result = computeTransitionBudgetFromInputs({
      costItems,
      revenueStreams: [stream],
      phases: PHASES,
      horizonYears: 10,
    });

    expect(result).toHaveLength(11);
    expect(result[0]!.revenue).toBe(0);
    expect(result[0]!.phase).toBe('establishment');
    expect(result[10]!.phase).toBe('maturation');

    const trough = jCurveTrough(result);
    expect(trough.troughYear).not.toBeNull();
    expect(Number.isFinite(trough.troughValue)).toBe(true);
    expect(trough.troughValue).toBeLessThan(0);
  });
});
