// @vitest-environment happy-dom
/**
 * ringSeedGenerator — the first zone-generator. Locks the durable
 * contract: pure (no store), parcel-clipped, idempotent per Z-level,
 * closes the zero-state by emitting a home centre when none exists.
 */

import { describe, expect, it } from 'vitest';
import * as turf from '@turf/turf';
import { ringSeedGenerator } from '../ringSeedGenerator.js';
import type { ZoneGeneratorContext } from '../types.js';
import type { LandZone } from '../../../../../store/zoneStore.js';

const PID = 'proj-seed';

/** ~2.2 km square around [0,0] — comfortably contains the 500 m ring. */
function parcelFC(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      turf.polygon([
        [
          [-0.01, -0.01],
          [0.01, -0.01],
          [0.01, 0.01],
          [-0.01, 0.01],
          [-0.01, -0.01],
        ],
      ]),
    ],
  };
}

function ctx(over: Partial<ZoneGeneratorContext> = {}): ZoneGeneratorContext {
  return {
    projectId: PID,
    parcelBoundary: parcelFC(),
    existingZones: [],
    ...over,
  };
}

describe('ringSeedGenerator', () => {
  it('canRun is false with no parcel and no zones', () => {
    const res = ringSeedGenerator.canRun(
      ctx({ parcelBoundary: null, existingZones: [] }),
    );
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/parcel boundary/i);
  });

  it('zero-state: emits a home centre + Z1/Z2/Z3, areas strictly increasing', () => {
    const zones = ringSeedGenerator.generate(ctx());
    const byZ = new Map(zones.map((z) => [z.permacultureZone, z]));

    expect(zones).toHaveLength(4);
    const home = byZ.get(0)!;
    expect(home.isHomeCentre).toBe(true);
    expect(home.seedProvenance).toBe('ring-seed');
    expect(home.category).toBe('habitation');

    const a1 = byZ.get(1)!.areaM2;
    const a2 = byZ.get(2)!.areaM2;
    const a3 = byZ.get(3)!.areaM2;
    expect(a1).toBeGreaterThan(0);
    expect(a2).toBeGreaterThan(a1);
    expect(a3).toBeGreaterThan(a2);

    for (const z of zones) {
      expect(['Polygon', 'MultiPolygon']).toContain(z.geometry.type);
      expect(z.projectId).toBe(PID);
      expect(z.seedProvenance).toBe('ring-seed');
      expect(z.color).toMatch(/^#/);
    }
  });

  it('every seeded band stays inside the parcel', () => {
    const parcel = parcelFC().features[0]! as GeoJSON.Feature<GeoJSON.Polygon>;
    const parcelArea = turf.area(parcel);
    for (const z of ringSeedGenerator.generate(ctx())) {
      expect(z.areaM2).toBeLessThanOrEqual(parcelArea);
    }
  });

  it('idempotent: a level already ring-seeded is not re-seeded', () => {
    const seededZ2: LandZone = {
      id: 'z2-existing',
      projectId: PID,
      name: 'Z2 (seeded)',
      category: 'food_production',
      color: '#123456',
      primaryUse: '',
      secondaryUse: '',
      notes: '',
      geometry: turf.circle([0, 0], 80, { units: 'meters' })
        .geometry as GeoJSON.Polygon,
      areaM2: 1,
      permacultureZone: 2,
      seedProvenance: 'ring-seed',
      createdAt: 'x',
      updatedAt: 'x',
    };
    const zones = ringSeedGenerator.generate(
      ctx({ existingZones: [seededZ2] }),
    );
    expect(zones.some((z) => z.permacultureZone === 2)).toBe(false);
    // other levels still produced
    expect(zones.some((z) => z.permacultureZone === 3)).toBe(true);
  });

  it('uses an existing home-centre zone instead of emitting a new one', () => {
    const home: LandZone = {
      id: 'hc',
      projectId: PID,
      name: 'Home',
      category: 'habitation',
      color: '#abcdef',
      primaryUse: '',
      secondaryUse: '',
      notes: '',
      geometry: turf.circle([0.002, 0.002], 12, { units: 'meters' })
        .geometry as GeoJSON.Polygon,
      areaM2: 1,
      permacultureZone: 0,
      isHomeCentre: true,
      createdAt: 'x',
      updatedAt: 'x',
    };
    const zones = ringSeedGenerator.generate(
      ctx({ parcelBoundary: null, existingZones: [home] }),
    );
    // No new Z0 home centre; rings still produced (unclipped, no parcel).
    expect(zones.some((z) => z.permacultureZone === 0)).toBe(false);
    expect(zones.length).toBeGreaterThan(0);
  });
});
