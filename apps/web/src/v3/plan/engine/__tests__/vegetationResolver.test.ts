// @vitest-environment happy-dom
/**
 * vegetationResolver + vegetation migration contract.
 *
 *  - resolveZoneVegetation: manual override wins per-axis; otherwise the
 *    area-weighted dominant of overlapping patches; otherwise `none`.
 *  - deriveCurrentLandCover: project-scoped dominant cover by patch area.
 *  - groundCoverFromStage: legacy EcologyZone → seeded structural cover.
 *  - one-time absorb of persisted `ogden-ecology.ecologyZones`.
 *  - zoneStore v2→v3 succession migration `bare → disturbed`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resolveZoneVegetation,
  deriveCurrentLandCover,
} from '../vegetationResolver.js';
import { groundCoverFromStage } from '../../../../store/vegetationStore.js';
import type { VegetationPatch } from '../../../../store/vegetationStore.js';
import type { LandZone } from '../../../../store/zoneStore.js';

/** Axis-aligned square anchored at (lng0, lat0), `sideDeg` wide. */
function square(lng0: number, lat0: number, sideDeg: number): GeoJSON.Polygon {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [lng0, lat0],
        [lng0 + sideDeg, lat0],
        [lng0 + sideDeg, lat0 + sideDeg],
        [lng0, lat0 + sideDeg],
        [lng0, lat0],
      ],
    ],
  };
}

function makeZone(over: Partial<LandZone> = {}): LandZone {
  return {
    id: 'z1',
    projectId: 'p1',
    name: 'Zone',
    category: 'food_production',
    color: '#000',
    primaryUse: '',
    secondaryUse: '',
    notes: '',
    geometry: square(0, 0, 0.01),
    areaM2: 1000,
    createdAt: '2026-05-15T00:00:00Z',
    updatedAt: '2026-05-15T00:00:00Z',
    ...over,
  };
}

function makePatch(over: Partial<VegetationPatch> = {}): VegetationPatch {
  return {
    id: 'vp1',
    projectId: 'p1',
    geometry: square(0, 0, 0.01),
    successionStage: 'pioneer',
    groundCover: 'sparse-grasses',
    createdAt: '2026-05-15T00:00:00Z',
    ...over,
  };
}

describe('resolveZoneVegetation', () => {
  it('override wins per-axis even when patches overlap with another value', () => {
    const zone = makeZone({
      successionStage: 'climax',
      groundCover: 'forest',
    });
    const patches = [
      makePatch({ successionStage: 'pioneer', groundCover: 'bare-soil' }),
    ];
    const r = resolveZoneVegetation(zone, patches);
    expect(r.successionStage).toBe('climax');
    expect(r.groundCover).toBe('forest');
    expect(r.source).toBe('override');
  });

  it('derives the area-weighted dominant when no override', () => {
    const zone = makeZone({ geometry: square(0, 0, 0.02) });
    // Big patch (0.01×0.01) of `mid` vs a smaller (0.005×0.005) `pioneer`,
    // both fully inside the zone.
    const big = makePatch({
      id: 'big',
      geometry: square(0, 0, 0.01),
      successionStage: 'mid',
      groundCover: 'forest',
    });
    const small = makePatch({
      id: 'small',
      geometry: square(0.012, 0.012, 0.005),
      successionStage: 'pioneer',
      groundCover: 'bare-soil',
    });
    const r = resolveZoneVegetation(zone, [small, big]);
    expect(r.successionStage).toBe('mid');
    expect(r.groundCover).toBe('forest');
    expect(r.source).toBe('derived');
  });

  it('ignores patches that do not overlap the zone', () => {
    const zone = makeZone({ geometry: square(0, 0, 0.01) });
    const far = makePatch({ geometry: square(10, 10, 0.01) });
    const r = resolveZoneVegetation(zone, [far]);
    expect(r.successionStage).toBeNull();
    expect(r.groundCover).toBeNull();
    expect(r.source).toBe('none');
  });

  it('falls back to none with no patches and no override', () => {
    const r = resolveZoneVegetation(makeZone(), []);
    expect(r).toEqual({
      successionStage: null,
      groundCover: null,
      source: 'none',
    });
  });

  it('mixes override on one axis with derived on the other', () => {
    const zone = makeZone({ successionStage: 'late' });
    const patches = [makePatch({ groundCover: 'wetland' })];
    const r = resolveZoneVegetation(zone, patches);
    expect(r.successionStage).toBe('late');
    expect(r.groundCover).toBe('wetland');
    // Any override present marks the pair as override.
    expect(r.source).toBe('override');
  });
});

describe('deriveCurrentLandCover', () => {
  it('returns the project-scoped dominant cover by area', () => {
    const patches = [
      makePatch({ id: 'a', geometry: square(0, 0, 0.02), groundCover: 'forest' }),
      makePatch({ id: 'b', geometry: square(1, 1, 0.005), groundCover: 'sand' }),
    ];
    expect(deriveCurrentLandCover('p1', patches)).toBe('forest');
  });

  it('excludes patches from other projects', () => {
    const patches = [
      makePatch({ id: 'a', projectId: 'other', geometry: square(0, 0, 0.02), groundCover: 'forest' }),
      makePatch({ id: 'b', projectId: 'p1', geometry: square(1, 1, 0.005), groundCover: 'sand' }),
    ];
    expect(deriveCurrentLandCover('p1', patches)).toBe('sand');
  });

  it('returns null when there are no patches', () => {
    expect(deriveCurrentLandCover('p1', [])).toBeNull();
  });
});

describe('groundCoverFromStage (legacy EcologyZone seed)', () => {
  it('maps climax/late → forest', () => {
    expect(groundCoverFromStage('climax')).toBe('forest');
    expect(groundCoverFromStage('late')).toBe('forest');
  });
  it('maps disturbed → bare-soil', () => {
    expect(groundCoverFromStage('disturbed')).toBe('bare-soil');
  });
  it('maps pioneer/mid → sparse-grasses', () => {
    expect(groundCoverFromStage('pioneer')).toBe('sparse-grasses');
    expect(groundCoverFromStage('mid')).toBe('sparse-grasses');
  });
});

describe('one-time ogden-ecology → ogden-vegetation absorb', () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it('drains persisted ecologyZones into patches and strips them', async () => {
    window.localStorage.setItem(
      'ogden-ecology',
      JSON.stringify({
        state: {
          ecology: [],
          successionStageByProject: {},
          ecologyZones: [
            {
              id: 'ez-1',
              projectId: 'p1',
              geometry: square(0, 0, 0.01),
              dominantStage: 'late',
              label: 'East woodlot',
              createdAt: '2026-05-07T00:00:00Z',
            },
          ],
        },
        version: 2,
      }),
    );

    const { useVegetationStore } = await import(
      '../../../../store/vegetationStore.js'
    );

    const patches = useVegetationStore.getState().patches;
    const absorbed = patches.find((p) => p.id === 'ez-1');
    expect(absorbed).toBeTruthy();
    expect(absorbed!.successionStage).toBe('late');
    expect(absorbed!.groundCover).toBe('forest');
    expect(useVegetationStore.getState().migratedFromEcology).toBe(true);

    const rewritten = JSON.parse(
      window.localStorage.getItem('ogden-ecology')!,
    ) as { state?: { ecologyZones?: unknown } };
    expect(rewritten.state?.ecologyZones).toBeUndefined();
  });
});

describe('zoneStore v2→v3 succession migration (bare → disturbed)', () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it('rewrites legacy `bare` to `disturbed`, leaving others intact', async () => {
    window.localStorage.setItem(
      'ogden-zones',
      JSON.stringify({
        state: {
          zones: [
            { ...makeZone({ id: 'old' }), successionStage: 'bare' },
            { ...makeZone({ id: 'keep' }), successionStage: 'mid' },
          ],
        },
        version: 2,
      }),
    );

    const { useZoneStore } = await import('../../../../store/zoneStore.js');
    const zones = useZoneStore.getState().zones;
    expect(zones.find((z) => z.id === 'old')?.successionStage).toBe('disturbed');
    expect(zones.find((z) => z.id === 'keep')?.successionStage).toBe('mid');
  });
});
