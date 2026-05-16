// @vitest-environment happy-dom
/**
 * parcelGeometry — the shared clip/diff/union helpers backing both the
 * seed path and the "trim seeded zones to parcel" action. They must
 * degrade to null (never throw) on non-overlap / degenerate input so
 * callers can simply drop the zone.
 */

import { describe, expect, it } from 'vitest';
import * as turf from '@turf/turf';
import { clip, diff, parcelPolygon } from '../parcelGeometry.js';
import type { PolyFeature } from '../parcelGeometry.js';

const square = (
  cx: number,
  cy: number,
  half: number,
): PolyFeature =>
  turf.polygon([
    [
      [cx - half, cy - half],
      [cx + half, cy - half],
      [cx + half, cy + half],
      [cx - half, cy + half],
      [cx - half, cy - half],
    ],
  ]) as PolyFeature;

describe('parcelGeometry', () => {
  it('clip returns the overlap of two polygons', () => {
    const a = square(0, 0, 0.01);
    const b = square(0.005, 0, 0.01);
    const out = clip(a, b);
    expect(out).not.toBeNull();
    expect(turf.area(out!)).toBeGreaterThan(0);
    expect(turf.area(out!)).toBeLessThan(turf.area(a));
  });

  it('clip returns null when polygons do not overlap', () => {
    expect(clip(square(0, 0, 0.001), square(10, 10, 0.001))).toBeNull();
  });

  it('diff subtracts b from a', () => {
    const a = square(0, 0, 0.01);
    const b = square(0, 0, 0.005);
    const out = diff(a, b);
    expect(out).not.toBeNull();
    expect(turf.area(out!)).toBeLessThan(turf.area(a));
    expect(turf.area(out!)).toBeGreaterThan(0);
  });

  it('parcelPolygon unions every polygon feature; null on empty', () => {
    expect(parcelPolygon(null)).toBeNull();
    expect(
      parcelPolygon({ type: 'FeatureCollection', features: [] }),
    ).toBeNull();
    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [square(0, 0, 0.01), square(0.005, 0, 0.01)],
    };
    const u = parcelPolygon(fc);
    expect(u).not.toBeNull();
    // Union ≥ either input, ≤ their summed area.
    expect(turf.area(u!)).toBeGreaterThan(turf.area(square(0, 0, 0.01)));
  });
});
