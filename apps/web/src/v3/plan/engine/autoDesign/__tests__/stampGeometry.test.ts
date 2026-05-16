import { describe, expect, it } from 'vitest';
import * as turf from '@turf/turf';
import { stampGeometry } from '../stampGeometry.js';
import { squarePoly } from './fixtures.js';
import type { TerrainView } from '../types.js';

const ZONE = squarePoly(0, 0, 0.02);
const AREA = turf.area(turf.feature(ZONE));

describe('stampGeometry dispatch', () => {
  it('tile-strip → polygons', () => {
    const out = stampGeometry('tile-strip', ZONE, AREA);
    expect(out.length).toBeGreaterThan(1);
    expect(out[0]!.type).toBe('Polygon');
  });

  it('centroid-point → single point', () => {
    const out = stampGeometry('centroid-point', ZONE, AREA);
    expect(out).toHaveLength(1);
    expect(out[0]!.type).toBe('Point');
  });

  it('bbox-rect → polygon', () => {
    const out = stampGeometry('bbox-rect', ZONE, AREA * 0.3);
    expect(out[0]!.type).toBe('Polygon');
  });

  it('edge-line → linestring', () => {
    const out = stampGeometry('edge-line', ZONE, AREA);
    expect(out[0]!.type).toBe('LineString');
  });

  it('contour-line → [] without terrain', () => {
    expect(stampGeometry('contour-line', ZONE, AREA)).toEqual([]);
  });

  it('fill-polygon → whole zone when no low points', () => {
    const out = stampGeometry('fill-polygon', ZONE, AREA);
    expect(out[0]!.type).toBe('Polygon');
    expect(turf.area(turf.feature(out[0]! as GeoJSON.Polygon))).toBeCloseTo(
      AREA,
      -1,
    );
  });

  it('fill-polygon → basin when terrain has a low point', () => {
    const terrain: TerrainView = {
      contours: [],
      points: [{ id: 'lo', position: [0.01, 0.01], kind: 'low' }],
    };
    const out = stampGeometry('fill-polygon', ZONE, AREA * 0.05, terrain);
    expect(out[0]!.type).toBe('Polygon');
    expect(
      turf.area(turf.feature(out[0]! as GeoJSON.Polygon)),
    ).toBeLessThan(AREA);
  });
});
