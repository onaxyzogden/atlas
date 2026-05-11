import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SIZING,
  computePeakWeekKg,
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
