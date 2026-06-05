// @vitest-environment happy-dom
/**
 * recordAsBuiltDeviation - the Act-stage write (Slice 2).
 *
 * Covers the half of the Act -> Observe -> Plan loop that lives on the Act
 * side: that recording an as-built deviation on a crop area emits ONE divergent
 * Observe data point with the right shape (domain `plants-food`, divergent
 * status, the feature ref, the diff, a centroid anchor) and that it lands in the
 * active set - which is what `usePlanRevisionFlagSync` reads to light the
 * `s6-yield-flows` pill. The objective-overlap half (`plants-food` ->
 * `s6-yield-flows`) is pinned in shared's featureRefDomain.test.ts.
 *
 * Also pins the "one active divergence per feature/area" guarantee: a second
 * record on the same feature/centroid supersedes the first (store proximity
 * supersession), so the steward never sees two stale rows for one feature.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { AsBuiltDiff } from '@ogden/shared';
import { useObserveDataPointStore } from '../../../../store/observeDataPointStore.js';
import {
  recordAsBuiltDeviation,
  polygonCentroid,
} from '../recordAsBuiltDeviation.js';

const PROJECT = 'proj-1';

const DIFF: AsBuiltDiff = {
  kind: 'attribute',
  field: 'name',
  label: 'Name',
  asPlanned: 'North Orchard',
  asBuilt: 'North Block',
};

function reset(): void {
  useObserveDataPointStore.setState({ byProject: {} });
}

describe('recordAsBuiltDeviation', () => {
  beforeEach(reset);

  it('emits one divergent plants-food point carrying the feature ref + diff', () => {
    const pt = recordAsBuiltDeviation({
      projectId: PROJECT,
      kind: 'cropArea',
      featureId: 'crop-1',
      diff: DIFF,
      centroid: [10, 20],
    });

    expect(pt.domainId).toBe('plants-food');
    expect(pt.sourceType).toBe('divergence_evidence');
    expect(pt.statusOutput).toBe('needs_investigation');
    expect(pt.sourceFeatureRef).toEqual({ kind: 'cropArea', id: 'crop-1' });
    expect(pt.measurementValue).toEqual(DIFF);
    expect(pt.locationGeometry).toEqual({ type: 'Point', coordinates: [10, 20] });
    expect(pt.sourceObjectiveId).toBeNull();
  });

  it('lands the point in the active set (what lights the Plan pill)', () => {
    const pt = recordAsBuiltDeviation({
      projectId: PROJECT,
      kind: 'cropArea',
      featureId: 'crop-1',
      diff: DIFF,
      centroid: [10, 20],
    });

    const active = useObserveDataPointStore.getState().getActiveByProject(PROJECT);
    expect(active).toHaveLength(1);
    expect(active[0]!.id).toBe(pt.id);
  });

  it('omits locationGeometry when no centroid is known', () => {
    const pt = recordAsBuiltDeviation({
      projectId: PROJECT,
      kind: 'cropArea',
      featureId: 'crop-2',
      diff: DIFF,
    });
    expect(pt.locationGeometry).toBeNull();
  });

  it('threads through an explicit sourceObjectiveId when given', () => {
    const pt = recordAsBuiltDeviation({
      projectId: PROJECT,
      kind: 'cropArea',
      featureId: 'crop-1',
      diff: DIFF,
      centroid: [10, 20],
      sourceObjectiveId: 's6-yield-flows',
    });
    expect(pt.sourceObjectiveId).toBe('s6-yield-flows');
  });

  it('keeps one active divergence per feature - latest wins via supersession', () => {
    const first = recordAsBuiltDeviation({
      projectId: PROJECT,
      kind: 'cropArea',
      featureId: 'crop-1',
      diff: DIFF,
      centroid: [10, 20],
    });
    const second = recordAsBuiltDeviation({
      projectId: PROJECT,
      kind: 'cropArea',
      featureId: 'crop-1',
      diff: { ...DIFF, asBuilt: 'South Block' },
      centroid: [10, 20],
    });

    const active = useObserveDataPointStore.getState().getActiveByProject(PROJECT);
    const ids = active.map((p) => p.id);
    expect(ids).toContain(second.id);
    expect(ids).not.toContain(first.id);

    // The first point is superseded, not deleted - history is preserved.
    const all = useObserveDataPointStore.getState().getByProject(PROJECT);
    expect(all).toHaveLength(2);
    expect(all.find((p) => p.id === first.id)!.isSuperseded).toBe(true);
  });
});

describe('polygonCentroid', () => {
  it('averages the outer-ring vertices, excluding the closing duplicate', () => {
    const poly: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 2],
          [0, 0],
        ],
      ],
    };
    expect(polygonCentroid(poly)).toEqual([1, 1]);
  });

  it('handles an open ring (no closing duplicate) the same way', () => {
    const poly: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [4, 0],
          [4, 4],
          [0, 4],
        ],
      ],
    };
    expect(polygonCentroid(poly)).toEqual([2, 2]);
  });

  it('returns null for an empty ring', () => {
    expect(
      polygonCentroid({ type: 'Polygon', coordinates: [[]] }),
    ).toBeNull();
  });
});
