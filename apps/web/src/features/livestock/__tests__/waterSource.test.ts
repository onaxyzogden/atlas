import { describe, it, expect } from 'vitest';
import {
  bandForWater,
  WATER_BAND_THRESHOLDS_M,
  nearestWaterSource,
} from '../waterSource.js';
import type { Utility } from '../../../store/utilityStore.js';
import type { ProjectedStructure as Structure } from '@ogden/shared';
import type { WaterNode } from '../../../store/waterSystemsStore.js';

describe('bandForWater', () => {
  it('returns "missing" when distance is null', () => {
    expect(bandForWater(null)).toBe('missing');
  });

  it('returns "good" at and below the good threshold', () => {
    expect(bandForWater(0)).toBe('good');
    expect(bandForWater(WATER_BAND_THRESHOLDS_M.good)).toBe('good');
  });

  it('returns "fair" between the good and fair thresholds', () => {
    expect(bandForWater(WATER_BAND_THRESHOLDS_M.good + 1)).toBe('fair');
    expect(bandForWater(150)).toBe('fair');
    expect(bandForWater(WATER_BAND_THRESHOLDS_M.fair)).toBe('fair');
  });

  it('returns "poor" beyond the fair threshold', () => {
    expect(bandForWater(WATER_BAND_THRESHOLDS_M.fair + 1)).toBe('poor');
    expect(bandForWater(500)).toBe('poor');
  });
});

describe('nearestWaterSource', () => {
  const centroid = { lat: 0, lng: 0 };

  it('returns null kind when nothing matches', () => {
    expect(nearestWaterSource(centroid, [], [])).toEqual({
      distanceM: null,
      name: null,
      kind: null,
    });
  });

  it('ignores non-water utilities and structures', () => {
    const utils = [
      { id: 'u1', projectId: 'p', type: 'power_line', name: 'pwr', center: [0.001, 0] },
    ] as unknown as Utility[];
    const structs = [
      { id: 's1', projectId: 'p', type: 'barn', name: 'big', center: [0.001, 0] },
    ] as unknown as Structure[];
    expect(nearestWaterSource(centroid, utils, structs).distanceM).toBeNull();
  });

  it('counts a WaterNode storage tank as a water source', () => {
    const waterNodes = [
      {
        id: 'w1',
        projectId: 'p',
        name: 'Tank',
        kind: 'storage',
        storageKind: 'tank',
        center: [0.0003, 0],
        createdAt: '',
      },
    ] as unknown as WaterNode[];
    const result = nearestWaterSource(centroid, [], [], waterNodes);
    expect(result.name).toBe('Tank');
    expect(result.kind).toBe('tank');
    expect(result.distanceM).toBeLessThan(50);
  });

  it('counts a WaterNode catchment as a water source', () => {
    const waterNodes = [
      {
        id: 'w2',
        projectId: 'p',
        name: 'Roof catchment',
        kind: 'catchment',
        center: [0.0005, 0],
        createdAt: '',
      },
    ] as unknown as WaterNode[];
    const result = nearestWaterSource(centroid, [], [], waterNodes);
    expect(result.kind).toBe('catchment');
    expect(result.name).toBe('Roof catchment');
  });

  it('ignores swale and sink water nodes', () => {
    const waterNodes = [
      { id: 's1', projectId: 'p', name: 'Swale', kind: 'swale', center: [0.0001, 0], createdAt: '' },
      { id: 's2', projectId: 'p', name: 'Sink', kind: 'sink', center: [0.0001, 0], createdAt: '' },
    ] as unknown as WaterNode[];
    expect(nearestWaterSource(centroid, [], [], waterNodes).distanceM).toBeNull();
  });

  it('picks the closest across utilities and structures', () => {
    const utils = [
      { id: 'u1', projectId: 'p', type: 'water_tank', name: 'far tank', center: [0.01, 0] },
    ] as unknown as Utility[];
    const structs = [
      { id: 's1', projectId: 'p', type: 'well', name: 'close well', center: [0.0005, 0] },
    ] as unknown as Structure[];
    const result = nearestWaterSource(centroid, utils, structs);
    expect(result.name).toBe('close well');
    expect(result.kind).toBe('well');
  });
});
