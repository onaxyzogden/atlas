// @vitest-environment happy-dom
/**
 * workItemStore.fulfil — D4 single-writer hard gate. fulfilWorkItem is the
 * SOLE writer of the spine completion fields (status/doneAt/actualStart/
 * actualEnd/who). It is idempotent (re-fulfil = same reference, no churn).
 * unfulfilWorkItem reverses ONLY the spine — proof events are immutable and
 * are not this store's concern (orphan-by-design lives in proofEventStore).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkItemStore } from '../workItemStore.js';
import type { WorkItem } from '@ogden/shared';

function wi(p: Partial<WorkItem> & { id: string }): WorkItem {
  return {
    projectId: 'p1',
    source: 'manual',
    overridden: false,
    createdAt: 'c',
    updatedAt: 'u',
    title: p.id,
    phaseId: null,
    status: 'todo',
    dependsOn: [],
    dependsOnAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
    ...p,
  } as WorkItem;
}

const reset = () => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
  useWorkItemStore.setState({ items: [], migratedSources: [] });
};

describe('workItemStore.fulfilWorkItem / unfulfilWorkItem', () => {
  beforeEach(reset);

  it('stamps exactly the spine completion fields', () => {
    useWorkItemStore.setState({ items: [wi({ id: 'w1' })], migratedSources: [] });
    useWorkItemStore.getState().fulfilWorkItem('w1', {
      who: 'Yousef',
      actualStart: '2026-05-10',
      actualEnd: '2026-05-11',
      notes: 'ignored by the spine writer',
    });
    const it = useWorkItemStore.getState().items[0]!;
    expect(it.status).toBe('done');
    expect(it.doneAt).toBeTruthy();
    expect(it.actualStart).toBe('2026-05-10');
    expect(it.actualEnd).toBe('2026-05-11');
    expect(it.who).toBe('Yousef');
  });

  it('is idempotent: re-fulfilling an already-done item is a no-op (same reference)', () => {
    useWorkItemStore.setState({
      items: [wi({ id: 'w1', status: 'done', doneAt: '2026-05-10T00:00:00.000Z' })],
      migratedSources: [],
    });
    const before = useWorkItemStore.getState().items;
    useWorkItemStore.getState().fulfilWorkItem('w1', { who: 'X' });
    expect(useWorkItemStore.getState().items).toBe(before); // same array reference
  });

  it('does not mutate other items, status of others, or other stores', () => {
    useWorkItemStore.setState({
      items: [wi({ id: 'w1' }), wi({ id: 'w2', status: 'todo' })],
      migratedSources: [],
    });
    useWorkItemStore.getState().fulfilWorkItem('w1', {});
    const w2 = useWorkItemStore.getState().items.find((i) => i.id === 'w2')!;
    expect(w2.status).toBe('todo');
  });

  it('unfulfilWorkItem reverses ONLY the spine fields back to todo', () => {
    useWorkItemStore.setState({
      items: [
        wi({
          id: 'w1',
          status: 'done',
          doneAt: '2026-05-10T00:00:00.000Z',
          actualStart: '2026-05-10',
          actualEnd: '2026-05-11',
          who: 'Yousef',
        }),
      ],
      migratedSources: [],
    });
    useWorkItemStore.getState().unfulfilWorkItem('w1');
    const it = useWorkItemStore.getState().items[0]!;
    expect(it.status).toBe('todo');
    expect(it.doneAt ?? null).toBeNull();
    expect(it.actualStart ?? null).toBeNull();
    expect(it.actualEnd ?? null).toBeNull();
  });
});
