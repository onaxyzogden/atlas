/**
 * snapDrawPoint — pure-function snap behaviour for live draw sessions.
 *
 * Uses a linear mock projection: lng -> x*100, lat -> y*100 (and the inverse
 * for unproject). So 1 degree = 100 px and the 8 px snap radius spans 0.08 deg.
 * Offsets below 0.08 deg are "in range"; offsets at/above are out of range.
 */

import { describe, it, expect } from 'vitest';
import { snapDrawPoint, type SnapTargets } from '../snapPoint.js';
import { buildSnapTargets } from '../../plan/draw/tools/usePlanSnapTargets.js';

type LngLat = [number, number];

// Minimal map stub: only project/unproject are used by snapDrawPoint.
const mockMap = {
  project: ([lng, lat]: LngLat) => ({ x: lng * 100, y: lat * 100 }),
  unproject: ([x, y]: [number, number]) => ({ lng: x / 100, lat: y / 100 }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('snapDrawPoint', () => {
  it('snaps to a vertex within the radius', () => {
    const targets: SnapTargets = {
      vertices: [[0, 0]],
      lines: [
        [
          [1, 0],
          [1, 1],
        ],
      ],
    };
    // raw 0.05 deg (5 px) from the vertex -> in range.
    const r = snapDrawPoint(mockMap, [0.05, 0], targets);
    expect(r.snappedTo).toBe('vertex');
    expect(r.position).toEqual([0, 0]);
  });

  it('snaps to the nearest point on an edge when no vertex is in range', () => {
    const targets: SnapTargets = {
      vertices: [],
      lines: [
        [
          [0, 0],
          [10, 0],
        ],
      ],
    };
    // raw above the mid-segment, 0.05 deg (5 px) off the line -> in range.
    const r = snapDrawPoint(mockMap, [5, 0.05], targets);
    expect(r.snappedTo).toBe('line');
    expect(r.position[0]).toBeCloseTo(5, 6);
    expect(r.position[1]).toBeCloseTo(0, 6);
  });

  it('returns the raw point when nothing is within the radius', () => {
    const targets: SnapTargets = {
      vertices: [[0, 0]],
      lines: [
        [
          [0, 0],
          [0, 1],
        ],
      ],
    };
    // raw 0.5 deg (50 px) away from every target -> out of range.
    const raw: LngLat = [0.5, 0.5];
    const r = snapDrawPoint(mockMap, raw, targets);
    expect(r.snappedTo).toBeNull();
    expect(r.position).toEqual(raw);
  });

  it('prefers a vertex over an edge at equal proximity', () => {
    // The vertex [0,0] sits on the line's endpoint, so both are equidistant
    // from a click just off it; the vertex must win.
    const targets: SnapTargets = {
      vertices: [[0, 0]],
      lines: [
        [
          [0, 0],
          [0, 1],
        ],
      ],
    };
    const r = snapDrawPoint(mockMap, [0.03, 0], targets);
    expect(r.snappedTo).toBe('vertex');
    expect(r.position).toEqual([0, 0]);
  });

  it('is a no-op when targets carry no lines or vertices', () => {
    const raw: LngLat = [3, 4];
    const r = snapDrawPoint(mockMap, raw, {});
    expect(r.snappedTo).toBeNull();
    expect(r.position).toEqual(raw);
  });
});

/**
 * Point-placement snapping (Phase 3): a dropped point is now run through the
 * same `snapDrawPoint` against targets assembled by `buildSnapTargets` — the
 * shared normalizer behind both `usePlanSnapTargets` and `useObserveSnapTargets`.
 * The `SNAP_DRAW_POINT` MapboxDraw mode is a thin wrapper that feeds the placed
 * coordinate through this exact composition, so exercising assembly → snap here
 * proves the point-mode behaviour without a live draw instance.
 */
describe('point-placement snapping over assembled targets', () => {
  it('snaps a dropped point onto an existing feature anchor (Point vertex)', () => {
    // An existing tree/well/pin contributes one snappable vertex.
    const targets = buildSnapTargets([{ type: 'Point', coordinates: [0, 0] }]);
    // Drop 0.05 deg (5 px) away → within the 8 px radius.
    const r = snapDrawPoint(mockMap, [0.05, 0], targets);
    expect(r.snappedTo).toBe('vertex');
    expect(r.position).toEqual([0, 0]);
  });

  it('snaps a dropped point onto a polygon corner', () => {
    const ring: LngLat[] = [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
      [0, 0],
    ];
    const targets = buildSnapTargets([
      { type: 'Polygon', coordinates: [ring] },
    ]);
    // Drop just inside the [4, 4] corner → corner wins (vertex beats edge).
    const r = snapDrawPoint(mockMap, [3.97, 3.97], targets);
    expect(r.snappedTo).toBe('vertex');
    expect(r.position).toEqual([4, 4]);
  });

  it('leaves a free placement away from every feature exactly where dropped', () => {
    const targets = buildSnapTargets([{ type: 'Point', coordinates: [0, 0] }]);
    const raw: LngLat = [9, 9]; // far outside the 8 px radius
    const r = snapDrawPoint(mockMap, raw, targets);
    expect(r.snappedTo).toBeNull();
    expect(r.position).toEqual(raw);
  });
});
