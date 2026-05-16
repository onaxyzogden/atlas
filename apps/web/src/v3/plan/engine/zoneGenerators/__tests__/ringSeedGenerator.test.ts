// @vitest-environment happy-dom
/**
 * ringSeedGenerator — the first zone-generator. Locks the durable
 * contract: pure (no store), full (NOT parcel-clipped) rings,
 * steward-picked `anchorPoint` wins as the Z0 home centre, idempotent
 * per Z-level, closes the zero-state by emitting a home centre when
 * none exists.
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

  it('bands are NOT parcel-clipped — full rings on a tiny lot', () => {
    // ~22 m square (~490 m²) — far smaller than the 500 m Z3 ring.
    const tinyParcel: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        turf.polygon([
          [
            [-0.0001, -0.0001],
            [0.0001, -0.0001],
            [0.0001, 0.0001],
            [-0.0001, 0.0001],
            [-0.0001, -0.0001],
          ],
        ]),
      ],
    };
    const parcelArea = turf.area(tinyParcel.features[0]!);
    const zones = ringSeedGenerator.generate(
      ctx({ parcelBoundary: tinyParcel }),
    );
    const byZ = new Map(zones.map((z) => [z.permacultureZone, z]));
    // Z3 (0–500 m ring) dwarfs the parcel — proves no clip happened.
    expect(byZ.get(3)!.areaM2).toBeGreaterThan(parcelArea * 100);
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

  it('a steward-picked anchorPoint becomes the Z0 disc; rings grow from it', () => {
    const anchor: [number, number] = [0.004, -0.003];
    const zones = ringSeedGenerator.generate(
      ctx({ parcelBoundary: null, anchorPoint: anchor }),
    );
    const byZ = new Map(zones.map((z) => [z.permacultureZone, z]));

    const home = byZ.get(0)!;
    expect(home.isHomeCentre).toBe(true);
    expect(home.seedProvenance).toBe('ring-seed');
    // ~π·15² m² disc (geodesic, 64-step circle — allow slack).
    expect(home.areaM2).toBeGreaterThan(600);
    expect(home.areaM2).toBeLessThan(800);
    const homeC = turf.centroid(home.geometry).geometry.coordinates;
    expect(homeC[0]).toBeCloseTo(anchor[0], 3);
    expect(homeC[1]).toBeCloseTo(anchor[1], 3);

    // Z1–Z3 present, unclipped (no parcel), centred on the picked point.
    for (const zLevel of [1, 2, 3] as const) {
      const band = byZ.get(zLevel)!;
      expect(band).toBeDefined();
      const c = turf.centroid(band.geometry).geometry.coordinates;
      expect(c[0]).toBeCloseTo(anchor[0], 2);
      expect(c[1]).toBeCloseTo(anchor[1], 2);
    }
    expect(byZ.get(3)!.areaM2).toBeGreaterThan(byZ.get(2)!.areaM2);
  });
});
