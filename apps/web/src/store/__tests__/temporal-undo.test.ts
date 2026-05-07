// @vitest-environment happy-dom
/**
 * temporal-undo — exercises the zundo `temporal()` middleware that now wraps
 * the seven OBSERVE namespace stores (Phase 5 of plan
 * consult-notebooklm-permaculture-scholar-peppy-fog.md). Each store gains a
 * `temporal` slice exposing `undo`, `redo`, `clear`, `pastStates`, and
 * `futureStates`.
 *
 * Coverage strategy: rather than spec every one of the seven stores, this
 * file tests three representative stores spanning the variety of their
 * action shapes — humanContext (single-collection list), swot (single
 * record list), and soilSample (lab-record list). All seven stores follow
 * the identical `persist(temporal(creator, { limit: 200 }), …)` pattern, so
 * if temporal works for these three it works for all.
 *
 * The vitest environment is `node`, so zustand's localStorage-backed
 * `persist` middleware is a no-op on rehydrate — that's fine; we are not
 * testing persistence here, only the in-memory undo timeline.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useHumanContextStore } from '../humanContextStore.js';
import { useSwotStore } from '../swotStore.js';
import { useSoilSampleStore } from '../soilSampleStore.js';

function clearTemporal(store: { temporal: { getState: () => { clear: () => void } } }): void {
  store.temporal.getState().clear();
}

describe('temporal middleware — humanContextStore', () => {
  beforeEach(() => {
    useHumanContextStore.setState({
      neighbours: [],
      households: [],
      accessRoads: [],
      permacultureZones: [],
    });
    clearTemporal(useHumanContextStore as unknown as {
      temporal: { getState: () => { clear: () => void } };
    });
  });

  it('undoes addNeighbour and redoes it', () => {
    const neighbour = {
      id: 'n-1',
      projectId: 'p-1',
      position: [-78.2, 44.5] as [number, number],
      label: 'Aunt Mariam',
      createdAt: '2026-05-06T00:00:00Z',
    };

    useHumanContextStore.getState().addNeighbour(neighbour);
    expect(useHumanContextStore.getState().neighbours).toHaveLength(1);

    (useHumanContextStore as unknown as {
      temporal: { getState: () => { undo: () => void } };
    }).temporal.getState().undo();
    expect(useHumanContextStore.getState().neighbours).toHaveLength(0);

    (useHumanContextStore as unknown as {
      temporal: { getState: () => { redo: () => void } };
    }).temporal.getState().redo();
    expect(useHumanContextStore.getState().neighbours).toHaveLength(1);
    expect(useHumanContextStore.getState().neighbours[0]?.id).toBe('n-1');
  });

  it('undoes a sequence of adds in LIFO order', () => {
    const a = {
      id: 'a',
      projectId: 'p-1',
      position: [-78.2, 44.5] as [number, number],
      createdAt: '2026-05-06T00:00:00Z',
    };
    const b = { ...a, id: 'b' };
    const c = { ...a, id: 'c' };

    useHumanContextStore.getState().addNeighbour(a);
    useHumanContextStore.getState().addNeighbour(b);
    useHumanContextStore.getState().addNeighbour(c);
    expect(useHumanContextStore.getState().neighbours.map((n) => n.id)).toEqual(['a', 'b', 'c']);

    const temporal = (useHumanContextStore as unknown as {
      temporal: { getState: () => { undo: () => void; redo: () => void } };
    }).temporal.getState();

    temporal.undo();
    expect(useHumanContextStore.getState().neighbours.map((n) => n.id)).toEqual(['a', 'b']);
    temporal.undo();
    expect(useHumanContextStore.getState().neighbours.map((n) => n.id)).toEqual(['a']);
    temporal.redo();
    expect(useHumanContextStore.getState().neighbours.map((n) => n.id)).toEqual(['a', 'b']);
  });
});

describe('temporal middleware — swotStore', () => {
  beforeEach(() => {
    useSwotStore.setState({ swot: [] });
    clearTemporal(useSwotStore as unknown as {
      temporal: { getState: () => { clear: () => void } };
    });
  });

  it('undoes addSwot and updateSwot independently', () => {
    const entry = {
      id: 's-1',
      projectId: 'p-1',
      bucket: 'S' as const,
      title: 'Strong south slope',
      createdAt: '2026-05-06T00:00:00Z',
    };

    useSwotStore.getState().addSwot(entry);
    useSwotStore.getState().updateSwot('s-1', { title: 'South slope, full sun' });
    expect(useSwotStore.getState().swot[0]?.title).toBe('South slope, full sun');

    const temporal = (useSwotStore as unknown as {
      temporal: { getState: () => { undo: () => void; redo: () => void } };
    }).temporal.getState();

    temporal.undo();
    expect(useSwotStore.getState().swot[0]?.title).toBe('Strong south slope');

    temporal.undo();
    expect(useSwotStore.getState().swot).toHaveLength(0);

    temporal.redo();
    expect(useSwotStore.getState().swot[0]?.title).toBe('Strong south slope');
  });
});

describe('temporal middleware — soilSampleStore', () => {
  beforeEach(() => {
    useSoilSampleStore.setState({ samples: [] });
    clearTemporal(useSoilSampleStore as unknown as {
      temporal: { getState: () => { clear: () => void } };
    });
  });

  it('undoes deleteSample, restoring the prior sample list', () => {
    const sample = {
      id: 'soil-1',
      projectId: 'p-1',
      sampleDate: '2026-05-01',
      label: 'North paddock topsoil',
      location: [-78.2, 44.5] as [number, number],
      depth: '0_5cm' as const,
      ph: 6.4,
      organicMatterPct: null,
      texture: null,
      cecMeq100g: null,
      ecDsM: null,
      bulkDensityGCm3: null,
      npkPpm: null,
      biologicalActivity: 'unknown' as const,
      notes: '',
      lab: null,
      createdAt: '2026-05-01T00:00:00Z',
      updatedAt: '2026-05-01T00:00:00Z',
    };

    useSoilSampleStore.getState().addSample(sample);
    useSoilSampleStore.getState().deleteSample('soil-1');
    expect(useSoilSampleStore.getState().samples).toHaveLength(0);

    const temporal = (useSoilSampleStore as unknown as {
      temporal: { getState: () => { undo: () => void } };
    }).temporal.getState();

    temporal.undo();
    expect(useSoilSampleStore.getState().samples).toHaveLength(1);
    expect(useSoilSampleStore.getState().samples[0]?.id).toBe('soil-1');
  });
});
