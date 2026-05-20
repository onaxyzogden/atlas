/**
 * livingRootsMath — pure projection tests (B5.1 Part 3).
 */

import { describe, it, expect } from 'vitest';
import {
  computeLivingRootsReport,
  computeLivingRootsCoveragePct,
} from '../livingRootsMath.js';
import type { CropArea, CropCoverWindow } from '../../../store/cropStore.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

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
    areaM2: 1000,
    species: [],
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

const win = (
  speciesId: string,
  startMonth: number,
  endMonth: number,
  role: CropCoverWindow['role'] = 'living_mulch',
): CropCoverWindow => ({ speciesId, startMonth, endMonth, role });

describe('computeLivingRootsReport', () => {
  it('empty parcel → zero report', () => {
    const r = computeLivingRootsReport({ projectId: 'p1', cropAreas: [] });
    expect(r.overall).toEqual({
      areaCount: 0,
      coveragePct: 0,
      plannedAreaM2: 0,
      totalAreaM2: 0,
      distinctSpeciesCount: 0,
      rolesPresent: [],
    });
    expect(r.rows).toEqual([]);
  });

  it('filters out areas from a different projectId', () => {
    const r = computeLivingRootsReport({
      projectId: 'p1',
      cropAreas: [area({ id: 'a1' }), area({ id: 'a2', projectId: 'p2' })],
    });
    expect(r.overall.areaCount).toBe(1);
    expect(r.rows[0]!.cropAreaId).toBe('a1');
  });

  it('single area, single 6-month window → 50% coverage', () => {
    const a = area({ id: 'a1', coverCropPlan: [win('clover', 4, 9)] });
    const r = computeLivingRootsReport({ projectId: 'p1', cropAreas: [a] });
    expect(r.rows[0]!.coveragePct).toBe(50);
    expect(r.overall.coveragePct).toBe(50);
    expect(r.overall.distinctSpeciesCount).toBe(1);
    expect(r.overall.rolesPresent).toEqual(['living_mulch']);
    expect(r.overall.plannedAreaM2).toBe(1000);
  });

  it('multi-window OR-merge counts each month once', () => {
    const a = area({
      id: 'a1',
      coverCropPlan: [
        win('clover', 4, 9, 'living_mulch'),     // Apr–Sep
        win('comfrey', 6, 8, 'living_mulch'),    // Jun–Aug (subset)
      ],
    });
    const r = computeLivingRootsReport({ projectId: 'p1', cropAreas: [a] });
    expect(r.rows[0]!.coveragePct).toBe(50); // still 6/12, not 9/12
    expect(r.rows[0]!.speciesCount).toBe(2);
  });

  it('year-wrap window (Oct–Mar) covers 6 months', () => {
    const a = area({ id: 'a1', coverCropPlan: [win('clover', 10, 3, 'winter_cover')] });
    const r = computeLivingRootsReport({ projectId: 'p1', cropAreas: [a] });
    const idx = (m: number) => r.rows[0]!.monthsCovered[m - 1];
    expect(idx(10)).toBe(true);
    expect(idx(12)).toBe(true);
    expect(idx(1)).toBe(true);
    expect(idx(3)).toBe(true);
    expect(idx(4)).toBe(false);
    expect(r.rows[0]!.coveragePct).toBe(50);
  });

  it('area without a plan contributes 0% to area-weighted overall', () => {
    const planned = area({ id: 'a1', areaM2: 1000, coverCropPlan: [win('clover', 1, 12)] }); // 100%
    const bare = area({ id: 'a2', areaM2: 1000, coverCropPlan: [] }); // 0%
    const r = computeLivingRootsReport({ projectId: 'p1', cropAreas: [planned, bare] });
    expect(r.overall.coveragePct).toBe(50); // (100*1000 + 0*1000) / 2000
    expect(r.overall.plannedAreaM2).toBe(1000);
    expect(r.overall.totalAreaM2).toBe(2000);
  });

  it('area-weighting: large bare area drags overall down vs small full-coverage area', () => {
    const small = area({ id: 'a1', areaM2: 100, coverCropPlan: [win('clover', 1, 12)] });
    const large = area({ id: 'a2', areaM2: 9900, coverCropPlan: [] });
    const r = computeLivingRootsReport({ projectId: 'p1', cropAreas: [small, large] });
    expect(r.overall.coveragePct).toBeCloseTo(1, 5); // (100*100 + 0*9900) / 10000 = 1.0
  });

  it('areas with areaM2 === 0 are excluded from the area-weighting denominator', () => {
    const zero = area({ id: 'a1', areaM2: 0, coverCropPlan: [win('clover', 1, 12)] });
    const real = area({ id: 'a2', areaM2: 1000, coverCropPlan: [win('clover', 1, 6)] });
    const r = computeLivingRootsReport({ projectId: 'p1', cropAreas: [zero, real] });
    expect(r.overall.coveragePct).toBe(50); // pure real-area mean, zero-area ignored
  });

  it('distinct species/roles dedup across windows + areas', () => {
    const a = area({
      id: 'a1',
      coverCropPlan: [win('clover', 4, 6, 'living_mulch'), win('clover', 7, 9, 'green_manure')],
    });
    const b = area({
      id: 'a2',
      coverCropPlan: [win('comfrey', 4, 9, 'living_mulch')],
    });
    const r = computeLivingRootsReport({ projectId: 'p1', cropAreas: [a, b] });
    expect(r.overall.distinctSpeciesCount).toBe(2); // clover, comfrey
    expect(r.overall.rolesPresent.sort()).toEqual(['green_manure', 'living_mulch']);
  });

  it('coveragePct never exceeds 100', () => {
    const a = area({
      id: 'a1',
      coverCropPlan: [win('clover', 1, 12), win('comfrey', 1, 12)],
    });
    const r = computeLivingRootsReport({ projectId: 'p1', cropAreas: [a] });
    expect(r.rows[0]!.coveragePct).toBe(100);
    expect(r.overall.coveragePct).toBe(100);
  });

  it('wrapper computeLivingRootsCoveragePct === report.overall.coveragePct', () => {
    const a = area({ id: 'a1', coverCropPlan: [win('clover', 3, 8)] });
    const direct = computeLivingRootsCoveragePct({ projectId: 'p1', cropAreas: [a] });
    const report = computeLivingRootsReport({ projectId: 'p1', cropAreas: [a] });
    expect(direct).toBe(report.overall.coveragePct);
  });
});

describe('covenant lock', () => {
  it('livingRootsMath.ts source contains no riba/gharar/CSRA/salam/investor/financing/cost-of-capital', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(here, '../livingRootsMath.ts'), 'utf8');
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '');
    const re = /\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b/i;
    expect(re.test(stripped)).toBe(false);
  });
});
