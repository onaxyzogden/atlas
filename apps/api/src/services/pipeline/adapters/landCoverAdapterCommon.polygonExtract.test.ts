/**
 * Unit tests for `extractParcelPolygon` — the helper that hands a
 * GeoJSON Polygon to `LandCoverRasterServiceBase.sampleHistogram`'s
 * polygon-mask path. The contract is "best-effort, never throws":
 * malformed or non-polygon input returns `undefined` so the adapter
 * silently falls back to the bbox-only fast path.
 */

import { describe, it, expect } from 'vitest';
import { extractParcelPolygon } from './landCoverAdapterCommon.js';

describe('extractParcelPolygon', () => {
  it('returns the same coordinates for a Polygon GeoJSON', () => {
    const polygon = {
      type: 'Polygon',
      coordinates: [[
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]],
    };
    const result = extractParcelPolygon(polygon);
    expect(result).toBeDefined();
    expect(result!.type).toBe('Polygon');
    expect(result!.coordinates).toEqual(polygon.coordinates);
  });

  it("returns the first sub-polygon's rings for a MultiPolygon", () => {
    const multi = {
      type: 'MultiPolygon',
      coordinates: [
        [[
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ]],
        [[
          [10, 10],
          [11, 10],
          [11, 11],
          [10, 11],
          [10, 10],
        ]],
      ],
    };
    const result = extractParcelPolygon(multi);
    expect(result).toBeDefined();
    expect(result!.type).toBe('Polygon');
    // First sub-polygon's outer ring.
    expect(result!.coordinates[0]![0]).toEqual([0, 0]);
    expect(result!.coordinates[0]![1]).toEqual([1, 0]);
  });

  it('returns undefined for null / undefined / empty boundary', () => {
    expect(extractParcelPolygon(null)).toBeUndefined();
    expect(extractParcelPolygon(undefined)).toBeUndefined();
    expect(extractParcelPolygon({})).toBeUndefined();
    expect(extractParcelPolygon({ type: 'Polygon' })).toBeUndefined();
    expect(extractParcelPolygon({ type: 'MultiPolygon', coordinates: [] })).toBeUndefined();
  });

  it('returns undefined for non-polygon geometry types', () => {
    expect(extractParcelPolygon({ type: 'Point', coordinates: [0, 0] })).toBeUndefined();
    expect(
      extractParcelPolygon({
        type: 'LineString',
        coordinates: [[0, 0], [1, 1]],
      }),
    ).toBeUndefined();
    expect(
      extractParcelPolygon({
        type: 'FeatureCollection',
        features: [],
      }),
    ).toBeUndefined();
  });
});
