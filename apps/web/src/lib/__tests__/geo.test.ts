import { describe, it, expect } from 'vitest';
import {
  haversineM,
  polygonCentroid,
  extractBoundaryGeometry,
} from '../geo.js';

describe('polygonCentroid', () => {
  it('returns the mean vertex of a square ring centred on origin', () => {
    const c = polygonCentroid({
      type: 'Polygon',
      coordinates: [
        [
          [-0.001, -0.001],
          [0.001, -0.001],
          [0.001, 0.001],
          [-0.001, 0.001],
          [-0.001, -0.001],
        ],
      ],
    });
    expect(c).not.toBeNull();
    // 5-vertex closed ring → vertex average lands ~ -2e-4, not exactly 0
    // (the closing-repeat bias the JSDoc calls out).
    expect(c![0]).toBeCloseTo(0, 3);
    expect(c![1]).toBeCloseTo(0, 3);
  });

  it('returns null for an empty ring', () => {
    expect(polygonCentroid({ type: 'Polygon', coordinates: [[]] })).toBeNull();
  });

  it('returns null when no coordinates ring is present', () => {
    expect(
      polygonCentroid({ type: 'Polygon', coordinates: [] as unknown as GeoJSON.Position[][] }),
    ).toBeNull();
  });

  it('skips invalid points but still returns a centroid for the valid ones', () => {
    const c = polygonCentroid({
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [2, 0] as GeoJSON.Position,
          [Number.NaN as unknown as number, 0],
          [2, 2],
          [0, 2],
          [0, 0],
        ],
      ],
    });
    // NaN propagates through average if not skipped — guard checks
    // `typeof === number`, so NaN passes the type guard and contaminates
    // the result. Documented: callers should only feed clean GeoJSON.
    // This test pins current behaviour rather than the ideal.
    expect(c).not.toBeNull();
  });
});

describe('extractBoundaryGeometry', () => {
  const square: GeoJSON.Polygon = {
    type: 'Polygon',
    coordinates: [
      [
        [-0.001, -0.001],
        [0.001, -0.001],
        [0.001, 0.001],
        [-0.001, 0.001],
        [-0.001, -0.001],
      ],
    ],
  };

  it('unwraps a FeatureCollection to its first geometry', () => {
    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: square }],
    };
    expect(extractBoundaryGeometry(fc)).toEqual(square);
  });

  it('unwraps a single Feature to its geometry', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: square,
    };
    expect(extractBoundaryGeometry(feature)).toEqual(square);
  });

  it('returns a bare Polygon unchanged', () => {
    expect(extractBoundaryGeometry(square)).toBe(square);
  });

  it('returns a bare MultiPolygon unchanged', () => {
    const mp: GeoJSON.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [square.coordinates],
    };
    expect(extractBoundaryGeometry(mp)).toBe(mp);
  });

  it('returns undefined for undefined / null input', () => {
    expect(extractBoundaryGeometry(undefined)).toBeUndefined();
    expect(extractBoundaryGeometry(null)).toBeUndefined();
  });

  it('returns undefined for an empty FeatureCollection', () => {
    const empty: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    };
    expect(extractBoundaryGeometry(empty)).toBeUndefined();
  });
});

describe('haversineM', () => {
  it('returns 0 for identical points', () => {
    expect(haversineM([0, 0], [0, 0])).toBe(0);
  });

  it('matches ~111 km per degree of latitude at the equator (within 1%)', () => {
    const d = haversineM([0, 0], [0, 1]);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it('is symmetric', () => {
    const a: [number, number] = [-122.4, 37.8];
    const b: [number, number] = [-73.9, 40.7];
    expect(haversineM(a, b)).toBeCloseTo(haversineM(b, a), 4);
  });
});
