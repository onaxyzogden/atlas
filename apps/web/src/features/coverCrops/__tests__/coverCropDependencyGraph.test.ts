/**
 * coverCropDependencyGraph — pure unit tests (B5.2.x.c).
 */

import { describe, it, expect } from 'vitest';
import type { WorkItem } from '@ogden/shared';
import { seedCoverCropDependencies } from '../coverCropDependencyGraph.js';

function cc(id: string, provenance: string): WorkItem {
  return {
    id,
    projectId: 'p1',
    source: 'cover-crop',
    overridden: false,
    generatedFromCoverCropWindow: provenance,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: id,
    phaseId: null,
    status: 'todo',
    dependsOn: [],
    dependsOnAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
  } as WorkItem;
}

function cash(id: string, provenance: string): WorkItem {
  return {
    id,
    projectId: 'p1',
    source: 'goal-compass',
    overridden: false,
    generatedFromPlantingCalendar: provenance,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: id,
    phaseId: null,
    status: 'todo',
    dependsOn: [],
    dependsOnAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
  } as WorkItem;
}

describe('seedCoverCropDependencies', () => {
  it('emits coverCrop→cashCrop edges on shared CropArea', () => {
    const result = seedCoverCropDependencies({
      coverCropItems: [cc('cc-a-0', 'area-a__0')],
      cashCropItems: [cash('pc-tomato-area-a-2026', 'tomato:area-a:2026')],
    });
    expect(result.get('cc-a-0')).toEqual(['pc-tomato-area-a-2026']);
  });

  it('emits multiple successor edges when multiple cash crops on one area', () => {
    const result = seedCoverCropDependencies({
      coverCropItems: [cc('cc-a-0', 'area-a__0')],
      cashCropItems: [
        cash('pc-tomato', 'tomato:area-a:2026'),
        cash('pc-pepper', 'pepper:area-a:2026'),
      ],
    });
    expect(result.get('cc-a-0')?.sort()).toEqual(['pc-pepper', 'pc-tomato']);
  });

  it('omits cover crops with no cash crop on the area (orphan silence)', () => {
    const result = seedCoverCropDependencies({
      coverCropItems: [cc('cc-a-0', 'area-a__0')],
      cashCropItems: [cash('pc-tomato', 'tomato:area-b:2026')],
    });
    expect(result.has('cc-a-0')).toBe(false);
    expect(result.size).toBe(0);
  });

  it('isolates edges per CropArea — no cross-area leakage', () => {
    const result = seedCoverCropDependencies({
      coverCropItems: [cc('cc-a-0', 'area-a__0'), cc('cc-b-0', 'area-b__0')],
      cashCropItems: [
        cash('pc-tomato', 'tomato:area-a:2026'),
        cash('pc-pepper', 'pepper:area-b:2026'),
      ],
    });
    expect(result.get('cc-a-0')).toEqual(['pc-tomato']);
    expect(result.get('cc-b-0')).toEqual(['pc-pepper']);
  });

  it('skips items missing cover-crop provenance', () => {
    const bad = cc('cc-bad', '');
    const result = seedCoverCropDependencies({
      coverCropItems: [bad],
      cashCropItems: [cash('pc-tomato', 'tomato:area-a:2026')],
    });
    expect(result.size).toBe(0);
  });

  it('skips items whose source is not cover-crop', () => {
    const wrongSource = { ...cc('cc-a-0', 'area-a__0'), source: 'manual' } as WorkItem;
    const result = seedCoverCropDependencies({
      coverCropItems: [wrongSource],
      cashCropItems: [cash('pc-tomato', 'tomato:area-a:2026')],
    });
    expect(result.size).toBe(0);
  });

  it('skips cash-crop rows with malformed planting-calendar provenance', () => {
    const result = seedCoverCropDependencies({
      coverCropItems: [cc('cc-a-0', 'area-a__0')],
      cashCropItems: [cash('pc-bad', 'not-a-valid-provenance')],
    });
    expect(result.size).toBe(0);
  });

  it('does not include cover-crop ids that lack successors (no empty arrays)', () => {
    const result = seedCoverCropDependencies({
      coverCropItems: [cc('cc-a-0', 'area-a__0'), cc('cc-b-0', 'area-b__0')],
      cashCropItems: [cash('pc-tomato', 'tomato:area-a:2026')],
    });
    expect(result.has('cc-a-0')).toBe(true);
    expect(result.has('cc-b-0')).toBe(false);
  });
});
