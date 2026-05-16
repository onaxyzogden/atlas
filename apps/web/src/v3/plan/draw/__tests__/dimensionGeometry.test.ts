import { describe, it, expect } from 'vitest';
import * as turf from '@turf/turf';
import { rectangleAt, circleAt, lineFrom } from '../dimensionGeometry.js';

const CENTER: [number, number] = [-122.0, 47.0];

describe('rectangleAt', () => {
  it('produces a closed 5-vertex polygon with area ≈ width × depth', () => {
    const poly = rectangleAt(CENTER, 10, 20, 0);
    expect(poly.type).toBe('Polygon');
    const ring = poly.coordinates[0]!;
    expect(ring.length).toBe(5);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    const area = turf.area(turf.feature(poly));
    expect(area).toBeGreaterThan(180);
    expect(area).toBeLessThan(220);
  });
});

describe('circleAt', () => {
  it('produces a closed polygon with area ≈ π r²', () => {
    const poly = circleAt(CENTER, 10, 64);
    expect(poly.type).toBe('Polygon');
    const area = turf.area(turf.feature(poly));
    const expected = Math.PI * 10 * 10;
    expect(area).toBeGreaterThan(expected * 0.97);
    expect(area).toBeLessThan(expected * 1.03);
  });
});

describe('lineFrom', () => {
  it('produces a 2-vertex line of given length and bearing', () => {
    const line = lineFrom(CENTER, 100, 90);
    expect(line.type).toBe('LineString');
    expect(line.coordinates.length).toBe(2);
    const lengthM = turf.length(turf.feature(line), { units: 'kilometers' }) * 1000;
    expect(lengthM).toBeGreaterThan(99);
    expect(lengthM).toBeLessThan(101);
    // bearing 90° (east) → end longitude > start longitude, latitude ≈ same
    const start = line.coordinates[0]!;
    const end = line.coordinates[1]!;
    expect(end[0]!).toBeGreaterThan(start[0]!);
    expect(Math.abs(end[1]! - start[1]!)).toBeLessThan(1e-3);
  });
});
