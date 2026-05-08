/**
 * pointInPolygonRing — unit tests for the even-odd ray-cast helper.
 */

import { describe, it, expect } from 'vitest';
import { pointInPolygonRing } from './pointInPolygonRing.js';

// Unit square [0,0]–[1,1].
const SQUARE: number[][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 0],
];

// Concave "L" — bites a unit-square corner out of [0,0]–[2,2].
//
//   2 ┌─────────┐
//     │         │
//   1 │   ┌─────┘
//     │   │
//   0 └───┘
//     0   1     2
const L_SHAPE: number[][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [2, 1],
  [2, 2],
  [0, 2],
  [0, 0],
];

describe('pointInPolygonRing', () => {
  it('point clearly inside the square returns true', () => {
    expect(pointInPolygonRing(0.5, 0.5, SQUARE)).toBe(true);
  });

  it('point clearly outside the square returns false', () => {
    expect(pointInPolygonRing(2, 2, SQUARE)).toBe(false);
    expect(pointInPolygonRing(-1, 0.5, SQUARE)).toBe(false);
  });

  it('handles the concave notch correctly (point in the bite is outside)', () => {
    // (1.5, 0.5) is in the bbox but in the notch — must be outside.
    expect(pointInPolygonRing(1.5, 0.5, L_SHAPE)).toBe(false);
    // (0.5, 0.5) is in the bottom-left arm — inside.
    expect(pointInPolygonRing(0.5, 0.5, L_SHAPE)).toBe(true);
    // (1.5, 1.5) is in the top arm — inside.
    expect(pointInPolygonRing(1.5, 1.5, L_SHAPE)).toBe(true);
  });

  it('returns false for degenerate rings (< 3 vertices)', () => {
    expect(pointInPolygonRing(0, 0, [])).toBe(false);
    expect(pointInPolygonRing(0, 0, [[0, 0]])).toBe(false);
    expect(pointInPolygonRing(0, 0, [[0, 0], [1, 1]])).toBe(false);
  });

  it('handles unclosed rings (last != first vertex) the same as closed ones', () => {
    const closed = SQUARE;
    const unclosed = SQUARE.slice(0, -1);
    expect(pointInPolygonRing(0.3, 0.7, closed)).toBe(
      pointInPolygonRing(0.3, 0.7, unclosed),
    );
    expect(pointInPolygonRing(2, 2, closed)).toBe(
      pointInPolygonRing(2, 2, unclosed),
    );
  });

  it('vertex / edge resolution is consistent (no NaN, no exception)', () => {
    // We don't pin which side a boundary point lands on — just that the
    // result is a boolean, not NaN or undefined.
    const onVertex = pointInPolygonRing(0, 0, SQUARE);
    const onEdge = pointInPolygonRing(0.5, 0, SQUARE);
    expect(typeof onVertex).toBe('boolean');
    expect(typeof onEdge).toBe('boolean');
  });

  it('works on a real-parcel-shaped ring at typical lat/lng magnitudes', () => {
    // ~1ha parcel around (44.55, -123.27) — Corvallis, OR.
    const parcel: number[][] = [
      [-123.272, 44.549],
      [-123.270, 44.549],
      [-123.270, 44.551],
      [-123.272, 44.551],
      [-123.272, 44.549],
    ];
    expect(pointInPolygonRing(-123.271, 44.550, parcel)).toBe(true);
    expect(pointInPolygonRing(-123.275, 44.550, parcel)).toBe(false);
  });
});
