/**
 * Unit guard for objectiveMarkerGeometry — the real per-objective marker
 * placement for the Act tier map. Invariants:
 *
 *  - a pin sits at the centroid of an objective's field-action geometries;
 *  - Point / LineString / Polygon all reduce to a representative [lng, lat];
 *  - an objective with no geo-bearing action gets NO entry (hide-until-real),
 *    so the map renders no pin for it — there is no synthetic fallback;
 *  - malformed coordinates are rejected rather than producing NaN positions.
 *
 * The helper only reads `planObjectiveId` + `locationGeometry`, so actions are
 * built as minimal partials cast to FieldAction.
 */

import { describe, expect, it } from 'vitest';
import type { FieldAction } from '@ogden/shared';
import {
  computeObjectiveMarkerPositions,
  representativePoint,
} from '../objectiveMarkerGeometry.js';

type Geom = FieldAction['locationGeometry'];

function action(planObjectiveId: string, locationGeometry: Geom): FieldAction {
  return { planObjectiveId, locationGeometry } as unknown as FieldAction;
}

const point = (lng: number, lat: number): Geom => ({
  type: 'Point',
  coordinates: [lng, lat],
});

describe('representativePoint', () => {
  it('returns the coordinates of a Point', () => {
    expect(representativePoint(point(10, 20))).toEqual([10, 20]);
  });

  it('averages a LineString vertices', () => {
    const geom: Geom = {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [10, 20],
      ],
    };
    expect(representativePoint(geom)).toEqual([5, 10]);
  });

  it('returns the vertex-average centroid of a Polygon', () => {
    // A closed square; polygonCentroid averages the ring including the
    // repeated closing vertex, biasing sub-metre — at unit scale it lands at
    // the obvious centre-ish point.
    const geom: Geom = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0, 10],
          [10, 10],
          [10, 0],
          [0, 0],
        ],
      ],
    };
    const pt = representativePoint(geom);
    expect(pt).not.toBeNull();
    expect(pt![0]).toBeCloseTo(4, 5);
    expect(pt![1]).toBeCloseTo(4, 5);
  });

  it('returns null for absent geometry', () => {
    expect(representativePoint(null)).toBeNull();
  });

  it('rejects malformed coordinates (non-number / short arrays)', () => {
    expect(representativePoint({ type: 'Point', coordinates: ['a', 'b'] })).toBeNull();
    expect(representativePoint({ type: 'Point', coordinates: [1] })).toBeNull();
    expect(representativePoint({ type: 'Point', coordinates: 'nope' })).toBeNull();
  });
});

describe('computeObjectiveMarkerPositions', () => {
  const objectives = [{ id: 'o1' }, { id: 'o2' }, { id: 'o3' }];

  it('averages an objective with multiple Point actions', () => {
    const actions = [
      action('o1', point(0, 0)),
      action('o1', point(10, 20)),
    ];
    const out = computeObjectiveMarkerPositions(objectives, actions);
    expect(out.o1).toEqual([5, 10]);
  });

  it('averages across mixed Point + Polygon geometry', () => {
    const actions = [
      action('o1', point(0, 0)),
      action('o1', {
        type: 'Polygon',
        coordinates: [
          [
            [8, 8],
            [8, 8],
            [8, 8],
          ],
        ],
      }),
    ];
    // polygon centroid = [8, 8]; averaged with [0,0] -> [4, 4]
    const out = computeObjectiveMarkerPositions(objectives, actions);
    expect(out.o1![0]).toBeCloseTo(4, 5);
    expect(out.o1![1]).toBeCloseTo(4, 5);
  });

  it('uses a LineString action centroid', () => {
    const actions = [
      action('o2', {
        type: 'LineString',
        coordinates: [
          [2, 2],
          [4, 6],
        ],
      }),
    ];
    const out = computeObjectiveMarkerPositions(objectives, actions);
    expect(out.o2).toEqual([3, 4]);
  });

  it('omits an objective whose actions all have null geometry (hide-until-real)', () => {
    const actions = [action('o1', null), action('o1', null)];
    const out = computeObjectiveMarkerPositions(objectives, actions);
    expect('o1' in out).toBe(false);
  });

  it('omits an objective with no actions at all', () => {
    const out = computeObjectiveMarkerPositions(objectives, []);
    expect(Object.keys(out)).toHaveLength(0);
  });

  it('emits entries only for objectives with real geometry', () => {
    const actions = [
      action('o1', point(1, 1)),
      action('o2', null),
      // o3 has no actions
    ];
    const out = computeObjectiveMarkerPositions(objectives, actions);
    expect(Object.keys(out)).toEqual(['o1']);
  });
});
