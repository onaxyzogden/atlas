/**
 * rotationMoveMaterials — per-move provisioning kit builder (B3.x).
 *
 * Pure module; no store, no React. Verifies AU-scaled salt/mineral/water
 * consumable lines, the always-present fencing equipment line, the
 * skip-when-empty path, linear graze-day scaling, and rate-catalog hygiene.
 */

import { describe, it, expect } from 'vitest';
import type { Paddock } from '../../../store/livestockStore.js';
import {
  MATERIAL_RATES,
  ROTATION_FENCING_EQUIPMENT,
  buildRotationMoveKit,
  paddockAnimalUnits,
} from '../rotationMoveMaterials.js';

function paddock(
  over: Partial<Paddock> & { id: string; name: string },
): Paddock {
  return {
    projectId: 'p1',
    color: '#888',
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
    },
    areaM2: 10_000, // 1 ha
    grazingCellGroup: null,
    species: ['cattle'],
    stockingDensity: 2, // head/ha
    fencing: 'none',
    guestSafeBuffer: false,
    waterPointNote: '',
    shelterNote: '',
    phase: 'phase-1',
    notes: '',
    createdAt: '2026-05-23T00:00:00.000Z',
    updatedAt: '2026-05-23T00:00:00.000Z',
    ...over,
  };
}

describe('paddockAnimalUnits', () => {
  it('uses stockingDensity x areaHa x AU_FACTORS[primary species]', () => {
    // 2 head/ha x 1 ha x 1.250 (cattle) = 2.5 AU
    expect(paddockAnimalUnits(paddock({ id: 'pa', name: 'A' }))).toBeCloseTo(
      2.5,
      6,
    );
  });

  it('returns 0 when there is no stocking density', () => {
    expect(
      paddockAnimalUnits(
        paddock({ id: 'pa', name: 'A', stockingDensity: null }),
      ),
    ).toBe(0);
  });

  it('returns 0 when there is no primary species', () => {
    expect(
      paddockAnimalUnits(paddock({ id: 'pa', name: 'A', species: [] })),
    ).toBe(0);
  });

  it('uses only the primary (first) species for the AU factor', () => {
    // primary = sheep (0.200); cattle in slot 2 is ignored.
    // 10 head/ha x 1 ha x 0.200 = 2.0 AU
    expect(
      paddockAnimalUnits(
        paddock({
          id: 'pa',
          name: 'A',
          species: ['sheep', 'cattle'],
          stockingDensity: 10,
        }),
      ),
    ).toBeCloseTo(2.0, 6);
  });
});

describe('buildRotationMoveKit', () => {
  it('emits salt + mineral + water consumables plus the fencing equipment', () => {
    const kit = buildRotationMoveKit({
      paddock: paddock({ id: 'pa', name: 'A' }),
      grazeDays: 4,
    });
    expect(kit.equipment).toEqual([ROTATION_FENCING_EQUIPMENT]);
    expect(kit.materials.map((m) => m.label)).toEqual([
      'Free-choice salt',
      'Loose mineral mix',
      'Water haul',
    ]);
    expect(kit.materials.map((m) => m.unit)).toEqual(['kg', 'kg', 'L']);
  });

  it('scales absolute totals by AU x grazeDays x rate and reports them in notes', () => {
    // 2.5 AU x 4 days: salt 0.3 kg, mineral 0.85 kg, water 450 L.
    const kit = buildRotationMoveKit({
      paddock: paddock({ id: 'pa', name: 'A' }),
      grazeDays: 4,
    });
    const [salt, mineral, water] = kit.materials;
    expect(salt?.notes).toContain('0.3 kg total');
    expect(salt?.notes).toContain('2.5 AU');
    expect(salt?.notes).toContain('4 graze-days');
    expect(mineral?.notes).toContain('0.85 kg total');
    expect(water?.notes).toContain('450 L total');
  });

  it('leaves quantityPerAcre unset (per-move totals live in notes)', () => {
    const kit = buildRotationMoveKit({
      paddock: paddock({ id: 'pa', name: 'A' }),
      grazeDays: 4,
    });
    expect(kit.materials.every((m) => m.quantityPerAcre === undefined)).toBe(
      true,
    );
  });

  it('scales linearly with graze-days', () => {
    const a = buildRotationMoveKit({
      paddock: paddock({ id: 'pa', name: 'A' }),
      grazeDays: 2,
    });
    const b = buildRotationMoveKit({
      paddock: paddock({ id: 'pa', name: 'A' }),
      grazeDays: 4,
    });
    // water: 2.5 AU x 2 x 45 = 225; x4 = 450
    expect(a.materials[2]?.notes).toContain('225 L total');
    expect(b.materials[2]?.notes).toContain('450 L total');
  });

  it('emits only the fencing line (no consumables) when AU is 0', () => {
    const noStock = buildRotationMoveKit({
      paddock: paddock({ id: 'pa', name: 'A', stockingDensity: null }),
      grazeDays: 4,
    });
    expect(noStock.materials).toEqual([]);
    expect(noStock.equipment).toEqual([ROTATION_FENCING_EQUIPMENT]);

    const noSpecies = buildRotationMoveKit({
      paddock: paddock({ id: 'pa', name: 'A', species: [] }),
      grazeDays: 4,
    });
    expect(noSpecies.materials).toEqual([]);
    expect(noSpecies.equipment).toEqual([ROTATION_FENCING_EQUIPMENT]);
  });

  it('emits only the fencing line when grazeDays is 0 or negative', () => {
    const kit = buildRotationMoveKit({
      paddock: paddock({ id: 'pa', name: 'A' }),
      grazeDays: 0,
    });
    expect(kit.materials).toEqual([]);
    expect(kit.equipment).toEqual([ROTATION_FENCING_EQUIPMENT]);
  });
});

describe('MATERIAL_RATES catalog hygiene', () => {
  it('every rate carries a positive per-AU-per-day figure and a non-empty source', () => {
    expect(MATERIAL_RATES.length).toBeGreaterThan(0);
    for (const rate of MATERIAL_RATES) {
      expect(rate.label.trim().length).toBeGreaterThan(0);
      expect(rate.unit.trim().length).toBeGreaterThan(0);
      expect(rate.perAuPerDay).toBeGreaterThan(0);
      expect(rate.source.trim().length).toBeGreaterThan(0);
    }
  });
});
