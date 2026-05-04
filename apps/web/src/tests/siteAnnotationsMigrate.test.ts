/**
 * site-annotations-migrate — covers the one-time legacy `ogden-site-annotations`
 * v3 → 7 Scholar-aligned namespace stores migration.
 *
 * See ADR 2026-04-30-site-annotations-store-scholar-aligned-namespaces.md.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { migrateLegacyBlob, cleanupArchivedV3 } from '../store/site-annotations-migrate.js';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

const NEW_KEYS = [
  'ogden-external-forces',
  'ogden-topography',
  'ogden-ecology',
  'ogden-water-systems',
  'ogden-polyculture',
  'ogden-closed-loop',
  'ogden-swot',
] as const;

function fullV3Blob() {
  return {
    state: {
      hazards: [
        {
          id: 'h-1',
          projectId: 'p-1',
          type: 'flood',
          date: '2020-06-01',
          createdAt: '2020-06-01T00:00:00Z',
        },
      ],
      transects: [
        {
          id: 't-1',
          projectId: 'p-1',
          name: 'A',
          pointA: [-75, 45],
          pointB: [-74.99, 45.01],
          verticalElements: [
            {
              id: 've-1',
              type: 'tree',
              distanceAlongTransectM: 12,
              heightM: 6,
              label: 'Oak',
            },
          ],
        },
        {
          id: 't-2',
          projectId: 'p-1',
          name: 'B',
          pointA: [-75, 45],
          pointB: [-74.99, 45.01],
        },
      ],
      sectors: [{ id: 's-1', projectId: 'p-1', type: 'wind_prevailing', bearingDeg: 270, arcDeg: 60 }],
      ecology: [
        { id: 'e-1', projectId: 'p-1', species: 'Quercus', trophicLevel: 'producer', observedAt: '2020-06-01' },
      ],
      successionStageByProject: { 'p-1': 'mid' },
      swot: [{ id: 'sw-1', projectId: 'p-1', bucket: 'S', title: 'Springs', createdAt: '2020-06-01' }],
      earthworks: [
        {
          id: 'ew-1',
          projectId: 'p-1',
          type: 'swale',
          geometry: { type: 'LineString', coordinates: [] },
          lengthM: 10,
          createdAt: '2020-06-01',
        },
      ],
      storageInfra: [{ id: 'si-1', projectId: 'p-1', type: 'cistern', center: [-75, 45], createdAt: '2020-06-01' }],
      fertilityInfra: [
        { id: 'fi-1', projectId: 'p-1', type: 'composter', center: [-75, 45], createdAt: '2020-06-01' },
      ],
      guilds: [
        { id: 'g-1', projectId: 'p-1', name: 'Apple', anchorSpeciesId: 'malus', members: [], createdAt: '2020-06-01' },
      ],
      wasteVectors: [
        {
          id: 'wv-1',
          projectId: 'p-1',
          fromFeatureId: 'k',
          toFeatureId: 'c',
          label: 'kitchen→chickens',
          resourceType: 'organic_matter',
          createdAt: '2020-06-01',
        },
      ],
      species: [{ id: 'sp-1', projectId: 'p-1', speciesId: 'malus', createdAt: '2020-06-01' }],
      wasteVectorRuns: [{ id: 'wvr-1', projectId: 'p-1', vectorId: 'wv-1', runDate: '2026-04-01' }],
    },
    version: 3,
  };
}

describe('migrateLegacyBlob', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('seeds all 7 namespace stores from a populated v3 blob', () => {
    storage.setItem('ogden-site-annotations', JSON.stringify(fullV3Blob()));

    migrateLegacyBlob(storage);

    for (const key of NEW_KEYS) {
      const raw = storage.getItem(key);
      expect(raw, `expected ${key} seeded`).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.version).toBe(1);
    }

    const ext = JSON.parse(storage.getItem('ogden-external-forces')!).state;
    expect(ext.hazards).toHaveLength(1);
    expect(ext.sectors).toHaveLength(1);

    const eco = JSON.parse(storage.getItem('ogden-ecology')!).state;
    expect(eco.ecology).toHaveLength(1);
    expect(eco.successionStageByProject).toEqual({ 'p-1': 'mid' });

    const water = JSON.parse(storage.getItem('ogden-water-systems')!).state;
    expect(water.earthworks).toHaveLength(1);
    expect(water.storageInfra).toHaveLength(1);

    const poly = JSON.parse(storage.getItem('ogden-polyculture')!).state;
    expect(poly.guilds).toHaveLength(1);
    expect(poly.species).toHaveLength(1);

    const loop = JSON.parse(storage.getItem('ogden-closed-loop')!).state;
    expect(loop.wasteVectors).toHaveLength(1);
    expect(loop.wasteVectorRuns).toHaveLength(1);
    expect(loop.fertilityInfra).toHaveLength(1);

    const swot = JSON.parse(storage.getItem('ogden-swot')!).state;
    expect(swot.swot).toHaveLength(1);
  });

  it('migrates legacy verticalElements to verticalRefs as kind:standalone', () => {
    storage.setItem('ogden-site-annotations', JSON.stringify(fullV3Blob()));

    migrateLegacyBlob(storage);

    const topo = JSON.parse(storage.getItem('ogden-topography')!).state;
    expect(topo.transects).toHaveLength(2);
    const [t1, t2] = topo.transects;

    expect(t1.verticalElements).toBeUndefined();
    expect(t1.verticalRefs).toHaveLength(1);
    expect(t1.verticalRefs[0]).toMatchObject({
      id: 've-1',
      distanceAlongTransectM: 12,
      kind: 'standalone',
      standalone: { type: 'tree', heightM: 6, label: 'Oak' },
    });

    expect(t2.verticalElements).toBeUndefined();
    expect(t2.verticalRefs).toBeUndefined();
  });

  it('archives the legacy blob (renamed, not deleted) and removes the legacy key', () => {
    const blob = JSON.stringify(fullV3Blob());
    storage.setItem('ogden-site-annotations', blob);

    migrateLegacyBlob(storage);

    expect(storage.getItem('ogden-site-annotations')).toBeNull();
    expect(storage.getItem('ogden-site-annotations.archived-v3')).toBe(blob);
  });

  it('is idempotent: a second run is a no-op', () => {
    storage.setItem('ogden-site-annotations', JSON.stringify(fullV3Blob()));

    migrateLegacyBlob(storage);
    const snapshot: Record<string, string | null> = {};
    for (const key of NEW_KEYS) snapshot[key] = storage.getItem(key);

    migrateLegacyBlob(storage);

    for (const key of NEW_KEYS) {
      expect(storage.getItem(key)).toBe(snapshot[key]);
    }
  });

  it('does not overwrite a namespace key that has already rehydrated', () => {
    storage.setItem('ogden-site-annotations', JSON.stringify(fullV3Blob()));
    storage.setItem(
      'ogden-external-forces',
      JSON.stringify({ state: { hazards: [], sectors: [] }, version: 1 }),
    );

    migrateLegacyBlob(storage);

    const ext = JSON.parse(storage.getItem('ogden-external-forces')!).state;
    // Pre-existing empty store preserved; not overwritten by legacy hazards.
    expect(ext.hazards).toHaveLength(0);
  });

  it('leaves non-v3 blobs alone', () => {
    const v2 = { state: { hazards: [] }, version: 2 };
    storage.setItem('ogden-site-annotations', JSON.stringify(v2));

    migrateLegacyBlob(storage);

    expect(storage.getItem('ogden-site-annotations')).toBe(JSON.stringify(v2));
    for (const key of NEW_KEYS) expect(storage.getItem(key)).toBeNull();
  });

  it('returns silently when the legacy key is absent', () => {
    expect(() => migrateLegacyBlob(storage)).not.toThrow();
    for (const key of NEW_KEYS) expect(storage.getItem(key)).toBeNull();
  });

  it('returns silently when the legacy blob is corrupt', () => {
    storage.setItem('ogden-site-annotations', '{not json');
    expect(() => migrateLegacyBlob(storage)).not.toThrow();
    expect(storage.getItem('ogden-site-annotations')).toBe('{not json');
  });
});

describe('cleanupArchivedV3', () => {
  let storage: MemoryStorage;
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('removes the archive blob and reports true', () => {
    storage.setItem('ogden-site-annotations.archived-v3', '{"state":{},"version":3}');
    expect(cleanupArchivedV3(storage)).toBe(true);
    expect(storage.getItem('ogden-site-annotations.archived-v3')).toBeNull();
  });

  it('is a no-op when the archive is absent (returns false)', () => {
    expect(cleanupArchivedV3(storage)).toBe(false);
  });

  it('is idempotent — second call returns false', () => {
    storage.setItem('ogden-site-annotations.archived-v3', '{"state":{},"version":3}');
    expect(cleanupArchivedV3(storage)).toBe(true);
    expect(cleanupArchivedV3(storage)).toBe(false);
  });

  it('does not touch the 7 namespace keys', () => {
    storage.setItem('ogden-site-annotations.archived-v3', '{"state":{},"version":3}');
    for (const key of NEW_KEYS) {
      storage.setItem(key, JSON.stringify({ state: { sentinel: true }, version: 1 }));
    }
    cleanupArchivedV3(storage);
    for (const key of NEW_KEYS) {
      const raw = storage.getItem(key);
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw as string).state.sentinel).toBe(true);
    }
  });

  it('does not touch a still-present legacy key (defensive — should never coexist with archive)', () => {
    storage.setItem('ogden-site-annotations', '{"state":{},"version":3}');
    storage.setItem('ogden-site-annotations.archived-v3', '{"state":{},"version":3}');
    cleanupArchivedV3(storage);
    expect(storage.getItem('ogden-site-annotations')).not.toBeNull();
    expect(storage.getItem('ogden-site-annotations.archived-v3')).toBeNull();
  });
});
