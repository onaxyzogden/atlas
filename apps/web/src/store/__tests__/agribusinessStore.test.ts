import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SIZING,
  computePeakWeekKg,
  computeColdChainVerdict,
  computeMarketVerdict,
  type AgribusinessSizing,
} from '../agribusinessSizing.js';

/**
 * `computePeakWeekKg` is the single source for peak-week / weekly-product
 * volume on both ColdChainCoverageCard and MarketDistributionCard.
 * Drift here silently desynchronises Module 7's two downstream rollups
 * from the throughput card, so it's worth a unit lock.
 */
describe('computePeakWeekKg', () => {
  it('matches the ADR baseline (2,000-bird viability floor)', () => {
    // 2000 × 1.8 ÷ (40/5) = 3600 ÷ 8 = 450 kg/wk
    expect(computePeakWeekKg(DEFAULT_SIZING)).toBe(450);
  });

  it('scales linearly with annualHead', () => {
    const a = computePeakWeekKg({ ...DEFAULT_SIZING, annualHead: 2000 });
    const b = computePeakWeekKg({ ...DEFAULT_SIZING, annualHead: 5000 });
    expect(b / a).toBeCloseTo(2.5, 10);
  });

  it('scales linearly with dressedKg', () => {
    const a = computePeakWeekKg({ ...DEFAULT_SIZING, dressedKg: 1.8 });
    const b = computePeakWeekKg({ ...DEFAULT_SIZING, dressedKg: 3.6 });
    expect(b / a).toBeCloseTo(2, 10);
  });

  it('treats the processing line as a 5-day-per-week cadence', () => {
    // 40 processing days = 8 processing-weeks
    // 80 processing days = 16 processing-weeks → peak halves
    const a = computePeakWeekKg({ ...DEFAULT_SIZING, processingDays: 40 });
    const b = computePeakWeekKg({ ...DEFAULT_SIZING, processingDays: 80 });
    expect(b / a).toBeCloseTo(0.5, 10);
  });

  it('clamps the weeks-divisor at 1 to avoid blowing up below 5 processing days', () => {
    // For < 5 processing days the formula degenerates: treat as one
    // working week of throughput, not infinity.
    const annualKg = DEFAULT_SIZING.annualHead * DEFAULT_SIZING.dressedKg;
    expect(
      computePeakWeekKg({ ...DEFAULT_SIZING, processingDays: 0 }),
    ).toBe(annualKg);
    expect(
      computePeakWeekKg({ ...DEFAULT_SIZING, processingDays: 3 }),
    ).toBe(annualKg);
  });

  it('reproduces the live verification round-trip (head=5000)', () => {
    // The 2026-05-10 sizing-slice ADR addendum locked this number via
    // preview eval: head 5000 → 1125 kg/wk in both downstream cards.
    const sizing: AgribusinessSizing = { ...DEFAULT_SIZING, annualHead: 5000 };
    expect(computePeakWeekKg(sizing)).toBe(1125);
  });
});

/**
 * Verdict transitions are the steward-facing output of Module 7. Each
 * boundary test pins one inequality so flipping `<` ↔ `<=` or `>` ↔
 * `>=` breaks at least one assertion.
 */
describe('computeColdChainVerdict', () => {
  it('returns no-units when no cold-chain units are placed (ignores capacity)', () => {
    expect(
      computeColdChainVerdict({
        unitCount: 0,
        totalCapacityM3: 999,
        requiredM3: 10,
      }),
    ).toBe('no-units');
  });

  it('returns no-capacity when units are placed but capacity is 0', () => {
    expect(
      computeColdChainVerdict({
        unitCount: 3,
        totalCapacityM3: 0,
        requiredM3: 10,
      }),
    ).toBe('no-capacity');
  });

  it('returns ok exactly at the 120 % boundary (>= 120)', () => {
    expect(
      computeColdChainVerdict({
        unitCount: 1,
        totalCapacityM3: 120,
        requiredM3: 100,
      }),
    ).toBe('ok');
  });

  it('returns caution just under 120 %', () => {
    expect(
      computeColdChainVerdict({
        unitCount: 1,
        totalCapacityM3: 119.999,
        requiredM3: 100,
      }),
    ).toBe('caution');
  });

  it('returns caution exactly at the 80 % boundary (>= 80)', () => {
    expect(
      computeColdChainVerdict({
        unitCount: 1,
        totalCapacityM3: 80,
        requiredM3: 100,
      }),
    ).toBe('caution');
  });

  it('returns short just under 80 %', () => {
    expect(
      computeColdChainVerdict({
        unitCount: 1,
        totalCapacityM3: 79.999,
        requiredM3: 100,
      }),
    ).toBe('short');
  });
});

describe('computeMarketVerdict', () => {
  it('returns no-nodes when no market nodes are placed', () => {
    expect(
      computeMarketVerdict({
        nodeCount: 0,
        totalDemandKg: 999,
        largestKindKg: 999,
        weeklyProductKg: 100,
      }),
    ).toBe('no-nodes');
  });

  it('returns no-demand when nodes are placed but total demand is 0', () => {
    expect(
      computeMarketVerdict({
        nodeCount: 3,
        totalDemandKg: 0,
        largestKindKg: 0,
        weeklyProductKg: 100,
      }),
    ).toBe('no-demand');
  });

  it('returns undersold just under 80 % coverage', () => {
    expect(
      computeMarketVerdict({
        nodeCount: 2,
        totalDemandKg: 79.999,
        largestKindKg: 40,
        weeklyProductKg: 100,
      }),
    ).toBe('undersold');
  });

  it('treats coverage = 80 % as ok (boundary is strict `<`)', () => {
    expect(
      computeMarketVerdict({
        nodeCount: 2,
        totalDemandKg: 80,
        largestKindKg: 40,
        weeklyProductKg: 100,
      }),
    ).toBe('ok');
  });

  it('treats coverage = 120 % as ok (boundary is strict `>`)', () => {
    expect(
      computeMarketVerdict({
        nodeCount: 2,
        totalDemandKg: 120,
        largestKindKg: 60,
        weeklyProductKg: 100,
      }),
    ).toBe('ok');
  });

  it('returns oversold just over 120 % coverage', () => {
    expect(
      computeMarketVerdict({
        nodeCount: 2,
        totalDemandKg: 120.001,
        largestKindKg: 60,
        weeklyProductKg: 100,
      }),
    ).toBe('oversold');
  });

  it('returns concentrated when one channel exceeds 70 % of in-band demand', () => {
    // coverage 100 % (in-band); top channel = 71/100 = 71 %
    expect(
      computeMarketVerdict({
        nodeCount: 4,
        totalDemandKg: 100,
        largestKindKg: 71,
        weeklyProductKg: 100,
      }),
    ).toBe('concentrated');
  });

  it('treats top channel = 70 % as ok (boundary is strict `>`)', () => {
    expect(
      computeMarketVerdict({
        nodeCount: 4,
        totalDemandKg: 100,
        largestKindKg: 70,
        weeklyProductKg: 100,
      }),
    ).toBe('ok');
  });
});
