import { describe, it, expect } from 'vitest';
import {
  pickClickedPolygon,
  pickClickedLine,
} from '../pickClickedFeature.js';

describe('pickClickedPolygon', () => {
  it('returns the same polygon for a plain Polygon (identity)', () => {
    const poly: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0.001, 0],
          [0.001, 0.001],
          [0, 0.001],
          [0, 0],
        ],
      ],
    };
    expect(pickClickedPolygon(poly, [0.0005, 0.0005])).toBe(poly);
  });

  it('returns the ring whose interior contains the click for a MultiPolygon', () => {
    const ringA: GeoJSON.Position[][] = [
      [
        [0, 0],
        [0.001, 0],
        [0.001, 0.001],
        [0, 0.001],
        [0, 0],
      ],
    ];
    const ringB: GeoJSON.Position[][] = [
      [
        [1, 1],
        [1.001, 1],
        [1.001, 1.001],
        [1, 1.001],
        [1, 1],
      ],
    ];
    const multi: GeoJSON.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [ringA, ringB],
    };
    const picked = pickClickedPolygon(multi, [0.0005, 0.0005]);
    expect(picked).not.toBeNull();
    expect(picked!.coordinates).toBe(ringA);
  });

  it('falls back to nearest-centroid when the click is outside every ring', () => {
    const ringA: GeoJSON.Position[][] = [
      [
        [0, 0],
        [0.001, 0],
        [0.001, 0.001],
        [0, 0.001],
        [0, 0],
      ],
    ];
    const ringB: GeoJSON.Position[][] = [
      [
        [1, 1],
        [1.001, 1],
        [1.001, 1.001],
        [1, 1.001],
        [1, 1],
      ],
    ];
    const multi: GeoJSON.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [ringA, ringB],
    };
    // Click well outside both rings but closer to ring B's centroid (1, 1).
    const picked = pickClickedPolygon(multi, [0.99, 0.99]);
    expect(picked).not.toBeNull();
    expect(picked!.coordinates).toBe(ringB);
  });

  it('returns null for an empty MultiPolygon', () => {
    const empty: GeoJSON.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [],
    };
    expect(pickClickedPolygon(empty, [0, 0])).toBeNull();
  });

  it('returns null for a non-polygon geometry', () => {
    const point = { type: 'Point', coordinates: [0, 0] } as GeoJSON.Geometry;
    expect(pickClickedPolygon(point, [0, 0])).toBeNull();
  });
});

describe('pickClickedLine', () => {
  it('returns the same line for a plain LineString (identity)', () => {
    const line: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [0.001, 0.001],
      ],
    };
    expect(pickClickedLine(line, [0, 0])).toBe(line);
  });

  it('picks the closer segment in a MultiLineString', () => {
    const segA: GeoJSON.Position[] = [
      [0, 0],
      [0.001, 0],
    ];
    const segB: GeoJSON.Position[] = [
      [0, 1],
      [0.001, 1],
    ];
    const multi: GeoJSON.MultiLineString = {
      type: 'MultiLineString',
      coordinates: [segA, segB],
    };
    // Click near segment B (lat ~ 1).
    const picked = pickClickedLine(multi, [0.0005, 0.99]);
    expect(picked).not.toBeNull();
    expect(picked!.coordinates).toBe(segB);
  });

  it('returns null for an empty MultiLineString', () => {
    const empty: GeoJSON.MultiLineString = {
      type: 'MultiLineString',
      coordinates: [],
    };
    expect(pickClickedLine(empty, [0, 0])).toBeNull();
  });

  it('skips degenerate 1-coord segments and picks the valid one', () => {
    const degenerate: GeoJSON.Position[] = [[0, 0]];
    const valid: GeoJSON.Position[] = [
      [0, 1],
      [0.001, 1],
    ];
    const multi: GeoJSON.MultiLineString = {
      type: 'MultiLineString',
      coordinates: [degenerate, valid],
    };
    const picked = pickClickedLine(multi, [0, 1]);
    expect(picked).not.toBeNull();
    expect(picked!.coordinates).toBe(valid);
  });

  it('returns null for a non-line geometry', () => {
    const poly = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    } as GeoJSON.Geometry;
    expect(pickClickedLine(poly, [0, 0])).toBeNull();
  });
});
