import { describe, expect, it } from 'vitest';
import {
  computeForageCarryingCapacity,
  precipToCapacityFactor,
} from '../forageCarryingCapacityMath.js';
import { LIVESTOCK_SPECIES, AU_FACTORS } from '../speciesData.js';
import type { Paddock, LivestockSpecies } from '../../../store/livestockStore.js';

function paddock(id: string, overrides: Partial<Paddock> = {}): Paddock {
  return {
    id,
    projectId: 'p1',
    name: `Paddock ${id}`,
    color: '#000',
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]] },
    areaM2: 10_000, // 1 ha
    grazingCellGroup: 'A',
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

describe('precipToCapacityFactor', () => {
  it('null → neutral 1.0', () => {
    expect(precipToCapacityFactor(null)).toBe(1.0);
    expect(precipToCapacityFactor(undefined)).toBe(1.0);
  });
  it('semi-arid floor and mesic anchor', () => {
    expect(precipToCapacityFactor(300)).toBe(0.5);
    expect(precipToCapacityFactor(800)).toBe(1.0);
  });
  it('high-precip cap', () => {
    expect(precipToCapacityFactor(1500)).toBeCloseTo(1.1, 6);
    expect(precipToCapacityFactor(2000)).toBe(1.1);
  });
});

describe('computeForageCarryingCapacity — empty', () => {
  it('no paddocks → zeroed totals, no rows', () => {
    const out = computeForageCarryingCapacity([], 800);
    expect(out.rows).toEqual([]);
    expect(out.totalRecommendedHead).toBe(0);
    expect(out.totalRecommendedAu).toBe(0);
    expect(out.totalAreaHa).toBe(0);
    expect(out.capacityFactor).toBe(1.0);
  });
});

describe('computeForageCarryingCapacity — populated', () => {
  it('1 ha cattle paddock at 800mm → typicalStocking × 1.0 head/ha', () => {
    const out = computeForageCarryingCapacity([paddock('a')], 800);
    expect(out.capacityFactor).toBe(1.0);
    expect(out.rows).toHaveLength(1);
    const r = out.rows[0]!;
    // cattle typicalStocking = 2 head/ha, 1 ha, factor 1.0
    expect(r.recommendedDensity).toBeCloseTo(LIVESTOCK_SPECIES.cattle.typicalStocking, 6);
    expect(r.recommendedHead).toBe(2);
    expect(r.recommendedAu).toBeCloseTo(2 * AU_FACTORS.cattle, 2);
    expect(out.totalRecommendedHead).toBe(2);
    expect(out.totalAreaHa).toBe(1);
  });

  it('paddock with no species contributes area but no head/AU', () => {
    const out = computeForageCarryingCapacity(
      [paddock('b', { species: [] })],
      800,
    );
    const r = out.rows[0]!;
    expect(r.recommendedDensity).toBeNull();
    expect(r.recommendedHead).toBe(0);
    expect(r.recommendedAu).toBe(0);
    expect(out.totalAreaHa).toBe(1);
  });
});
