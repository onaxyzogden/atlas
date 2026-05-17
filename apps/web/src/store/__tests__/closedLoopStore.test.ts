// @vitest-environment happy-dom
/**
 * closedLoopStore — #58/#59 unification migration tests.
 *
 * Covers:
 *   1. Same-key v1→v2: persisted `wasteVectors` → `materialFlows`
 *      (list origin, structured endpoints, legacy enum mapped).
 *   2. Foreign-key fold: the dead `ogden-flow-connectors` blob is folded
 *      into `materialFlows` (canvas origin, geometry kept), then deleted.
 *   3. Idempotent re-rehydrate (dead key gone → no double-fold).
 *   4. Undo timeline cleared after the fold.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useClosedLoopStore } from '../closedLoopStore.js';

const CLOSED_LOOP_KEY = 'ogden-closed-loop';
const FLOW_CONNECTOR_KEY = 'ogden-flow-connectors';

function reset(): void {
  useClosedLoopStore.setState({
    materialFlows: [],
    wasteVectorRuns: [],
    fertilityInfra: [],
  });
  (
    useClosedLoopStore as unknown as {
      temporal: { getState: () => { clear: () => void } };
    }
  ).temporal.getState().clear();
  window.localStorage.clear();
}

const v1Blob = {
  state: {
    wasteVectors: [
      {
        id: 'wv-1',
        projectId: 'p-1',
        fromFeatureId: 'k',
        toFeatureId: 'c',
        label: 'kitchen→chickens',
        resourceType: 'organic_matter',
        createdAt: '2026-01-01',
      },
    ],
    wasteVectorRuns: [{ id: 'r-1', projectId: 'p-1', vectorId: 'wv-1', runDate: '2026-02-01' }],
    fertilityInfra: [
      { id: 'fi-1', projectId: 'p-1', type: 'composter', center: [-75, 45], createdAt: '2026-01-01' },
    ],
  },
  version: 1,
};

const connectorBlob = {
  state: {
    connectors: [
      {
        id: 'fc-1',
        projectId: 'p-1',
        name: 'orchard mulch run',
        flowKind: 'mulch',
        geometry: { type: 'LineString', coordinates: [[-75, 45], [-75.1, 45.1]] },
        color: '#7aae3c',
        fromName: 'chip pile',
        toName: 'orchard',
        notes: '',
        createdAt: '2026-01-02',
        updatedAt: '2026-01-02',
      },
    ],
  },
  version: 1,
};

describe('closedLoopStore migration', () => {
  beforeEach(() => reset());

  it('same-key v1→v2: wasteVectors → materialFlows (list origin)', async () => {
    window.localStorage.setItem(CLOSED_LOOP_KEY, JSON.stringify(v1Blob));
    await useClosedLoopStore.persist.rehydrate();

    const { materialFlows, wasteVectorRuns, fertilityInfra } = useClosedLoopStore.getState();
    expect(materialFlows).toHaveLength(1);
    const f = materialFlows[0]!;
    expect(f.id).toBe('wv-1');
    expect(f.origin).toBe('list');
    expect(f.sourceId).toBe('k');
    expect(f.sinkId).toBe('c');
    expect(f.materialKind).toBe('organic_matter');
    expect(f.geometry).toBeUndefined();
    expect(wasteVectorRuns).toHaveLength(1);
    expect(fertilityInfra).toHaveLength(1);
  });

  it('foreign-key fold: ogden-flow-connectors folded then deleted', async () => {
    window.localStorage.setItem(CLOSED_LOOP_KEY, JSON.stringify(v1Blob));
    window.localStorage.setItem(FLOW_CONNECTOR_KEY, JSON.stringify(connectorBlob));
    await useClosedLoopStore.persist.rehydrate();

    const { materialFlows } = useClosedLoopStore.getState();
    expect(materialFlows).toHaveLength(2);
    const canvas = materialFlows.find((m) => m.id === 'fc-1')!;
    expect(canvas.origin).toBe('canvas');
    expect(canvas.geometry?.type).toBe('LineString');
    expect(canvas.sourceId).toBeNull();
    expect(canvas.sinkId).toBeNull();
    expect(canvas.sourceLabel).toBe('chip pile');
    expect(canvas.sinkLabel).toBe('orchard');
    expect(canvas.materialKind).toBe('mulch');
    expect(window.localStorage.getItem(FLOW_CONNECTOR_KEY)).toBeNull();
  });

  it('idempotent: a second rehydrate does not double-fold', async () => {
    window.localStorage.setItem(CLOSED_LOOP_KEY, JSON.stringify(v1Blob));
    window.localStorage.setItem(FLOW_CONNECTOR_KEY, JSON.stringify(connectorBlob));
    await useClosedLoopStore.persist.rehydrate();
    await useClosedLoopStore.persist.rehydrate();

    expect(useClosedLoopStore.getState().materialFlows).toHaveLength(2);
    expect(window.localStorage.getItem(FLOW_CONNECTOR_KEY)).toBeNull();
  });

  it('clears the undo timeline after folding the dead key', async () => {
    window.localStorage.setItem(CLOSED_LOOP_KEY, JSON.stringify(v1Blob));
    window.localStorage.setItem(FLOW_CONNECTOR_KEY, JSON.stringify(connectorBlob));
    await useClosedLoopStore.persist.rehydrate();

    const pastStates = (
      useClosedLoopStore as unknown as {
        temporal: { getState: () => { pastStates: unknown[] } };
      }
    ).temporal.getState().pastStates;
    expect(pastStates).toHaveLength(0);
  });
});
