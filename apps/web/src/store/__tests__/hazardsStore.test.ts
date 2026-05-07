// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { makeHazardId, useHazardsStore, type Hazard } from '../hazardsStore.js';

function reset() {
  useHazardsStore.setState({ byProject: [] });
}

function sampleHazard(overrides: Partial<Hazard> = {}): Hazard {
  return {
    id: makeHazardId(),
    kind: 'frost',
    label: 'Late frost',
    risk: 'moderate',
    trend: 'flat',
    status: 'monitoring',
    mitigationPct: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('hazardsStore', () => {
  beforeEach(() => reset());

  it('ensureDefaults seeds an empty per-project bucket', () => {
    useHazardsStore.getState().ensureDefaults('p1');
    expect(useHazardsStore.getState().getHazards('p1')).toEqual([]);
  });

  it('addHazard stores hazards isolated per project', () => {
    const a = sampleHazard({ id: 'a' });
    const b = sampleHazard({ id: 'b', kind: 'flood' });
    useHazardsStore.getState().addHazard('p1', a);
    useHazardsStore.getState().addHazard('p2', b);
    expect(useHazardsStore.getState().getHazards('p1').map((h) => h.id)).toEqual(['a']);
    expect(useHazardsStore.getState().getHazards('p2').map((h) => h.id)).toEqual(['b']);
  });

  it('updateHazard patches and bumps updatedAt', async () => {
    const h = sampleHazard({ id: 'a', mitigationPct: 0, updatedAt: 1 });
    useHazardsStore.getState().addHazard('p1', h);
    useHazardsStore.getState().updateHazard('p1', 'a', { mitigationPct: 50 });
    const updated = useHazardsStore.getState().getHazards('p1')[0];
    expect(updated?.mitigationPct).toBe(50);
    expect(updated?.updatedAt).toBeGreaterThanOrEqual(h.updatedAt);
  });

  it('removeHazard deletes by id', () => {
    useHazardsStore.getState().addHazard('p1', sampleHazard({ id: 'a' }));
    useHazardsStore.getState().addHazard('p1', sampleHazard({ id: 'b' }));
    useHazardsStore.getState().removeHazard('p1', 'a');
    expect(useHazardsStore.getState().getHazards('p1').map((h) => h.id)).toEqual(['b']);
  });

  it('makeHazardId returns unique strings', () => {
    const ids = new Set([makeHazardId(), makeHazardId(), makeHazardId()]);
    expect(ids.size).toBe(3);
  });
});
