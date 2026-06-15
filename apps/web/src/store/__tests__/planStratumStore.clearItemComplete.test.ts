// @vitest-environment happy-dom
/**
 * planStratumStore - clearItemComplete (un-record) tests.
 *
 * Covers the remove-only inverse of `setItemComplete`, used by the defer
 * ("Not ready") path so marking a recorded decision Not ready undoes its
 * completed appearance + progress credit:
 *   - removes the id from the right (project, objective)
 *   - idempotent no-op when the item / objective / project is absent
 *   - isolates other items, objectives, and projects
 *   - leaves the parallel valuesByProject slice untouched
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { usePlanStratumProgressStore } from '../planStratumStore.js';

function reset(): void {
  usePlanStratumProgressStore.setState({
    byProject: {},
    celebratedByProject: {},
    deferredByProject: {},
    valuesByProject: {},
  });
  window.localStorage.clear();
}

describe('planStratumStore - clearItemComplete', () => {
  beforeEach(() => reset());

  it('removes a recorded item from its objective', () => {
    const s = usePlanStratumProgressStore.getState();
    s.setItemComplete('proj-A', 's1-vision', 's1-vision-c1');
    s.setItemComplete('proj-A', 's1-vision', 's1-vision-c2');
    s.clearItemComplete('proj-A', 's1-vision', 's1-vision-c1');
    expect(
      usePlanStratumProgressStore
        .getState()
        .getCompletedItemIds('proj-A', 's1-vision'),
    ).toEqual(['s1-vision-c2']);
  });

  it('is a no-op when the item was never recorded', () => {
    const s = usePlanStratumProgressStore.getState();
    s.setItemComplete('proj-A', 's1-vision', 's1-vision-c1');
    const before = usePlanStratumProgressStore.getState();
    s.clearItemComplete('proj-A', 's1-vision', 'never-recorded');
    const after = usePlanStratumProgressStore.getState();
    // identical reference: set((s) => s) bails out with no change
    expect(after.byProject).toBe(before.byProject);
    expect(after.getCompletedItemIds('proj-A', 's1-vision')).toEqual([
      's1-vision-c1',
    ]);
  });

  it('is a no-op for an unknown objective or project', () => {
    const s = usePlanStratumProgressStore.getState();
    s.setItemComplete('proj-A', 's1-vision', 's1-vision-c1');
    s.clearItemComplete('proj-A', 's9-unknown', 's1-vision-c1');
    s.clearItemComplete('proj-Z', 's1-vision', 's1-vision-c1');
    expect(
      usePlanStratumProgressStore
        .getState()
        .getCompletedItemIds('proj-A', 's1-vision'),
    ).toEqual(['s1-vision-c1']);
  });

  it('isolates other objectives and projects', () => {
    const s = usePlanStratumProgressStore.getState();
    s.setItemComplete('proj-A', 's1-vision', 's1-vision-c1');
    s.setItemComplete('proj-A', 's2-land-baseline', 's2-land-baseline-c1');
    s.setItemComplete('proj-B', 's1-vision', 's1-vision-c1');
    s.clearItemComplete('proj-A', 's1-vision', 's1-vision-c1');
    const live = usePlanStratumProgressStore.getState();
    expect(live.getCompletedItemIds('proj-A', 's1-vision')).toEqual([]);
    expect(live.getCompletedItemIds('proj-A', 's2-land-baseline')).toEqual([
      's2-land-baseline-c1',
    ]);
    expect(live.getCompletedItemIds('proj-B', 's1-vision')).toEqual([
      's1-vision-c1',
    ]);
  });

  it('does not touch the parameter-value slice (valuesByProject)', () => {
    const s = usePlanStratumProgressStore.getState();
    s.setItemComplete('proj-A', 's6-yield-flows', 's6-yield-flows-c1');
    s.setParameterValue('proj-A', 's6-yield-flows', 'param-cover', '1500');
    s.clearItemComplete('proj-A', 's6-yield-flows', 's6-yield-flows-c1');
    const live = usePlanStratumProgressStore.getState();
    expect(live.getCompletedItemIds('proj-A', 's6-yield-flows')).toEqual([]);
    expect(live.getParameterValues('proj-A', 's6-yield-flows')).toEqual({
      'param-cover': '1500',
    });
  });
});
