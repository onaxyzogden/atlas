/**
 * livestockRevenue tests — Phase C.7.
 *
 * Cover:
 *  - annualRevenue.mid = pricePerAuDay.mid × calendar.annualAuDays
 *  - rampSchedule is monotone non-decreasing across the build-up curve
 *  - confidence + assumptions surface parasite-break compliance
 *  - Integration: stream feeds computeCashflow without error, year-10
 *    revenue ≥ year-1 revenue.
 */

import { describe, it, expect } from 'vitest';
import { buildLivestockRevenueStream } from '../livestockRevenue.js';
import { computeCashflow } from '../cashflowEngine.js';
import { computeRotationCalendar } from '../../../livestock/engine/rotationEngine.js';
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

describe('buildLivestockRevenueStream — revenue math', () => {
  it('annualRevenue.mid = pricePerAuDay.mid × annualAuDays', () => {
    const calendar = computeRotationCalendar({
      paddocks: Array.from({ length: 11 }, (_, i) => paddock(`p${i}`)),
      herdSize: 50,
      grazeDaysPerPaddock: 6,
    });
    expect(calendar.annualAuDays).toBe(50 * 365);

    const stream = buildLivestockRevenueStream(calendar, {
      pricePerAuDay: { low: 2, mid: 3, high: 4 },
    });
    expect(stream.annualRevenue.mid).toBe(calendar.annualAuDays * 3);
    expect(stream.annualRevenue.low).toBe(calendar.annualAuDays * 2);
    expect(stream.annualRevenue.high).toBe(calendar.annualAuDays * 4);
  });

  it('enterprise tag is "livestock"', () => {
    const cal = computeRotationCalendar({ paddocks: [paddock('p1')], herdSize: 10 });
    const stream = buildLivestockRevenueStream(cal, { pricePerAuDay: { low: 1, mid: 1, high: 1 } });
    expect(stream.enterprise).toBe('livestock');
  });
});

describe('buildLivestockRevenueStream — ramp schedule', () => {
  it('ramp is 0 before startYear, monotone non-decreasing through maturity', () => {
    const cal = computeRotationCalendar({ paddocks: [paddock('p1')], herdSize: 10 });
    const stream = buildLivestockRevenueStream(cal, {
      pricePerAuDay: { low: 1, mid: 1, high: 1 },
      startYear: 1,
    });
    expect(stream.rampSchedule[0]).toBe(0);
    expect(stream.rampSchedule[1]).toBeLessThan(stream.rampSchedule[5]!);
    // Plateau at 1.0 after maturity
    expect(stream.rampSchedule[5]).toBe(1.0);
    expect(stream.rampSchedule[10]).toBe(1.0);
  });

  it('startYear shifts the ramp', () => {
    const cal = computeRotationCalendar({ paddocks: [paddock('p1')], herdSize: 10 });
    const stream = buildLivestockRevenueStream(cal, {
      pricePerAuDay: { low: 1, mid: 1, high: 1 },
      startYear: 3,
    });
    expect(stream.rampSchedule[0]).toBe(0);
    expect(stream.rampSchedule[2]).toBe(0);
    expect(stream.rampSchedule[3]).toBeGreaterThan(0);
  });
});

describe('buildLivestockRevenueStream — assumptions surface parasite-break state', () => {
  it('flags non-compliant rotation in assumptions', () => {
    const calendar = computeRotationCalendar({
      paddocks: Array.from({ length: 11 }, (_, i) => paddock(`p${i}`)),
      herdSize: 50,
      grazeDaysPerPaddock: 3, // 30-day recovery < 60d floor
    });
    const stream = buildLivestockRevenueStream(calendar, {
      pricePerAuDay: { low: 2, mid: 3, high: 4 },
    });
    expect(stream.assumptions.some((a) => a.includes('WARNING'))).toBe(true);
  });

  it('confirms compliant rotation in assumptions', () => {
    const calendar = computeRotationCalendar({
      paddocks: Array.from({ length: 11 }, (_, i) => paddock(`p${i}`)),
      herdSize: 50,
      grazeDaysPerPaddock: 6, // 60-day recovery ≥ 60d floor
    });
    const stream = buildLivestockRevenueStream(calendar, {
      pricePerAuDay: { low: 2, mid: 3, high: 4 },
    });
    expect(stream.assumptions.some((a) => a.includes('Parasite-break floor met'))).toBe(true);
  });
});

describe('buildLivestockRevenueStream → computeCashflow integration', () => {
  it('feeds computeCashflow without error', () => {
    const calendar = computeRotationCalendar({
      paddocks: Array.from({ length: 11 }, (_, i) => paddock(`p${i}`)),
      herdSize: 50,
      grazeDaysPerPaddock: 6,
    });
    const stream = buildLivestockRevenueStream(calendar, {
      pricePerAuDay: { low: 2, mid: 3, high: 4 },
    });
    const cashflow = computeCashflow([], [stream], PHASES, 10);
    expect(cashflow).toHaveLength(11);
    expect(cashflow[0]!.revenue.mid).toBe(0); // year 0 pre-startYear
    expect(cashflow[1]!.revenue.mid).toBeGreaterThan(0); // year 1 first ramp tick
  });

  it('year-10 revenue ≥ year-1 revenue (monotone ramp)', () => {
    const calendar = computeRotationCalendar({
      paddocks: Array.from({ length: 11 }, (_, i) => paddock(`p${i}`)),
      herdSize: 50,
      grazeDaysPerPaddock: 6,
    });
    const stream = buildLivestockRevenueStream(calendar, {
      pricePerAuDay: { low: 2, mid: 3, high: 4 },
    });
    const cashflow = computeCashflow([], [stream], PHASES, 10);
    expect(cashflow[10]!.revenue.mid).toBeGreaterThanOrEqual(cashflow[1]!.revenue.mid);
  });
});
