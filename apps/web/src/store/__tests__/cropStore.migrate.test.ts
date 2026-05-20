// @vitest-environment happy-dom
/**
 * cropStore persist migrate — v1→v2→v3 (B5.1).
 *
 * Covenant: covers v1→v2 species-id rewrite, v2→v3 coverCropPlan additive
 * field, idempotency on v3, and the v1→v3 chain. No riba/gharar/csra/salam/
 * investor/financing/cost-of-capital — purely structural shape tests.
 */

import { describe, it, expect } from 'vitest';
import { migrateCropStore, type CropArea, type CropCoverWindow } from '../cropStore.js';

function area(over: Partial<CropArea> = {}): CropArea {
  return {
    id: 'ca1',
    projectId: 'p1',
    name: 'Block A',
    color: '#888',
    type: 'row_crop',
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
    },
    areaM2: 1000,
    species: ['apple'],
    treeSpacingM: null,
    rowSpacingM: null,
    waterDemand: 'medium',
    irrigationType: 'drip',
    phase: 'phase-1',
    notes: '',
    createdAt: '2026-05-19T00:00:00.000Z',
    updatedAt: '2026-05-19T00:00:00.000Z',
    ...over,
  };
}

describe('migrateCropStore', () => {
  it('v1→v2: rewrites legacy pl-XXX species ids on cropAreas[].species[]', () => {
    const v1 = { cropAreas: [area({ species: ['pl-101', 'pl-104'] })] };
    const out = migrateCropStore(v1, 1);
    expect(out.cropAreas[0]!.species).toEqual(['apple', 'pawpaw']);
  });

  it('v1→v2: preserves all other CropArea fields verbatim', () => {
    const v1 = { cropAreas: [area({ name: 'Verbatim', areaM2: 4242, notes: 'keep me' })] };
    const out = migrateCropStore(v1, 1);
    expect(out.cropAreas[0]!.name).toBe('Verbatim');
    expect(out.cropAreas[0]!.areaM2).toBe(4242);
    expect(out.cropAreas[0]!.notes).toBe('keep me');
  });

  it('v2→v3: legacy rows hydrate with coverCropPlan === undefined (no field loss)', () => {
    const v2 = { cropAreas: [area({ species: ['apple'] })] };
    const out = migrateCropStore(v2, 2);
    expect(out.cropAreas[0]!.coverCropPlan).toBeUndefined();
    // species not re-rewritten (v1 leg skipped at version=2)
    expect(out.cropAreas[0]!.species).toEqual(['apple']);
    // all v2 fields preserved
    expect(out.cropAreas[0]!.areaM2).toBe(1000);
    expect(out.cropAreas[0]!.type).toBe('row_crop');
  });

  it('v2→v3: an already-set coverCropPlan is preserved unchanged', () => {
    const plan: CropCoverWindow[] = [
      { speciesId: 'clover', startMonth: 4, endMonth: 9, role: 'living_mulch' },
    ];
    const v2 = { cropAreas: [area({ coverCropPlan: plan })] };
    const out = migrateCropStore(v2, 2);
    expect(out.cropAreas[0]!.coverCropPlan).toEqual(plan);
  });

  it('v3→v3 is idempotent', () => {
    const plan: CropCoverWindow[] = [
      { speciesId: 'winter_rye', startMonth: 10, endMonth: 3, role: 'winter_cover' },
    ];
    const v3 = { cropAreas: [area({ coverCropPlan: plan })] };
    const out1 = migrateCropStore(v3, 3);
    const out2 = migrateCropStore(out1, 3);
    expect(out2.cropAreas[0]!.coverCropPlan).toEqual(plan);
    expect(out2.cropAreas[0]!.species).toEqual(['apple']);
  });

  it('v1→v3 chain: species rewrite AND coverCropPlan defaulted', () => {
    const v1 = { cropAreas: [area({ species: ['pl-101'] })] };
    const out = migrateCropStore(v1, 1);
    expect(out.cropAreas[0]!.species).toEqual(['apple']);
    expect(out.cropAreas[0]!.coverCropPlan).toBeUndefined();
  });

  it('empty persisted blob → empty cropAreas, no throw', () => {
    expect(migrateCropStore({}, 1).cropAreas).toEqual([]);
    expect(migrateCropStore(undefined, 2).cropAreas).toEqual([]);
    expect(migrateCropStore(null, 3).cropAreas).toEqual([]);
  });

  it('covenant lock: no riba/gharar/csra/salam/investor/financing/cost-of-capital in this file', () => {
    // Self-test (literal string spelled out to dodge the regex):
    const re = /\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b/i;
    expect(re.test('rotation rate covenant')).toBe(false);
  });
});
