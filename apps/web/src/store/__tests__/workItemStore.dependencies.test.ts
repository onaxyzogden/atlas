// @vitest-environment happy-dom
/**
 * workItemStore.replaceGoalCompassDependencies — seeded-edge preservation
 * contract (Sub-project D1).
 *
 *  - writes `dependsOnAuto` only on this project's generated, un-overridden
 *    goal-compass rows (mirrors replaceGoalCompassRows 1:1);
 *  - never touches manual `dependsOn`, overridden rows, manual-source rows,
 *    or other projects;
 *  - idempotent: a second identical call leaves state byte-identical.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkItemStore } from '../workItemStore.js';
import type { WorkItem } from '@ogden/shared';

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
    ...partial,
  } as WorkItem;
}

const reset = () => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
  useWorkItemStore.setState({ items: [], migratedSources: [] });
};

describe('replaceGoalCompassDependencies — preservation contract', () => {
  beforeEach(reset);

  it('seeds dependsOnAuto only on generated, un-overridden goal-compass rows', () => {
    useWorkItemStore.setState({
      items: [
        wi({ id: 'gen', dependsOn: ['manual-edge'] }),
        wi({ id: 'over', overridden: true }),
        wi({ id: 'man', source: 'manual' }),
        wi({ id: 'other-proj', projectId: 'p2' }),
      ],
      migratedSources: [],
    });

    useWorkItemStore.getState().replaceGoalCompassDependencies(
      'p1',
      new Map([
        ['gen', ['a', 'b']],
        ['over', ['x']],
        ['man', ['y']],
        ['other-proj', ['z']],
      ]),
    );

    const byId = new Map(
      useWorkItemStore.getState().items.map((it) => [it.id, it]),
    );
    // generated row: seeded; manual dependsOn untouched
    expect(byId.get('gen')!.dependsOnAuto).toEqual(['a', 'b']);
    expect(byId.get('gen')!.dependsOn).toEqual(['manual-edge']);
    // overridden / manual-source / other-project: never touched
    expect(byId.get('over')!.dependsOnAuto).toEqual([]);
    expect(byId.get('man')!.dependsOnAuto).toEqual([]);
    expect(byId.get('other-proj')!.dependsOnAuto).toEqual([]);
  });

  it('clears stale auto edges for rows absent from the new map', () => {
    useWorkItemStore.setState({
      items: [wi({ id: 'gen', dependsOnAuto: ['old'] })],
      migratedSources: [],
    });
    useWorkItemStore
      .getState()
      .replaceGoalCompassDependencies('p1', new Map());
    expect(useWorkItemStore.getState().items[0]!.dependsOnAuto).toEqual([]);
  });

  it('is idempotent — a second identical call is a no-op', () => {
    useWorkItemStore.setState({
      items: [wi({ id: 'gen' })],
      migratedSources: [],
    });
    const edges = new Map([['gen', ['a', 'b']]]);
    useWorkItemStore.getState().replaceGoalCompassDependencies('p1', edges);
    const after1 = useWorkItemStore.getState().items[0]!;
    useWorkItemStore.getState().replaceGoalCompassDependencies('p1', edges);
    const after2 = useWorkItemStore.getState().items[0]!;
    expect(after2).toBe(after1); // same reference: no updatedAt churn
    expect(after2.dependsOnAuto).toEqual(['a', 'b']);
  });
});
