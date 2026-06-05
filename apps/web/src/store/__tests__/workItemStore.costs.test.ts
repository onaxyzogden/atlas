// @vitest-environment happy-dom
/**
 * workItemStore.replaceGoalCompassCosts — seeded planned-cost preservation
 * contract (Sub-project D3). Mirrors the D2 resource-contract test 1:1.
 *
 *  - writes `costRangeAuto` only on this project's generated, un-overridden
 *    goal-compass rows;
 *  - never touches the manual point estimate `costUSD`, overridden rows,
 *    manual-source rows, or other projects;
 *  - clears stale auto cost for rows absent from the new map;
 *  - idempotent: a second identical call leaves state byte-identical.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkItemStore } from '../workItemStore.js';
import type { WorkItem, CostRange } from '@ogden/shared';

function wi(partial: Partial<WorkItem> & { id: string }): WorkItem {
  return {
    projectId: 'p1',
    source: 'goal-compass',
    overridden: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: partial.id,
    phaseId: null,
    status: 'todo',
    dependsOn: [],
    dependsOnAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
    ...partial,
  } as WorkItem;
}

const cr = (low: number, mid: number, high: number): CostRange => ({ low, mid, high });

const reset = () => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
  useWorkItemStore.setState({ items: [], migratedSources: [] });
};

describe('replaceGoalCompassCosts — preservation contract', () => {
  beforeEach(reset);

  it('seeds costRangeAuto only on generated, un-overridden goal-compass rows', () => {
    useWorkItemStore.setState({
      items: [
        wi({ id: 'gen', costUSD: 1234 }),
        wi({ id: 'over', overridden: true }),
        wi({ id: 'man', source: 'manual' }),
        wi({ id: 'other-proj', projectId: 'p2' }),
      ],
      migratedSources: [],
    });

    useWorkItemStore.getState().replaceGoalCompassCosts(
      'p1',
      new Map([
        ['gen', cr(1000, 2000, 4000)],
        ['over', cr(9, 9, 9)],
        ['man', cr(9, 9, 9)],
        ['other-proj', cr(9, 9, 9)],
      ]),
    );

    const byId = new Map(
      useWorkItemStore.getState().items.map((it) => [it.id, it]),
    );
    expect(byId.get('gen')!.costRangeAuto).toEqual(cr(1000, 2000, 4000));
    // manual point estimate untouched
    expect(byId.get('gen')!.costUSD).toBe(1234);
    // overridden / manual-source / other-project: never touched
    expect(byId.get('over')!.costRangeAuto).toBeUndefined();
    expect(byId.get('man')!.costRangeAuto).toBeUndefined();
    expect(byId.get('other-proj')!.costRangeAuto).toBeUndefined();
  });

  it('clears stale auto cost for rows absent from the new map', () => {
    useWorkItemStore.setState({
      items: [wi({ id: 'gen', costRangeAuto: cr(5, 5, 5) })],
      migratedSources: [],
    });
    useWorkItemStore.getState().replaceGoalCompassCosts('p1', new Map());
    expect(useWorkItemStore.getState().items[0]!.costRangeAuto).toBeUndefined();
  });

  it('is idempotent — a second identical call is a no-op', () => {
    useWorkItemStore.setState({
      items: [wi({ id: 'gen' })],
      migratedSources: [],
    });
    const map = new Map([['gen', cr(1000, 2000, 4000)]]);
    useWorkItemStore.getState().replaceGoalCompassCosts('p1', map);
    const after1 = useWorkItemStore.getState().items[0]!;
    useWorkItemStore.getState().replaceGoalCompassCosts('p1', map);
    const after2 = useWorkItemStore.getState().items[0]!;
    expect(after2).toBe(after1); // same reference: no updatedAt churn
    expect(after2.costRangeAuto).toEqual(cr(1000, 2000, 4000));
  });
});
