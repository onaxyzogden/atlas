// @vitest-environment happy-dom
/**
 * seedGoalCompassDependencies — intervention-prerequisite → WorkItem-edge
 * seeding (Sub-project D1).
 */

import { describe, it, expect } from 'vitest';
import type { WorkItem } from '@ogden/shared';
import { seedGoalCompassDependencies } from '../goalCompassSpineSync.js';

function gc(id: string, intervention?: string): WorkItem {
  return {
    id,
    projectId: 'p1',
    source: 'goal-compass',
    overridden: false,
    createdAt: 'c',
    updatedAt: 'u',
    title: id,
    phaseId: null,
    status: 'todo',
    dependsOn: [],
    dependsOnAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
    generatedFromInterventionId: intervention,
  } as WorkItem;
}

const CATALOG = [
  { id: 'water', prerequisites: [] },
  { id: 'access', prerequisites: [] },
  { id: 'pasture', prerequisites: ['water', 'access'] },
  { id: 'graze', prerequisites: ['pasture'] },
  { id: 'orphan', prerequisites: ['ghost-intervention'] },
];

describe('seedGoalCompassDependencies', () => {
  it('maps an item to the WorkItem ids of its intervention prerequisites', () => {
    const items = [
      gc('w1', 'water'),
      gc('a1', 'access'),
      gc('p1', 'pasture'),
      gc('g1', 'graze'),
    ];
    const edges = seedGoalCompassDependencies(items, CATALOG);
    expect(edges.get('p1')!.sort()).toEqual(['a1', 'w1']);
    expect(edges.get('g1')).toEqual(['p1']);
    // No-prerequisite interventions get no auto edges.
    expect(edges.has('w1')).toBe(false);
    expect(edges.has('a1')).toBe(false);
  });

  it('fans in every WorkItem produced by a prerequisite intervention', () => {
    const items = [
      gc('w1', 'water'),
      gc('w2', 'water'),
      gc('p1', 'pasture'),
    ];
    const edges = seedGoalCompassDependencies(items, CATALOG);
    expect(edges.get('p1')!.sort()).toEqual(['w1', 'w2']);
  });

  it('ignores prerequisites with no generated WorkItem and unknown interventions', () => {
    const edges = seedGoalCompassDependencies(
      [gc('o1', 'orphan'), gc('x1', 'not-in-catalog'), gc('m1')],
      CATALOG,
    );
    expect(edges.size).toBe(0);
  });

  it('never emits a self-edge', () => {
    const edges = seedGoalCompassDependencies(
      [gc('s1', 'self'), gc('s2', 'self')],
      [{ id: 'self', prerequisites: ['self'] }],
    );
    expect(edges.get('s1') ?? []).not.toContain('s1');
    expect(edges.get('s2') ?? []).not.toContain('s2');
  });

  it('produces a graph that is acyclic when the catalog is acyclic', () => {
    const items = [
      gc('w1', 'water'),
      gc('a1', 'access'),
      gc('p1', 'pasture'),
      gc('g1', 'graze'),
    ];
    const edges = seedGoalCompassDependencies(items, CATALOG);
    // Walk every edge; a back-reference would form a cycle.
    const reachable = (start: string): Set<string> => {
      const seen = new Set<string>();
      const stack = [...(edges.get(start) ?? [])];
      while (stack.length) {
        const n = stack.pop()!;
        if (seen.has(n)) continue;
        seen.add(n);
        stack.push(...(edges.get(n) ?? []));
      }
      return seen;
    };
    for (const id of ['w1', 'a1', 'p1', 'g1']) {
      expect(reachable(id).has(id)).toBe(false);
    }
  });
});
