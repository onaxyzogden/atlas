/**
 * Polygonal-geometry extraction — FeatureCollection/Feature/Geometry → a
 * single Polygon|MultiPolygon for PostGIS, or null (never a confident 0).
 */

import { describe, it, expect } from 'vitest';
import { extractPolygonalGeometry } from '../lib/geojsonGeometry.js';
import { ParcelBoundaryGeojson } from '../schemas/project.schema.js';

const ring = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
  [0, 0],
];
const ring2 = [
  [2, 2],
  [2, 3],
  [3, 3],
  [3, 2],
  [2, 2],
];
const polygon = { type: 'Polygon', coordinates: [ring] };

describe('extractPolygonalGeometry', () => {
  it('unwraps a single-feature FeatureCollection to its Polygon', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: polygon }],
    };
    expect(extractPolygonalGeometry(fc)).toEqual(polygon);
  });

  it('merges a multi-feature FeatureCollection into a MultiPolygon', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] } },
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring2] } },
      ],
    };
    expect(extractPolygonalGeometry(fc)).toEqual({
      type: 'MultiPolygon',
      coordinates: [[ring], [ring2]],
    });
  });

  it('passes a bare Polygon geometry through', () => {
    expect(extractPolygonalGeometry(polygon)).toEqual(polygon);
  });

  it('unwraps a bare Feature', () => {
    expect(
      extractPolygonalGeometry({ type: 'Feature', geometry: polygon }),
    ).toEqual(polygon);
  });

  it('flattens an existing MultiPolygon through a FeatureCollection', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'MultiPolygon', coordinates: [[ring], [ring2]] },
        },
      ],
    };
    expect(extractPolygonalGeometry(fc)).toEqual({
      type: 'MultiPolygon',
      coordinates: [[ring], [ring2]],
    });
  });

  it('returns null for junk / empty / non-polygonal input', () => {
    expect(extractPolygonalGeometry(null)).toBeNull();
    expect(extractPolygonalGeometry({})).toBeNull();
    expect(extractPolygonalGeometry('nope')).toBeNull();
    expect(
      extractPolygonalGeometry({ type: 'FeatureCollection', features: [] }),
    ).toBeNull();
    expect(
      extractPolygonalGeometry({ type: 'Point', coordinates: [0, 0] }),
    ).toBeNull();
  });
});

describe('ParcelBoundaryGeojson schema', () => {
  it('accepts the real web-client FeatureCollection shape', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: polygon }],
    };
    expect(ParcelBoundaryGeojson.safeParse(fc).success).toBe(true);
  });

  it('accepts bare Polygon and MultiPolygon geometries', () => {
    expect(ParcelBoundaryGeojson.safeParse(polygon).success).toBe(true);
    expect(
      ParcelBoundaryGeojson.safeParse({
        type: 'MultiPolygon',
        coordinates: [[ring]],
      }).success,
    ).toBe(true);
  });

  it('rejects malformed / non-GeoJSON bodies', () => {
    expect(ParcelBoundaryGeojson.safeParse({ foo: 'bar' }).success).toBe(false);
    expect(
      ParcelBoundaryGeojson.safeParse({ type: 'Point', coordinates: [0, 0] })
        .success,
    ).toBe(false);
    expect(ParcelBoundaryGeojson.safeParse('not json').success).toBe(false);
  });
});
