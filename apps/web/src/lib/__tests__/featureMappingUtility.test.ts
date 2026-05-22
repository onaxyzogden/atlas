import { describe, it, expect } from 'vitest';
import {
  utilityToDesignFeature,
  designFeatureToPoint,
} from '../featureMapping.js';
import type { Utility } from '../../store/utilityStore.js';
import type { DesignFeatureSummary } from '@ogden/shared';

function makeUtility(overrides: Partial<Utility> = {}): Utility {
  return {
    id: 'local-util-1',
    projectId: 'proj-local-1',
    name: 'Roof cistern',
    type: 'water_tank',
    center: [-122.05, 44.55],
    phase: 'Phase 1',
    notes: '5000 gal poly tank',
    demandKwhPerDay: 0,
    capacityGal: 5000,
    isTemporary: false,
    seasonalMonths: [],
    createdAt: '2026-05-22T00:00:00.000Z',
    updatedAt: '2026-05-22T01:00:00.000Z',
    ...overrides,
  };
}

describe('utility <-> design_feature (point) mapping', () => {
  it('utilityToDesignFeature shapes a featureType="point" create input', () => {
    const df = utilityToDesignFeature(makeUtility(), 'server-proj-1');
    expect(df.featureType).toBe('point');
    expect(df.subtype).toBe('water_tank');
    expect(df.label).toBe('Roof cistern');
    expect(df.phaseTag).toBe('Phase 1');
    expect(df.geometry).toEqual({ type: 'Point', coordinates: [-122.05, 44.55] });
    expect(df.properties).toMatchObject({
      localId: 'local-util-1',
      center: [-122.05, 44.55],
      demandKwhPerDay: 0,
      capacityGal: 5000,
      isTemporary: false,
      seasonalMonths: [],
      notes: '5000 gal poly tank',
    });
  });

  it('empty phase maps to undefined phaseTag (omitted)', () => {
    const df = utilityToDesignFeature(makeUtility({ phase: '' }), 'server-proj-1');
    expect(df.phaseTag).toBeUndefined();
  });

  it('designFeatureToPoint restores the local Utility, carrying serverId', () => {
    const summary: DesignFeatureSummary = {
      id: 'server-util-99',
      projectId: 'server-proj-1',
      featureType: 'point',
      subtype: 'solar_panel',
      geometry: { type: 'Point', coordinates: [-122.2, 44.4] },
      label: 'South array',
      properties: {
        localId: 'local-util-7',
        center: [-122.2, 44.4],
        demandKwhPerDay: 12,
        capacityGal: undefined,
        isTemporary: true,
        seasonalMonths: [6, 7, 8],
        notes: 'Summer peak',
      },
      phaseTag: 'Phase 2',
      style: null,
      sortOrder: 0,
      createdBy: null,
      createdAt: '2026-05-22T02:00:00.000Z',
      updatedAt: '2026-05-22T03:00:00.000Z',
    };
    const u = designFeatureToPoint(summary, 'proj-local-1');
    expect(u.id).toBe('local-util-7');
    expect(u.projectId).toBe('proj-local-1');
    expect(u.name).toBe('South array');
    expect(u.type).toBe('solar_panel');
    expect(u.center).toEqual([-122.2, 44.4]);
    expect(u.phase).toBe('Phase 2');
    expect(u.notes).toBe('Summer peak');
    expect(u.demandKwhPerDay).toBe(12);
    expect(u.isTemporary).toBe(true);
    expect(u.seasonalMonths).toEqual([6, 7, 8]);
    expect(u.serverId).toBe('server-util-99');
  });

  it('falls back to geometry coordinates when properties.center is absent', () => {
    const summary: DesignFeatureSummary = {
      id: 'server-util-2',
      projectId: 'server-proj-1',
      featureType: 'point',
      subtype: 'well_pump',
      geometry: { type: 'Point', coordinates: [-121.9, 44.7] },
      label: 'Well',
      properties: { localId: 'local-util-9', notes: '' },
      phaseTag: null,
      style: null,
      sortOrder: 0,
      createdBy: null,
      createdAt: '2026-05-22T04:00:00.000Z',
      updatedAt: '2026-05-22T05:00:00.000Z',
    };
    const u = designFeatureToPoint(summary, 'proj-local-1');
    expect(u.center).toEqual([-121.9, 44.7]);
    expect(u.phase).toBe('');
  });

  it('round-trips local -> wire -> server summary -> local without losing fields', () => {
    const original = makeUtility({ type: 'rain_catchment', capacityGal: 1200 });
    const created = utilityToDesignFeature(original, 'server-proj-1');
    const summary: DesignFeatureSummary = {
      id: 'server-util-1',
      projectId: 'server-proj-1',
      featureType: 'point',
      subtype: created.subtype ?? null,
      geometry: created.geometry,
      label: created.label ?? null,
      properties: created.properties,
      phaseTag: created.phaseTag ?? null,
      style: created.style ?? null,
      sortOrder: created.sortOrder ?? 0,
      createdBy: null,
      createdAt: original.createdAt,
      updatedAt: original.updatedAt,
    };
    const restored = designFeatureToPoint(summary, original.projectId);
    expect(restored.id).toBe(original.id);
    expect(restored.name).toBe(original.name);
    expect(restored.type).toBe(original.type);
    expect(restored.center).toEqual(original.center);
    expect(restored.phase).toBe(original.phase);
    expect(restored.capacityGal).toBe(original.capacityGal);
    expect(restored.serverId).toBe('server-util-1');
  });
});
