// @vitest-environment happy-dom
/**
 * recomputeRingZones — the after-placement "Resize rings" core. Locks the
 * "whole ring set together" contract: editing the radii re-grows every
 * ring-seed zone in place from the home anchor (new geometry + area) while
 * PRESERVING each zone's name / category / notes, and never touches
 * hand-drawn (non-`ring-seed`) zones.
 */

import { afterEach, describe, expect, it } from 'vitest';
import * as turf from '@turf/turf';
import { recomputeRingZones } from '../planFeatureActions.js';
import { useZoneStore, type LandZone } from '../../../store/zoneStore.js';
import { ringSeedGenerator } from '../engine/zoneGenerators/ringSeedGenerator.js';

const PID = 'proj-resize';

function seedDefault(): LandZone[] {
  // Reuse the real generator to lay a canonical ring set at the origin.
  return ringSeedGenerator.generate({
    projectId: PID,
    parcelBoundary: null,
    existingZones: [],
    anchorPoint: [0, 0],
  });
}

afterEach(() => {
  useZoneStore.setState({ zones: [] });
});

describe('recomputeRingZones', () => {
  it('re-grows every ring-seed zone in place, preserving name/category', () => {
    const seeded = seedDefault();
    // Rename + re-note a couple of rings (simulate steward edits the resize
    // must preserve).
    const z2 = seeded.find((z) => z.permacultureZone === 2)!;
    z2.name = 'My weekly beds';
    z2.notes = 'kept';
    const z2BeforeArea = z2.areaM2;
    seeded.forEach((z) => useZoneStore.getState().addZone(z));

    recomputeRingZones(PID, {
      homeM: 30,
      z1M: 60,
      z2M: 200,
      z3M: 600,
      z4M: 1200,
      z5M: 2400,
    });

    const after = useZoneStore.getState().getProjectZones(PID);
    const a2 = after.find((z) => z.permacultureZone === 2)!;
    // Geometry/area grew (doubled radii) …
    expect(a2.areaM2).toBeGreaterThan(z2BeforeArea);
    // … but the steward's name / notes / category survived.
    expect(a2.name).toBe('My weekly beds');
    expect(a2.notes).toBe('kept');
    expect(a2.category).toBe(z2.category);
    // Same record id — updated in place, not replaced.
    expect(a2.id).toBe(z2.id);

    // Z0 disc tracked homeM (π·30² ≈ 2827 m²).
    const home = after.find((z) => z.permacultureZone === 0)!;
    expect(home.areaM2).toBeGreaterThan(2500);
    expect(home.areaM2).toBeLessThan(3100);

    // Every band is still strictly nested by area.
    const area = (z: number) =>
      after.find((x) => x.permacultureZone === z)!.areaM2;
    expect(area(2)).toBeGreaterThan(area(1));
    expect(area(5)).toBeGreaterThan(area(4));
  });

  it('leaves hand-drawn (non-ring-seed) zones untouched', () => {
    const seeded = seedDefault();
    seeded.forEach((z) => useZoneStore.getState().addZone(z));
    const handDrawn: LandZone = {
      id: 'hand-1',
      projectId: PID,
      name: 'Hand-drawn bed',
      category: 'food_production',
      color: '#abcdef',
      primaryUse: '',
      secondaryUse: '',
      notes: '',
      geometry: turf.circle([0.005, 0.005], 20, { units: 'meters' })
        .geometry as GeoJSON.Polygon,
      areaM2: 1234,
      permacultureZone: 2,
      createdAt: 'x',
      updatedAt: 'x',
    };
    useZoneStore.getState().addZone(handDrawn);

    recomputeRingZones(PID, {
      homeM: 30,
      z1M: 60,
      z2M: 200,
      z3M: 600,
      z4M: 1200,
      z5M: 2400,
    });

    const after = useZoneStore.getState().getProjectZones(PID);
    const hand = after.find((z) => z.id === 'hand-1')!;
    // Untouched — no ring-seed provenance, so geometry/area are unchanged.
    expect(hand.areaM2).toBe(1234);
    expect(hand.geometry).toEqual(handDrawn.geometry);
  });
});
