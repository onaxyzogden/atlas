/**
 * coverCropEconomicsMath — pure projection tests (B5.2.x.b C2).
 */

import { describe, it, expect } from 'vitest';
import {
  computeCoverCropEconomics,
  effectiveSeedCostPerAcre,
  effectiveLaborHrsPerAcre,
  windowEconomics,
  UNPHASED_BUCKET_ID,
} from '../coverCropEconomicsMath.js';
import type { CropArea, CropCoverWindow } from '../../../store/cropStore.js';
import type { BuildPhase } from '../../../store/phaseStore.js';
import type { CoverCropEntry } from '../coverCropCatalog.js';

const ACRES_PER_M2 = 1 / 4046.8564224;
const ONE_ACRE_M2 = 4046.8564224;

function area(over: Partial<CropArea> = {}): CropArea {
  return {
    id: 'ca1',
    projectId: 'p1',
    name: 'A',
    color: '#888',
    type: 'row_crop',
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
    },
    areaM2: ONE_ACRE_M2,
    species: [],
    treeSpacingM: null,
    rowSpacingM: null,
    waterDemand: 'medium',
    irrigationType: 'drip',
    phase: 'phase-1',
    notes: '',
    createdAt: '2026-05-20T00:00:00.000Z',
    updatedAt: '2026-05-20T00:00:00.000Z',
    ...over,
  };
}

const win = (
  speciesId: string,
  startMonth: number,
  endMonth: number,
  role: CropCoverWindow['role'] = 'winter_cover',
  over: Partial<CropCoverWindow> = {},
): CropCoverWindow => ({ speciesId, startMonth, endMonth, role, ...over });

function phase(over: Partial<BuildPhase> & { id: string; order: number; name: string }): BuildPhase {
  return {
    projectId: 'p1',
    timeframe: '',
    description: '',
    color: '#888',
    completed: false,
    notes: '',
    completedAt: null,
    ...over,
  };
}

const CATALOG: CoverCropEntry[] = [
  {
    speciesId: 'winter_rye',
    roles: ['winter_cover'],
    livingRootSeasons: ['winter'],
    plantingMonthWindow: [9, 10],
    rationale: '',
    citation: '',
    seedCostUSDPerAcre: 25,
    seedingLaborHrsPerAcre: 0.4,
    seedRateLbPerAcre: 90,
  },
  {
    speciesId: 'buckwheat',
    roles: ['smother'],
    livingRootSeasons: ['summer'],
    plantingMonthWindow: [5, 7],
    rationale: '',
    citation: '',
    seedCostUSDPerAcre: 40,
    seedingLaborHrsPerAcre: 0.4,
    seedRateLbPerAcre: 50,
  },
  // entry without cost data — must be silently excluded
  {
    speciesId: 'comfrey',
    roles: ['living_mulch'],
    livingRootSeasons: ['spring'],
    plantingMonthWindow: [4, 6],
    rationale: '',
    citation: '',
  },
];

describe('effectiveSeedCostPerAcre', () => {
  it('override wins over catalog', () => {
    const w = win('winter_rye', 9, 5, 'winter_cover', { seedCostUSDPerAcreOverride: 80 });
    expect(effectiveSeedCostPerAcre(w, CATALOG[0])).toBe(80);
  });
  it('falls back to catalog when override missing', () => {
    expect(effectiveSeedCostPerAcre(win('winter_rye', 9, 5), CATALOG[0])).toBe(25);
  });
  it('undefined when both missing', () => {
    expect(effectiveSeedCostPerAcre(win('comfrey', 4, 6), CATALOG[2])).toBeUndefined();
    expect(effectiveSeedCostPerAcre(win('unknown', 1, 2), undefined)).toBeUndefined();
  });
});

describe('effectiveLaborHrsPerAcre', () => {
  it('override wins over catalog', () => {
    const w = win('winter_rye', 9, 5, 'winter_cover', { seedingLaborHrsPerAcreOverride: 1.2 });
    expect(effectiveLaborHrsPerAcre(w, CATALOG[0])).toBe(1.2);
  });
  it('falls back to catalog', () => {
    expect(effectiveLaborHrsPerAcre(win('winter_rye', 9, 5), CATALOG[0])).toBe(0.4);
  });
});

describe('windowEconomics', () => {
  it('multiplies per-acre by acres', () => {
    const r = windowEconomics({ window: win('winter_rye', 9, 5), areaM2: ONE_ACRE_M2, catalog: CATALOG });
    expect(r.acres).toBeCloseTo(1, 6);
    expect(r.seedCostUSD).toBeCloseTo(25, 6);
    expect(r.seedingLaborHrs).toBeCloseTo(0.4, 6);
  });
  it('zero/negative areaM2 → zero', () => {
    const r = windowEconomics({ window: win('winter_rye', 9, 5), areaM2: 0, catalog: CATALOG });
    expect(r.seedCostUSD).toBe(0);
    expect(r.seedingLaborHrs).toBe(0);
  });
  it('missing catalog data → zero totals', () => {
    const r = windowEconomics({ window: win('comfrey', 4, 6), areaM2: ONE_ACRE_M2, catalog: CATALOG });
    expect(r.seedCostUSD).toBe(0);
    expect(r.seedingLaborHrs).toBe(0);
    expect(r.effectiveSeedCostPerAcre).toBeUndefined();
  });
  it('override populates a row even when catalog has no data', () => {
    const w = win('comfrey', 4, 6, 'living_mulch', {
      seedCostUSDPerAcreOverride: 100,
      seedingLaborHrsPerAcreOverride: 2,
    });
    const r = windowEconomics({ window: w, areaM2: ONE_ACRE_M2, catalog: CATALOG });
    expect(r.seedCostUSD).toBeCloseTo(100, 6);
    expect(r.seedingLaborHrs).toBeCloseTo(2, 6);
  });
});

describe('computeCoverCropEconomics', () => {
  const phaseA = phase({ id: 'phase-1', order: 0, name: 'Year 0-1' });
  const phaseB = phase({ id: 'phase-2', order: 1, name: 'Year 1-3' });
  const phases = [phaseA, phaseB];

  it('groups per-phase totals and project total', () => {
    const r = computeCoverCropEconomics({
      projectId: 'p1',
      declaredPhases: phases,
      catalog: CATALOG,
      cropAreas: [
        area({ id: 'a1', phase: 'phase-1', areaM2: ONE_ACRE_M2, coverCropPlan: [win('winter_rye', 9, 5)] }),
        area({ id: 'a2', phase: 'phase-2', areaM2: 2 * ONE_ACRE_M2, coverCropPlan: [win('buckwheat', 5, 7, 'smother')] }),
      ],
    });
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({ phaseId: 'phase-1', totalSeedCostUSD: 25, totalSeedingLaborHrs: 0.4, cropAreaCount: 1, speciesCount: 1 });
    expect(r.rows[1]).toMatchObject({ phaseId: 'phase-2', totalSeedCostUSD: 80, totalSeedingLaborHrs: 0.8, cropAreaCount: 1, speciesCount: 1 });
    expect(r.totalSeedCostUSD).toBeCloseTo(105, 6);
    expect(r.totalSeedingLaborHrs).toBeCloseTo(1.2, 6);
  });

  it('respects declared phase order regardless of input order', () => {
    const r = computeCoverCropEconomics({
      projectId: 'p1',
      declaredPhases: phases,
      catalog: CATALOG,
      cropAreas: [
        area({ id: 'b', phase: 'phase-2', coverCropPlan: [win('winter_rye', 9, 5)] }),
        area({ id: 'a', phase: 'phase-1', coverCropPlan: [win('winter_rye', 9, 5)] }),
      ],
    });
    expect(r.rows.map((x) => x.phaseId)).toEqual(['phase-1', 'phase-2']);
  });

  it('unmatched / empty CropArea.phase → (Unphased) bucket, sorted last', () => {
    const r = computeCoverCropEconomics({
      projectId: 'p1',
      declaredPhases: phases,
      catalog: CATALOG,
      cropAreas: [
        area({ id: 'a1', phase: '', coverCropPlan: [win('winter_rye', 9, 5)] }),
        area({ id: 'a2', phase: 'phase-1', coverCropPlan: [win('winter_rye', 9, 5)] }),
        area({ id: 'a3', phase: 'made-up-id', coverCropPlan: [win('winter_rye', 9, 5)] }),
      ],
    });
    const last = r.rows[r.rows.length - 1]!;
    expect(last.phaseId).toBe(UNPHASED_BUCKET_ID);
    expect(last.cropAreaCount).toBe(2);
  });

  it('case-insensitive name match resolves to declared phase', () => {
    const r = computeCoverCropEconomics({
      projectId: 'p1',
      declaredPhases: phases,
      catalog: CATALOG,
      cropAreas: [area({ id: 'a1', phase: 'YEAR 0-1', coverCropPlan: [win('winter_rye', 9, 5)] })],
    });
    expect(r.rows[0]?.phaseId).toBe('phase-1');
  });

  it('areas without windows are skipped', () => {
    const r = computeCoverCropEconomics({
      projectId: 'p1',
      declaredPhases: phases,
      catalog: CATALOG,
      cropAreas: [area({ id: 'a1', phase: 'phase-1', coverCropPlan: [] })],
    });
    expect(r.rows).toHaveLength(0);
    expect(r.totalSeedCostUSD).toBe(0);
  });

  it('windows lacking cost data are silently excluded from the rollup', () => {
    const r = computeCoverCropEconomics({
      projectId: 'p1',
      declaredPhases: phases,
      catalog: CATALOG,
      cropAreas: [area({ id: 'a1', phase: 'phase-1', coverCropPlan: [win('comfrey', 4, 6, 'living_mulch')] })],
    });
    expect(r.rows).toHaveLength(0);
    expect(r.totalSeedCostUSD).toBe(0);
  });

  it('cross-project areas are excluded', () => {
    const r = computeCoverCropEconomics({
      projectId: 'p1',
      declaredPhases: phases,
      catalog: CATALOG,
      cropAreas: [
        area({ id: 'a1', projectId: 'p2', phase: 'phase-1', coverCropPlan: [win('winter_rye', 9, 5)] }),
      ],
    });
    expect(r.totalSeedCostUSD).toBe(0);
  });

  it('multiple windows on the same area accumulate to the same bucket', () => {
    const r = computeCoverCropEconomics({
      projectId: 'p1',
      declaredPhases: phases,
      catalog: CATALOG,
      cropAreas: [
        area({
          id: 'a1',
          phase: 'phase-1',
          areaM2: ONE_ACRE_M2,
          coverCropPlan: [win('winter_rye', 9, 5), win('buckwheat', 5, 7, 'smother')],
        }),
      ],
    });
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]?.totalSeedCostUSD).toBeCloseTo(65, 6); // 25 + 40
    expect(r.rows[0]?.speciesCount).toBe(2);
    expect(r.rows[0]?.cropAreaCount).toBe(1);
  });

  it('declared-phase order from BuildPhase.order is honored even if phases list is unsorted', () => {
    const r = computeCoverCropEconomics({
      projectId: 'p1',
      declaredPhases: [phaseB, phaseA],
      catalog: CATALOG,
      cropAreas: [
        area({ id: 'a1', phase: 'phase-1', coverCropPlan: [win('winter_rye', 9, 5)] }),
        area({ id: 'a2', phase: 'phase-2', coverCropPlan: [win('winter_rye', 9, 5)] }),
      ],
    });
    expect(r.rows.map((x) => x.phaseId)).toEqual(['phase-1', 'phase-2']);
  });

  it('override is applied to per-window total', () => {
    const r = computeCoverCropEconomics({
      projectId: 'p1',
      declaredPhases: phases,
      catalog: CATALOG,
      cropAreas: [
        area({
          id: 'a1',
          phase: 'phase-1',
          areaM2: ONE_ACRE_M2,
          coverCropPlan: [win('winter_rye', 9, 5, 'winter_cover', { seedCostUSDPerAcreOverride: 80 })],
        }),
      ],
    });
    expect(r.rows[0]?.totalSeedCostUSD).toBeCloseTo(80, 6);
  });

  it('zero areaM2 contributes nothing (no NaN, no negative)', () => {
    const r = computeCoverCropEconomics({
      projectId: 'p1',
      declaredPhases: phases,
      catalog: CATALOG,
      cropAreas: [area({ id: 'a1', phase: 'phase-1', areaM2: 0, coverCropPlan: [win('winter_rye', 9, 5)] })],
    });
    expect(r.rows).toHaveLength(0);
    expect(r.totalSeedCostUSD).toBe(0);
  });

  it('returns empty rows when no cropAreas given', () => {
    const r = computeCoverCropEconomics({
      projectId: 'p1',
      declaredPhases: phases,
      catalog: CATALOG,
      cropAreas: [],
    });
    expect(r.rows).toEqual([]);
    expect(r.totalSeedCostUSD).toBe(0);
    expect(r.totalSeedingLaborHrs).toBe(0);
  });

  it('per-acre × area math: 2-acre area × $40/ac = $80 (buckwheat)', () => {
    const r = computeCoverCropEconomics({
      projectId: 'p1',
      declaredPhases: phases,
      catalog: CATALOG,
      cropAreas: [
        area({
          id: 'a1',
          phase: 'phase-1',
          areaM2: 2 * ONE_ACRE_M2,
          coverCropPlan: [win('buckwheat', 5, 7, 'smother')],
        }),
      ],
    });
    expect(r.rows[0]?.totalSeedCostUSD).toBeCloseTo(80, 6);
    expect(r.rows[0]?.totalSeedingLaborHrs).toBeCloseTo(0.8, 6);
  });

  it('ACRES_PER_M2 sanity: 4046.86 m² ≈ 1 acre', () => {
    expect(ONE_ACRE_M2 * ACRES_PER_M2).toBeCloseTo(1, 6);
  });
});
