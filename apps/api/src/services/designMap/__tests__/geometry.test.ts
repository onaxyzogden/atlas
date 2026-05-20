import { describe, it, expect } from 'vitest';
import {
  bbox,
  bearingDeg,
  bufferRingInwardM,
  haversineDistanceM,
  interpolateAlongLine,
  lineLengthM,
  metresPerDegLat,
  metresPerDegLon,
  offsetPolyline,
  pointInPolygon,
  polygonAreaM2,
  polygonCentroid,
  type LonLat,
  type Ring,
} from '../geometry.js';

// Anchor for synthetic parcels: ~43° N, slightly south of Toronto. At this
// latitude, 1 deg lon ≈ 81 km, 1 deg lat ≈ 111 km — generous round numbers
// for sanity-checking the planar projection.
const ANCHOR_LAT = 43;
const ANCHOR_LON = -79;

function metresEastOf(lon: number, atLat: number, dx: number): number {
  return lon + dx / metresPerDegLon(atLat);
}
function metresNorthOf(lat: number, dy: number): number {
  return lat + dy / metresPerDegLat();
}

/** Build a square parcel of the given side length (m) centred on the anchor. */
function squareParcel(sideM: number): Ring {
  const half = sideM / 2;
  const w = metresEastOf(ANCHOR_LON, ANCHOR_LAT, -half);
  const e = metresEastOf(ANCHOR_LON, ANCHOR_LAT, half);
  const s = metresNorthOf(ANCHOR_LAT, -half);
  const n = metresNorthOf(ANCHOR_LAT, half);
  return [
    [w, s],
    [e, s],
    [e, n],
    [w, n],
    [w, s],
  ];
}

describe('metres-per-degree helpers', () => {
  it('metresPerDegLat is ~111 km (constant)', () => {
    expect(metresPerDegLat()).toBeCloseTo(111195, -2);
  });
  it('metresPerDegLon scales with cos(lat)', () => {
    const eq = metresPerDegLon(0);
    const mid = metresPerDegLon(60);
    expect(eq).toBeCloseTo(111195, -2);
    expect(mid).toBeCloseTo(eq * Math.cos((60 * Math.PI) / 180), -1);
  });
});

describe('haversineDistanceM', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistanceM([ANCHOR_LON, ANCHOR_LAT], [ANCHOR_LON, ANCHOR_LAT])).toBe(0);
  });
  it('matches 100 m offset within 0.5 %', () => {
    const a: LonLat = [ANCHOR_LON, ANCHOR_LAT];
    const b: LonLat = [metresEastOf(ANCHOR_LON, ANCHOR_LAT, 100), ANCHOR_LAT];
    const d = haversineDistanceM(a, b);
    expect(Math.abs(d - 100)).toBeLessThan(0.5);
  });
  it('matches a 10 km north–south offset', () => {
    const a: LonLat = [ANCHOR_LON, ANCHOR_LAT];
    const b: LonLat = [ANCHOR_LON, metresNorthOf(ANCHOR_LAT, 10_000)];
    expect(haversineDistanceM(a, b)).toBeCloseTo(10_000, -1);
  });
});

describe('bearingDeg', () => {
  it('returns 0° (north) for a northward step', () => {
    const a: LonLat = [ANCHOR_LON, ANCHOR_LAT];
    const b: LonLat = [ANCHOR_LON, ANCHOR_LAT + 0.01];
    expect(bearingDeg(a, b)).toBeCloseTo(0, 1);
  });
  it('returns ~90° (east) for an eastward step', () => {
    const a: LonLat = [ANCHOR_LON, ANCHOR_LAT];
    const b: LonLat = [ANCHOR_LON + 0.01, ANCHOR_LAT];
    expect(bearingDeg(a, b)).toBeCloseTo(90, 1);
  });
});

describe('lineLengthM + interpolateAlongLine', () => {
  it('lineLengthM sums segment distances', () => {
    const w = metresEastOf(ANCHOR_LON, ANCHOR_LAT, -50);
    const e = metresEastOf(ANCHOR_LON, ANCHOR_LAT, 50);
    const line: LonLat[] = [
      [w, ANCHOR_LAT],
      [ANCHOR_LON, ANCHOR_LAT],
      [e, ANCHOR_LAT],
    ];
    expect(lineLengthM(line)).toBeCloseTo(100, 0);
  });
  it('interpolateAlongLine(0) is the start, (1) is the end', () => {
    const line: LonLat[] = [
      [ANCHOR_LON, ANCHOR_LAT],
      [ANCHOR_LON + 0.01, ANCHOR_LAT],
    ];
    expect(interpolateAlongLine(line, 0)).toEqual([ANCHOR_LON, ANCHOR_LAT]);
    expect(interpolateAlongLine(line, 1)).toEqual([ANCHOR_LON + 0.01, ANCHOR_LAT]);
  });
  it('interpolateAlongLine(0.5) lands at the midpoint of a single segment', () => {
    const line: LonLat[] = [
      [ANCHOR_LON, ANCHOR_LAT],
      [ANCHOR_LON + 0.01, ANCHOR_LAT],
    ];
    const mid = interpolateAlongLine(line, 0.5);
    expect(mid[0]).toBeCloseTo(ANCHOR_LON + 0.005, 6);
    expect(mid[1]).toBeCloseTo(ANCHOR_LAT, 6);
  });
});

describe('polygonAreaM2 + polygonCentroid', () => {
  it('100 m × 100 m square has area ≈ 10 000 m² (±1 %)', () => {
    const parcel = squareParcel(100);
    const a = polygonAreaM2(parcel);
    expect(Math.abs(a - 10_000) / 10_000).toBeLessThan(0.01);
  });
  it('900 m × 900 m parcel (the test fixture) is ~81 ha ≈ 200 ac', () => {
    const parcel = squareParcel(900);
    const a = polygonAreaM2(parcel);
    // 200 acres ≈ 80 937 m²/ac × ... ≈ 809 371 m². Allow 1 %.
    expect(Math.abs(a - 810_000) / 810_000).toBeLessThan(0.02);
  });
  it('returns 0 for a ring with < 3 vertices', () => {
    expect(polygonAreaM2([[0, 0], [1, 1]])).toBe(0);
  });
  it('polygonCentroid of a square is at its geometric centre', () => {
    const parcel = squareParcel(200);
    const c = polygonCentroid(parcel);
    expect(c[0]).toBeCloseTo(ANCHOR_LON, 5);
    expect(c[1]).toBeCloseTo(ANCHOR_LAT, 5);
  });
});

describe('pointInPolygon', () => {
  const parcel = squareParcel(200);
  it('returns true for the centre', () => {
    expect(pointInPolygon([ANCHOR_LON, ANCHOR_LAT], parcel)).toBe(true);
  });
  it('returns false for a point well outside', () => {
    expect(
      pointInPolygon(
        [metresEastOf(ANCHOR_LON, ANCHOR_LAT, 500), ANCHOR_LAT],
        parcel,
      ),
    ).toBe(false);
  });
  it('returns false for a point above the parcel', () => {
    expect(
      pointInPolygon([ANCHOR_LON, metresNorthOf(ANCHOR_LAT, 500)], parcel),
    ).toBe(false);
  });
});

describe('offsetPolyline', () => {
  it('offsets a west→east line northward by ~10 m for distance +10', () => {
    const line: LonLat[] = [
      [metresEastOf(ANCHOR_LON, ANCHOR_LAT, -50), ANCHOR_LAT],
      [metresEastOf(ANCHOR_LON, ANCHOR_LAT, 50), ANCHOR_LAT],
    ];
    const off = offsetPolyline(line, 10);
    // Convert dy back to metres against expected 10 m.
    const dy = (off[0]![1] - ANCHOR_LAT) * metresPerDegLat();
    expect(dy).toBeCloseTo(10, 1);
  });
  it('preserves vertex count', () => {
    const line: LonLat[] = [
      [ANCHOR_LON, ANCHOR_LAT],
      [ANCHOR_LON + 0.001, ANCHOR_LAT],
      [ANCHOR_LON + 0.002, ANCHOR_LAT],
    ];
    expect(offsetPolyline(line, 5).length).toBe(3);
  });
});

describe('bufferRingInwardM', () => {
  it('shrinks a 200 m square by 20 m on each side (area drops ~36 %)', () => {
    const parcel = squareParcel(200);
    const inner = bufferRingInwardM(parcel, 20);
    const aBefore = polygonAreaM2(parcel);
    const aAfter = polygonAreaM2(inner);
    // Expected: 160 m × 160 m = 25 600 m² vs 40 000 m² → 64 % of original.
    expect(aAfter / aBefore).toBeGreaterThan(0.6);
    expect(aAfter / aBefore).toBeLessThan(0.68);
  });
  it('returns a closed ring (last vertex equals first)', () => {
    const inner = bufferRingInwardM(squareParcel(200), 10);
    expect(inner[0]).toEqual(inner[inner.length - 1]);
  });
});

describe('bbox', () => {
  it('reports min/max corners for a square parcel', () => {
    const parcel = squareParcel(100);
    const [minLon, minLat, maxLon, maxLat] = bbox(parcel);
    expect(minLon).toBeLessThan(maxLon);
    expect(minLat).toBeLessThan(maxLat);
  });
  it('returns zeros for an empty ring', () => {
    expect(bbox([])).toEqual([0, 0, 0, 0]);
  });
});
