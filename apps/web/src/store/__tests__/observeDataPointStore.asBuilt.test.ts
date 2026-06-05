// @vitest-environment happy-dom
/**
 * observeDataPointStore — as-built deviation substrate (Slice 1).
 *
 * Covers: recording a divergent data point carrying sourceFeatureRef and
 * seeing it in the active selectors; acknowledgeDataPoint flipping it to
 * superseded (so it drops out of active + stops forcing the Plan flag);
 * and the v2->v3 migration backfilling sourceFeatureRef.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useObserveDataPointStore,
  migrateObserveDataPointStore,
} from '../observeDataPointStore.js';
import type { ObserveDataPoint } from '@ogden/shared';

const PROJECT = 'proj-1';

function point(over: Partial<ObserveDataPoint> = {}): ObserveDataPoint {
  return {
    id: 'dp-1',
    projectId: PROJECT,
    domainId: 'plants-food',
    sourceType: 'divergence_evidence',
    sourceActionId: null,
    sourceFeedEntryId: null,
    sourceObjectiveId: null,
    sourceFeatureRef: { kind: 'cropArea', id: 'crop-7' },
    locationGeometry: null,
    cycleId: 0,
    isSuperseded: false,
    supersededBy: null,
    statusOutput: 'needs_investigation',
    measurementValue: {
      kind: 'attribute',
      field: 'name',
      asPlanned: 'North Block',
      asBuilt: 'North Field',
    },
    proofItems: [],
    capturedAt: '2026-05-31T12:00:00.000Z',
    capturedBy: 'act-as-built',
    ...over,
  };
}

function reset(): void {
  useObserveDataPointStore.setState({ byProject: {} });
}

describe('observeDataPointStore as-built', () => {
  beforeEach(reset);

  it('records a divergent feature-scoped point into the active set', () => {
    useObserveDataPointStore.getState().recordDataPoint(point());
    const active = useObserveDataPointStore.getState().getActiveByProject(PROJECT);
    expect(active).toHaveLength(1);
    expect(active[0]!.sourceFeatureRef).toEqual({ kind: 'cropArea', id: 'crop-7' });
    expect(active[0]!.statusOutput).toBe('needs_investigation');
  });

  it('acknowledgeDataPoint flips it to superseded and drops it from active', () => {
    useObserveDataPointStore.getState().recordDataPoint(point());
    useObserveDataPointStore.getState().acknowledgeDataPoint(PROJECT, 'dp-1');

    const active = useObserveDataPointStore.getState().getActiveByProject(PROJECT);
    expect(active).toHaveLength(0);

    const all = useObserveDataPointStore.getState().getByProject(PROJECT);
    expect(all).toHaveLength(1); // preserved, not deleted
    expect(all[0]!.isSuperseded).toBe(true);
  });

  it('acknowledgeDataPoint is a no-op for an unknown id', () => {
    useObserveDataPointStore.getState().recordDataPoint(point());
    useObserveDataPointStore.getState().acknowledgeDataPoint(PROJECT, 'nope');
    expect(
      useObserveDataPointStore.getState().getActiveByProject(PROJECT),
    ).toHaveLength(1);
  });
});

describe('migrateObserveDataPointStore', () => {
  it('v2->v3 backfills sourceFeatureRef to null', () => {
    const v2 = {
      byProject: {
        [PROJECT]: [
          // a pre-v3 row without sourceFeatureRef
          { id: 'old', projectId: PROJECT, domainId: 'soil', sourceObjectiveId: 'o1' },
        ],
      },
    };
    const out = migrateObserveDataPointStore(v2, 2);
    const row = out.byProject[PROJECT]![0] as Record<string, unknown>;
    expect(row.sourceFeatureRef).toBeNull();
    expect(row.sourceObjectiveId).toBe('o1'); // preserved
  });

  it('v1->v3 chain backfills both nullable fields', () => {
    const v1 = {
      byProject: { [PROJECT]: [{ id: 'old', projectId: PROJECT, domainId: 'soil' }] },
    };
    const out = migrateObserveDataPointStore(v1, 1);
    const row = out.byProject[PROJECT]![0] as Record<string, unknown>;
    expect(row.sourceObjectiveId).toBeNull();
    expect(row.sourceFeatureRef).toBeNull();
  });

  it('v3 is idempotent and tolerates empty/undefined blobs', () => {
    expect(migrateObserveDataPointStore(undefined, 1).byProject).toEqual({});
    expect(migrateObserveDataPointStore({}, 3).byProject).toEqual({});
  });
});
