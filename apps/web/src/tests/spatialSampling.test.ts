/**
 * spatialSampling — distance-to-nearest and point-in-polygon helpers
 * for vector layer payloads (hydrology lines, wetland polygons, etc.).
 */

import { describe, it, expect } from 'vitest';
import type { FeatureCollection } from 'geojson';
import { distanceToNearest, isInside } from '../lib/spatialSampling.js';

// All fixtures live near (lng=-79.7, lat=43.5) — Halton Hills, Ontario.
// 1° latitude ≈ 111 km; 0.001° ≈ 111 m at the equator (~80 m at 43°N for lng).

describe('distanceToNearest', () => {
  it('returns Infinity for empty collections', () => {
    const fc: FeatureCollection = { type: 'FeatureCollection', features: [] };
    expect(distanceToNearest([-79.7, 43.5], fc)).toBe(Infinity);
  });

  it('measures distance to a LineString stream within ~1 m of expected', () => {
    // North–south stream at lng=-79.7, lat from 43.49 to 43.51.
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[-79.7, 43.49], [-79.7, 43.51]] },
        properties: {},
      }],
    };
    // Point 0.001° east of the line at y=43.50. Expected: 0.001° lng at 43.5°N
    // ≈ 0.001 * 111000 * cos(43.5°) ≈ 80.5 m.
    const d = distanceToNearest([-79.699, 43.5], fc);
    expect(d).toBeGreaterThan(75);
    expect(d).toBeLessThan(86);
  });

  it('picks the closer of two streams', () => {
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[-79.7, 43.49], [-79.7, 43.51]] },
          properties: { name: 'far' },
        },
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[-79.6995, 43.49], [-79.6995, 43.51]] },
          properties: { name: 'near' },
        },
      ],
    };
    // Probe is exactly on the second line.
    const d = distanceToNearest([-79.6995, 43.5], fc);
    expect(d).toBeLessThan(1);
  });

  it('handles MultiLineString features', () => {
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            [[-79.7, 43.49], [-79.7, 43.495]],
            [[-79.7, 43.505], [-79.7, 43.51]],
          ],
        },
        properties: {},
      }],
    };
    // Probe sits between the two segments at y=43.5; nearest endpoint at y=43.495
    // is 0.005° lat ≈ 555 m away.
    const d = distanceToNearest([-79.7, 43.5], fc);
    expect(d).toBeGreaterThan(540);
    expect(d).toBeLessThan(575);
  });

  it('measures distance to polygon boundary, not interior', () => {
    // Square wetland polygon ~220 m on a side.
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-79.701, 43.499], [-79.699, 43.499],
            [-79.699, 43.501], [-79.701, 43.501],
            [-79.701, 43.499],
          ]],
        },
        properties: {},
      }],
    };
    // Point inside the polygon — distance to *boundary* should still be > 0.
    const d = distanceToNearest([-79.7, 43.5], fc);
    expect(d).toBeGreaterThan(50);
    expect(d).toBeLessThan(120);
  });
});

describe('isInside', () => {
  const wetland: FeatureCollection = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-79.701, 43.499], [-79.699, 43.499],
          [-79.699, 43.501], [-79.701, 43.501],
          [-79.701, 43.499],
        ]],
      },
      properties: { type: 'palustrine' },
    }],
  };

  it('returns true for a point inside the polygon', () => {
    expect(isInside([-79.7, 43.5], wetland)).toBe(true);
  });

  it('returns false for a point outside the polygon', () => {
    expect(isInside([-79.695, 43.5], wetland)).toBe(false);
  });

  it('returns false when the collection has no polygon features', () => {
    const linesOnly: FeatureCollection = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[-79.7, 43.49], [-79.7, 43.51]] },
        properties: {},
      }],
    };
    expect(isInside([-79.7, 43.5], linesOnly)).toBe(false);
  });

  it('returns false for empty collections', () => {
    const fc: FeatureCollection = { type: 'FeatureCollection', features: [] };
    expect(isInside([-79.7, 43.5], fc)).toBe(false);
  });
});
