import { describe, expect, it } from 'vitest';
import {
  computeStockWaterDemand,
  DEMAND_PER_HEAD_LPD,
} from '../stockWaterDemandMath.js';
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

describe('computeStockWaterDemand — empty', () => {
  it('no paddocks → zero demand, no rows', () => {
    const out = computeStockWaterDemand([]);
    expect(out.totalDemandLpd).toBe(0);
    expect(out.perPaddock).toEqual([]);
  });

  it('paddock with no stocking density → 0 demand', () => {
    const out = computeStockWaterDemand([paddock('a', { stockingDensity: null })]);
    expect(out.totalDemandLpd).toBe(0);
    expect(out.perPaddock[0]!.head).toBe(0);
    expect(out.perPaddock[0]!.demandLpd).toBe(0);
  });
});

describe('computeStockWaterDemand — populated', () => {
  it('1 ha at 4 head/ha → 4 head × 60 L = 240 L/day', () => {
    const out = computeStockWaterDemand([
      paddock('a', { stockingDensity: 4 }),
    ]);
    expect(DEMAND_PER_HEAD_LPD).toBe(60);
    expect(out.perPaddock[0]!.head).toBe(4);
    expect(out.perPaddock[0]!.demandLpd).toBe(240);
    expect(out.totalDemandLpd).toBe(240);
  });

  it('sums across paddocks', () => {
    const out = computeStockWaterDemand([
      paddock('a', { stockingDensity: 4 }), // 240
      paddock('b', { stockingDensity: 2, areaM2: 20_000 }), // 2 × 2ha × 60 = 240
    ]);
    expect(out.totalDemandLpd).toBe(480);
  });
});
