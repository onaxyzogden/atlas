import { describe, it, expect } from 'vitest';
import {
  pathToDesignFeature,
  designFeatureToPath,
} from '../featureMapping.js';
import type { DesignPath } from '../../store/pathStore.js';
import type { DesignFeatureSummary } from '@ogden/shared';

function makePath(overrides: Partial<DesignPath> = {}): DesignPath {
  return {
    id: 'local-path-1',
    projectId: 'proj-local-1',
    name: 'Main farm lane',
    type: 'farm_lane',
    color: '#aa7744',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-122.1, 44.5],
        [-122.0, 44.6],
      ],
    },
    lengthM: 1420,
    phase: 'Phase 1',
    notes: 'Gravel, all-weather',
    isTemporary: false,
    seasonalMonths: [4, 5, 6],
    usageFrequency: 'daily',
    enterprise: 'ent-1',
    accessible: true,
    restPointAnchors: [[-122.05, 44.55]],
    createdAt: '2026-05-22T00:00:00.000Z',
    updatedAt: '2026-05-22T01:00:00.000Z',
    ...overrides,
  };
}

describe('path <-> design_feature mapping', () => {
  it('pathToDesignFeature shapes a featureType="path" create input', () => {
    const df = pathToDesignFeature(makePath(), 'server-proj-1');
    expect(df.featureType).toBe('path');
    expect(df.subtype).toBe('farm_lane');
    expect(df.label).toBe('Main farm lane');
    expect(df.phaseTag).toBe('Phase 1');
    expect(df.style).toEqual({ color: '#aa7744' });
    expect(df.geometry).toMatchObject({ type: 'LineString' });
    expect(df.properties).toMatchObject({
      localId: 'local-path-1',
      color: '#aa7744',
      lengthM: 1420,
      usageFrequency: 'daily',
      accessible: true,
      isTemporary: false,
      seasonalMonths: [4, 5, 6],
      enterprise: 'ent-1',
      restPointAnchors: [[-122.05, 44.55]],
      notes: 'Gravel, all-weather',
    });
  });

  it('empty phase maps to undefined phaseTag (omitted)', () => {
    const df = pathToDesignFeature(makePath({ phase: '' }), 'server-proj-1');
    expect(df.phaseTag).toBeUndefined();
  });

  it('designFeatureToPath restores the local DesignPath, carrying serverId', () => {
    const summary: DesignFeatureSummary = {
      id: 'server-path-99',
      projectId: 'server-proj-1',
      featureType: 'path',
      subtype: 'trail',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-122.2, 44.4],
          [-122.1, 44.5],
        ],
      },
      label: 'Ridge trail',
      properties: {
        localId: 'local-path-7',
        color: '#557722',
        lengthM: 800,
        usageFrequency: 'weekly',
        accessible: false,
        isTemporary: true,
        seasonalMonths: [7, 8],
        enterprise: 'ent-2',
        restPointAnchors: [[-122.15, 44.45]],
        notes: 'Summer only',
      },
      phaseTag: 'Phase 2',
      style: { color: '#557722' },
      sortOrder: 0,
      createdBy: null,
      createdAt: '2026-05-22T02:00:00.000Z',
      updatedAt: '2026-05-22T03:00:00.000Z',
    };
    const p = designFeatureToPath(summary, 'proj-local-1');
    expect(p.id).toBe('local-path-7');
    expect(p.projectId).toBe('proj-local-1');
    expect(p.name).toBe('Ridge trail');
    expect(p.type).toBe('trail');
    expect(p.color).toBe('#557722');
    expect(p.lengthM).toBe(800);
    expect(p.phase).toBe('Phase 2');
    expect(p.notes).toBe('Summer only');
    expect(p.isTemporary).toBe(true);
    expect(p.seasonalMonths).toEqual([7, 8]);
    expect(p.usageFrequency).toBe('weekly');
    expect(p.enterprise).toBe('ent-2');
    expect(p.accessible).toBe(false);
    expect(p.restPointAnchors).toEqual([[-122.15, 44.45]]);
    expect(p.serverId).toBe('server-path-99');
  });

  it('round-trips local -> wire -> server summary -> local without losing fields', () => {
    const original = makePath();
    const created = pathToDesignFeature(original, 'server-proj-1');
    const summary: DesignFeatureSummary = {
      id: 'server-path-1',
      projectId: 'server-proj-1',
      featureType: 'path',
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
    const restored = designFeatureToPath(summary, original.projectId);
    expect(restored.id).toBe(original.id);
    expect(restored.name).toBe(original.name);
    expect(restored.type).toBe(original.type);
    expect(restored.color).toBe(original.color);
    expect(restored.lengthM).toBe(original.lengthM);
    expect(restored.phase).toBe(original.phase);
    expect(restored.usageFrequency).toBe(original.usageFrequency);
    expect(restored.accessible).toBe(original.accessible);
    expect(restored.seasonalMonths).toEqual(original.seasonalMonths);
    expect(restored.serverId).toBe('server-path-1');
  });
});
