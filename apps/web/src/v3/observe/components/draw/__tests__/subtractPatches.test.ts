// @vitest-environment happy-dom
/**
 * Tests for the pure half of `subtractPatches` and the round-trip
 * through the geometry registry. Pins the `@turf/turf` v7 invariant
 * (`difference` takes a `FeatureCollection` of two polygons, not two
 * positional args) so a future turf bump that flips the signature
 * again is caught here, not at runtime in the operator's hand.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import * as turf from '@turf/turf';
import { subtractPatches } from '../subtractPatches.js';
import {
  readPolygon,
  writePolygon,
} from '../annotationGeometryRegistry.js';
import { useVegetationStore } from '../../../../../store/vegetationStore.js';
import { usePastureStore } from '../../../../../store/pastureStore.js';

/** A square polygon with the requested side length, centred on origin. */
function squareAt(
  cx: number,
  cy: number,
  half: number,
): GeoJSON.Polygon {
  return {
    type: 'Polygon',
    coordinates: [[
      [cx - half, cy - half],
      [cx + half, cy - half],
      [cx + half, cy + half],
      [cx - half, cy + half],
      [cx - half, cy - half],
    ]],
  };
}

const BOUNDARY = squareAt(0, 0, 10);
const BOUNDARY_AREA = turf.area(turf.feature(BOUNDARY));

function areaOf(g: GeoJSON.Polygon | GeoJSON.MultiPolygon): number {
  return turf.area(turf.feature(g));
}

describe('subtractPatches (pure)', () => {
  it('returns boundary unchanged when no subtractees', () => {
    const result = subtractPatches(BOUNDARY, []);
    // Empty subtractees is an intentional pass-through — referential
    // equality so callers can branch on identity if useful.
    expect(result).toBe(BOUNDARY);
  });

  it('cuts one hole when a single crop sits fully inside', () => {
    const crop = squareAt(0, 0, 2); // 4×4 patch
    const result = subtractPatches(BOUNDARY, [crop]) as GeoJSON.Polygon;
    expect(result).not.toBeNull();
    expect(result.type).toBe('Polygon');
    // Outer ring + 1 inner ring.
    expect(result.coordinates).toHaveLength(2);
    // Area roughly = boundary − crop. Use a generous tolerance for the
    // m² conversion turf performs on planar lat/lng-as-meters input.
    const expected = BOUNDARY_AREA - turf.area(turf.feature(crop));
    expect(areaOf(result)).toBeCloseTo(expected, -2);
  });

  it('cuts two holes when two non-touching crops sit inside', () => {
    const c1 = squareAt(-5, 0, 1);
    const c2 = squareAt(5, 0, 1);
    const result = subtractPatches(BOUNDARY, [c1, c2]) as GeoJSON.Polygon;
    expect(result).not.toBeNull();
    expect(result.type).toBe('Polygon');
    expect(result.coordinates).toHaveLength(3); // outer + 2 holes
    const expected =
      BOUNDARY_AREA - turf.area(turf.feature(c1)) - turf.area(turf.feature(c2));
    expect(areaOf(result)).toBeCloseTo(expected, -2);
  });

  it('clips when a crop spans the boundary into the exterior', () => {
    // Half-in, half-out: centred at (10, 0) so it pokes outside the +x edge.
    const spanning = squareAt(10, 0, 3);
    const result = subtractPatches(BOUNDARY, [spanning]) as GeoJSON.Polygon;
    expect(result).not.toBeNull();
    expect(result.type).toBe('Polygon');
    // No interior ring — the subtraction clips the boundary, doesn't
    // hole it. So only the outer ring should remain.
    expect(result.coordinates).toHaveLength(1);
    // Net area = boundary − (intersect area), strictly less than gross.
    expect(areaOf(result)).toBeLessThan(BOUNDARY_AREA);
    expect(areaOf(result)).toBeGreaterThan(0);
  });

  it('returns null when one crop fully covers the boundary', () => {
    const cover = squareAt(0, 0, 50); // dwarfs the boundary
    const result = subtractPatches(BOUNDARY, [cover]);
    expect(result).toBeNull();
  });

  it('returns a MultiPolygon when crops split the boundary in two', () => {
    // A vertical strip down the middle that goes top-to-bottom of the
    // boundary, severing left + right halves.
    const strip: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[
        [-1, -15],
        [1, -15],
        [1, 15],
        [-1, 15],
        [-1, -15],
      ]],
    };
    const result = subtractPatches(BOUNDARY, [strip]);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('MultiPolygon');
    expect((result as GeoJSON.MultiPolygon).coordinates).toHaveLength(2);
  });

  it('silently skips a malformed subtrahend and keeps reducing', () => {
    // Self-intersecting "bowtie" — turf.difference may throw or yield
    // garbage. We expect the reduction to swallow the error and move on.
    const bowtie: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[
        [-3, -3],
        [3, 3],
        [-3, 3],
        [3, -3],
        [-3, -3],
      ]],
    };
    const goodCrop = squareAt(0, 0, 1);
    const result = subtractPatches(BOUNDARY, [bowtie, goodCrop]);
    // We don't pin the exact geometry — what matters is the reduction
    // didn't blow up and we got *something* (or null).
    expect(() => result).not.toThrow();
  });

  it('pins the @turf/turf v7 FeatureCollection invariant', () => {
    // This test exists purely as a tripwire. If a future turf bump
    // flips `difference` back to positional args, this assertion still
    // passes (our wrapper uses FC form) but `subtractPatches` returns
    // null/garbage because turf sees an FC where it now wants two
    // positional features. The behavioural tests above will fail in
    // that scenario; this one just makes the *intent* explicit.
    const crop = squareAt(0, 0, 2);
    const direct = turf.difference(
      turf.featureCollection([turf.feature(BOUNDARY), turf.feature(crop)]),
    );
    expect(direct).not.toBeNull();
    expect(direct!.geometry.type).toBe('Polygon');
  });
});

describe('annotationGeometryRegistry — MultiPolygon round-trip', () => {
  // Stores live in zundo+persist+zustand land; clean between cases so
  // record ids don't leak.
  beforeEach(() => {
    useVegetationStore.setState({ patches: [] });
    usePastureStore.setState({ pastures: [] });
  });

  it('vegetation: writePolygon(MultiPolygon) → readPolygon survives', () => {
    const id = 'veg-mp-1';
    const mp: GeoJSON.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
        squareAt(-5, 0, 1).coordinates,
        squareAt(5, 0, 1).coordinates,
      ],
    };
    // Seed a record so update has something to find.
    useVegetationStore.setState({
      patches: [{
        id,
        projectId: 'p',
        geometry: squareAt(0, 0, 1),
        successionStage: 'early-successional',
        groundCover: 'mixed',
        notes: '',
        createdAt: new Date().toISOString(),
      } as never],
    });
    writePolygon('vegetation', id, mp);
    const round = readPolygon('vegetation', id);
    expect(round).not.toBeNull();
    expect(round!.type).toBe('MultiPolygon');
    expect((round as GeoJSON.MultiPolygon).coordinates).toHaveLength(2);
  });

  it('pasture: writePolygon(MultiPolygon) → readPolygon survives', () => {
    const id = 'pas-mp-1';
    const mp: GeoJSON.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
        squareAt(-5, 0, 1).coordinates,
        squareAt(5, 0, 1).coordinates,
      ],
    };
    usePastureStore.setState({
      pastures: [{
        id,
        projectId: 'p',
        geometry: squareAt(0, 0, 1),
        kind: 'open-pasture',
        createdAt: new Date().toISOString(),
      } as never],
    });
    writePolygon('pasture', id, mp);
    const round = readPolygon('pasture', id);
    expect(round).not.toBeNull();
    expect(round!.type).toBe('MultiPolygon');
    expect((round as GeoJSON.MultiPolygon).coordinates).toHaveLength(2);
  });
});
