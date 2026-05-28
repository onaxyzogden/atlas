// @vitest-environment happy-dom
/**
 * observeFeedStore — Phase 3 Slice 3.5 substrate.
 *
 * Covers: appendObservation, getByProject/getByFeedKey/getByAction
 * selectors, count selectors (with divergence-only variant), per-project
 * isolation, clearForProject, removeForAction.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useObserveFeedStore,
  type ObserveFeedEntry,
} from '../observeFeedStore.js';

function entry(
  id: string,
  over: Partial<ObserveFeedEntry> = {},
): ObserveFeedEntry {
  return {
    id,
    projectId: 'p1',
    feedKey: 'obj-1',
    sourceType: 'verified',
    sourceActionId: 'fa-1',
    sourceActionTitle: 'Sample action',
    proofItems: [],
    capturedAt: '2026-05-28T00:00:00.000Z',
    ...over,
  };
}

function reset(): void {
  useObserveFeedStore.setState({ byProject: {} });
}

describe('observeFeedStore', () => {
  beforeEach(reset);

  it('appendObservation adds an entry under the right project bucket', () => {
    useObserveFeedStore.getState().appendObservation(entry('o1'));
    expect(useObserveFeedStore.getState().byProject['p1']).toHaveLength(1);
  });

  it('appendObservation preserves order across multiple appends', () => {
    const { appendObservation } = useObserveFeedStore.getState();
    appendObservation(entry('o1'));
    appendObservation(entry('o2'));
    appendObservation(entry('o3'));
    const list = useObserveFeedStore.getState().byProject['p1']!;
    expect(list.map((e) => e.id)).toEqual(['o1', 'o2', 'o3']);
  });

  it('getByProject returns the empty frozen list for unknown projects', () => {
    const list = useObserveFeedStore.getState().getByProject('not-a-project');
    expect(list).toEqual([]);
  });

  it('getByFeedKey filters to entries tagged with the given key', () => {
    const { appendObservation, getByFeedKey } = useObserveFeedStore.getState();
    appendObservation(entry('o1', { feedKey: 'obj-1' }));
    appendObservation(entry('o2', { feedKey: 'obj-2' }));
    appendObservation(entry('o3', { feedKey: 'obj-1' }));
    expect(getByFeedKey('p1', 'obj-1').map((e) => e.id)).toEqual(['o1', 'o3']);
    expect(getByFeedKey('p1', 'obj-2').map((e) => e.id)).toEqual(['o2']);
  });

  it('getByAction filters by source action id', () => {
    const { appendObservation, getByAction } = useObserveFeedStore.getState();
    appendObservation(entry('o1', { sourceActionId: 'fa-a' }));
    appendObservation(entry('o2', { sourceActionId: 'fa-b' }));
    expect(getByAction('p1', 'fa-a').map((e) => e.id)).toEqual(['o1']);
  });

  it('countByFeedKey counts all entries; countDivergencesByFeedKey counts only diverged', () => {
    const { appendObservation, countByFeedKey, countDivergencesByFeedKey } =
      useObserveFeedStore.getState();
    appendObservation(entry('o1', { feedKey: 'obj-1', sourceType: 'verified' }));
    appendObservation(
      entry('o2', {
        feedKey: 'obj-1',
        sourceType: 'diverged',
        divergenceType: 'new_discovery',
      }),
    );
    appendObservation(
      entry('o3', {
        feedKey: 'obj-1',
        sourceType: 'diverged',
        divergenceType: 'physical_constraint',
      }),
    );
    appendObservation(entry('o4', { feedKey: 'obj-2', sourceType: 'verified' }));
    expect(countByFeedKey('p1', 'obj-1')).toBe(3);
    expect(countDivergencesByFeedKey('p1', 'obj-1')).toBe(2);
    expect(countDivergencesByFeedKey('p1', 'obj-2')).toBe(0);
  });

  it('isolates entries per project', () => {
    const { appendObservation, getByProject } = useObserveFeedStore.getState();
    appendObservation(entry('o1', { projectId: 'p1' }));
    appendObservation(entry('o2', { projectId: 'p2' }));
    expect(getByProject('p1')).toHaveLength(1);
    expect(getByProject('p2')).toHaveLength(1);
  });

  it('clearForProject drops only the matching project bucket', () => {
    const { appendObservation, clearForProject, getByProject } =
      useObserveFeedStore.getState();
    appendObservation(entry('o1', { projectId: 'p1' }));
    appendObservation(entry('o2', { projectId: 'p2' }));
    clearForProject('p1');
    expect(getByProject('p1')).toEqual([]);
    expect(getByProject('p2')).toHaveLength(1);
  });

  it('removeForAction drops only entries sourced from that action', () => {
    const { appendObservation, removeForAction, getByProject } =
      useObserveFeedStore.getState();
    appendObservation(entry('o1', { sourceActionId: 'fa-a' }));
    appendObservation(entry('o2', { sourceActionId: 'fa-b' }));
    appendObservation(entry('o3', { sourceActionId: 'fa-a' }));
    removeForAction('p1', 'fa-a');
    expect(getByProject('p1').map((e) => e.id)).toEqual(['o2']);
  });
});
