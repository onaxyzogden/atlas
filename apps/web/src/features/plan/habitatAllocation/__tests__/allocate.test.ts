import { describe, it, expect } from 'vitest';
import type { LandZone, ZoneCategory } from '../../../../store/zoneStore.js';
import {
  computeAllocation,
  resolveHabitatTargetPct,
  acresToM2,
  m2ToHa,
} from '../allocate.js';

function zone(category: ZoneCategory, areaM2: number): LandZone {
  return {
    id: `z-${category}-${areaM2}`,
    projectId: 'p1',
    name: category,
    category,
    color: '#000',
    primaryUse: '',
    secondaryUse: '',
    notes: '',
    geometry: { type: 'Polygon', coordinates: [] },
    areaM2,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  } as LandZone;
}

const PARCEL = 100_000; // 10 ha

describe('computeAllocation', () => {
  it('sums only habitat-category zones and computes the share', () => {
    const r = computeAllocation(
      [
        zone('conservation', 6_000),
        zone('buffer', 2_000),
        zone('water_retention', 2_000),
        zone('food_production', 80_000), // ignored
        zone('livestock', 10_000), // ignored
      ],
      PARCEL,
      10,
    );
    expect(r.allocatedM2).toBe(10_000);
    expect(r.allocatedPct).toBeCloseTo(10);
    expect(r.verdict).toBe('on-track');
    expect(r.gapM2).toBe(0);
    expect(r.perCategory).toEqual({
      conservation: 6_000,
      buffer: 2_000,
      water_retention: 2_000,
    });
  });

  it('flags under-allocation with the shortfall in m²', () => {
    const r = computeAllocation([zone('conservation', 4_000)], PARCEL, 10);
    expect(r.allocatedPct).toBeCloseTo(4);
    expect(r.verdict).toBe('under');
    expect(r.gapM2).toBe(6_000); // need 10 % of 100k = 10k, have 4k
  });

  it('treats an exactly-met target as on-track', () => {
    const r = computeAllocation([zone('buffer', 10_000)], PARCEL, 10);
    expect(r.verdict).toBe('on-track');
    expect(r.gapM2).toBe(0);
  });

  it('over-allocation stays on-track with zero gap', () => {
    const r = computeAllocation([zone('conservation', 25_000)], PARCEL, 10);
    expect(r.allocatedPct).toBeCloseTo(25);
    expect(r.verdict).toBe('on-track');
    expect(r.gapM2).toBe(0);
  });

  it('handles empty zones', () => {
    const r = computeAllocation([], PARCEL, 10);
    expect(r.allocatedM2).toBe(0);
    expect(r.allocatedPct).toBe(0);
    expect(r.verdict).toBe('under');
    expect(r.gapM2).toBe(10_000);
    expect(r.perCategory).toEqual({});
  });

  it('reports no-parcel when acreage is unknown', () => {
    const r = computeAllocation([zone('conservation', 5_000)], null, 10);
    expect(r.verdict).toBe('no-parcel');
    expect(r.parcelM2).toBeNull();
    expect(r.gapM2).toBeNull();
    expect(r.allocatedPct).toBe(0);
    expect(r.allocatedM2).toBe(5_000); // area still summed
  });

  it('ignores non-finite / negative zone areas defensively', () => {
    const r = computeAllocation(
      [zone('conservation', Number.NaN), zone('buffer', -500)],
      PARCEL,
      10,
    );
    expect(r.allocatedM2).toBe(0);
  });
});

describe('resolveHabitatTargetPct', () => {
  it('reads the regen-habitat-pct criterion', () => {
    expect(
      resolveHabitatTargetPct([{ id: 'regen-habitat-pct', target: 12 }]),
    ).toBe(12);
  });
  it('falls back to 10 when absent', () => {
    expect(resolveHabitatTargetPct([{ id: 'regen-soil-om', target: 4 }])).toBe(
      10,
    );
  });
});

describe('unit conversions', () => {
  it('acresToM2', () => {
    expect(acresToM2(1)).toBeCloseTo(4046.86);
  });
  it('m2ToHa rounds to 2dp', () => {
    expect(m2ToHa(12_345)).toBe(1.23);
  });
});
