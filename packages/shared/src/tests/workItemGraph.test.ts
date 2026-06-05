/**
 * workItemGraph — pure dependency / critical-path engine correctness tests
 * (Sub-project D1).
 */

import { describe, it, expect } from 'vitest';
import type { WorkItem } from '../schemas/workItem.schema.js';
import {
  analyzeWorkItemGraph,
  buildEffectiveGraph,
  detectCycle,
  effectiveDependencies,
  itemDuration,
} from '../lib/workItemGraph.js';

const day = (n: number) =>
  new Date(Date.UTC(2026, 0, 1 + n)).toISOString();

function wi(partial: Partial<WorkItem> & { id: string }): WorkItem {
  return {
    projectId: 'p1',
    source: 'goal-compass',
    overridden: false,
    createdAt: day(0),
    updatedAt: day(0),
    title: partial.id,
    phaseId: null,
    status: 'todo',
    dependsOn: [],
    dependsOnAuto: [],
    ...partial,
  } as WorkItem;
}

describe('effectiveDependencies / buildEffectiveGraph', () => {
  it('unions dependsOn and dependsOnAuto, de-duplicated', () => {
    const item = wi({ id: 'c', dependsOn: ['a', 'b'], dependsOnAuto: ['b', 'd'] });
    expect(effectiveDependencies(item).sort()).toEqual(['a', 'b', 'd']);
  });

  it('drops dangling, self, and duplicate edges', () => {
    const items = [
      wi({ id: 'a' }),
      wi({ id: 'b', dependsOn: ['a', 'ghost', 'b'], dependsOnAuto: ['a'] }),
    ];
    const { deps, dependents } = buildEffectiveGraph(items);
    expect(deps.get('b')).toEqual(['a']);
    expect(dependents.get('a')).toEqual(['b']);
    expect(deps.get('a')).toEqual([]);
  });

  it('unions inverse precedesAuto into successor predecessor set', () => {
    // X.precedesAuto = [Y] ⇒ Y depends on X (X is Y's predecessor)
    const items = [
      wi({ id: 'cc', precedesAuto: ['cash'] } as Partial<WorkItem> & { id: string }),
      wi({ id: 'cash' }),
    ];
    const { deps, dependents } = buildEffectiveGraph(items);
    expect(deps.get('cash')).toEqual(['cc']);
    expect(dependents.get('cc')).toEqual(['cash']);
    expect(deps.get('cc')).toEqual([]);
  });

  it('de-duplicates when both precedesAuto inverse and dependsOnAuto point the same way', () => {
    const items = [
      wi({ id: 'cc', precedesAuto: ['cash'] } as Partial<WorkItem> & { id: string }),
      wi({ id: 'cash', dependsOnAuto: ['cc'] }),
    ];
    const { deps, dependents } = buildEffectiveGraph(items);
    expect(deps.get('cash')).toEqual(['cc']);
    expect(dependents.get('cc')).toEqual(['cash']);
  });

  it('drops dangling precedesAuto targets silently', () => {
    const items = [
      wi({ id: 'cc', precedesAuto: ['ghost'] } as Partial<WorkItem> & { id: string }),
    ];
    const { deps } = buildEffectiveGraph(items);
    expect(deps.get('cc')).toEqual([]);
  });
});

describe('detectCycle', () => {
  it('treats a self-edge as a cycle', () => {
    expect(detectCycle([wi({ id: 'a' })], 'a', 'a')).toBe(true);
  });

  it('refuses an edge that closes a loop, allows one that does not', () => {
    // a → b → c (c depends on b, b depends on a)
    const items = [
      wi({ id: 'a' }),
      wi({ id: 'b', dependsOn: ['a'] }),
      wi({ id: 'c', dependsOn: ['b'] }),
    ];
    // adding a → c (a depends on c) would close a→b→c→a
    expect(detectCycle(items, 'a', 'c')).toBe(true);
    // adding c → a (c depends on a) is a redundant but acyclic forward edge
    expect(detectCycle(items, 'c', 'a')).toBe(false);
  });

  it('ignores unknown ids', () => {
    expect(detectCycle([wi({ id: 'a' })], 'a', 'ghost')).toBe(false);
  });
});

describe('itemDuration — fallback ladder', () => {
  it('uses the scheduled span in days when both dates parse', () => {
    expect(itemDuration(wi({ id: 'x', scheduledStart: day(0), scheduledEnd: day(5) }))).toBe(5);
  });

  it('clamps a negative scheduled span to 0', () => {
    expect(itemDuration(wi({ id: 'x', scheduledStart: day(5), scheduledEnd: day(0) }))).toBe(0);
  });

  it('falls back to laborHrs rounded up to whole workdays', () => {
    expect(itemDuration(wi({ id: 'x', laborHrs: 9 }))).toBe(2);
    expect(itemDuration(wi({ id: 'x', laborHrs: 8 }))).toBe(1);
  });

  it('is a zero-duration milestone when nothing is given', () => {
    expect(itemDuration(wi({ id: 'x' }))).toBe(0);
  });
});

describe('analyzeWorkItemGraph — CPM', () => {
  it('produces a valid topological order', () => {
    const items = [
      wi({ id: 'c', dependsOn: ['b'] }),
      wi({ id: 'a' }),
      wi({ id: 'b', dependsOn: ['a'] }),
    ];
    const { order, cyclic } = analyzeWorkItemGraph(items);
    expect(cyclic).toBe(false);
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'));
  });

  it('computes slack and the critical path over a diamond', () => {
    // a → {b(3d), c(1d)} → d ; longest path a-b-d is critical, c has slack
    const items = [
      wi({ id: 'a', laborHrs: 8 }), // 1d
      wi({ id: 'b', dependsOn: ['a'], scheduledStart: day(0), scheduledEnd: day(3) }), // 3d
      wi({ id: 'c', dependsOn: ['a'], scheduledStart: day(0), scheduledEnd: day(1) }), // 1d
      wi({ id: 'd', dependsOn: ['b', 'c'], laborHrs: 8 }), // 1d
    ];
    const { byId, cyclic } = analyzeWorkItemGraph(items);
    expect(cyclic).toBe(false);
    expect(byId.get('a')!.critical).toBe(true);
    expect(byId.get('b')!.critical).toBe(true);
    expect(byId.get('d')!.critical).toBe(true);
    expect(byId.get('c')!.critical).toBe(false);
    expect(byId.get('c')!.slack).toBe(2);
    expect(byId.get('a')!.earliestFinish).toBe(1);
    expect(byId.get('b')!.earliestFinish).toBe(4);
    expect(byId.get('d')!.earliestStart).toBe(4);
  });

  it('reports cyclic and degrades CPM to zeros without looping', () => {
    const items = [
      wi({ id: 'a', dependsOn: ['b'] }),
      wi({ id: 'b', dependsOn: ['a'] }),
    ];
    const { cyclic, order, byId } = analyzeWorkItemGraph(items);
    expect(cyclic).toBe(true);
    expect(order).toEqual([]);
    expect(byId.get('a')!.slack).toBe(0);
    expect(byId.get('a')!.critical).toBe(false);
  });
});

describe('analyzeWorkItemGraph — derived blocked', () => {
  it('blocks on any dependency not done/cancelled, regardless of cycles', () => {
    const items = [
      wi({ id: 'done', status: 'done' }),
      wi({ id: 'cancelled', status: 'cancelled' }),
      wi({ id: 'open', status: 'in-progress' }),
      wi({ id: 'x', dependsOn: ['done', 'cancelled'] }),
      wi({ id: 'y', dependsOnAuto: ['open'] }),
    ];
    const { byId } = analyzeWorkItemGraph(items);
    expect(byId.get('x')!.blocked).toBe(false);
    expect(byId.get('y')!.blocked).toBe(true);
    expect(byId.get('y')!.blockedBy).toEqual(['open']);
  });

  it('still derives blocked-state when the graph is cyclic', () => {
    const items = [
      wi({ id: 'a', status: 'todo', dependsOn: ['b'] }),
      wi({ id: 'b', status: 'todo', dependsOn: ['a'] }),
    ];
    const { cyclic, byId } = analyzeWorkItemGraph(items);
    expect(cyclic).toBe(true);
    expect(byId.get('a')!.blocked).toBe(true);
    expect(byId.get('a')!.blockedBy).toEqual(['b']);
  });
});
