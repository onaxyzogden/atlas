// @vitest-environment happy-dom
/**
 * workItemStore.replaceGoalCompassResources — seeded-resource preservation
 * contract (Sub-project D2). Mirrors the D1 dependency-contract test 1:1.
 *
 *  - writes `equipmentRequiredAuto` / `materialsAuto` only on this project's
 *    generated, un-overridden goal-compass rows;
 *  - never touches manual `equipmentRequired` / `materials`, overridden
 *    rows, manual-source rows, or other projects;
 *  - idempotent: a second identical call leaves state byte-identical.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkItemStore } from '../workItemStore.js';
import type { WorkItem, MaterialLine } from '@ogden/shared';

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

const m = (label: string): MaterialLine => ({ label, unit: 'ea' });

const reset = () => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
  useWorkItemStore.setState({ items: [], migratedSources: [] });
};

describe('replaceGoalCompassResources — preservation contract', () => {
  beforeEach(reset);

  it('seeds *Auto only on generated, un-overridden goal-compass rows', () => {
    useWorkItemStore.setState({
      items: [
        wi({
          id: 'gen',
          equipmentRequired: ['manual-tool'],
          materials: [m('manual-mat')],
        }),
        wi({ id: 'over', overridden: true }),
        wi({ id: 'man', source: 'manual' }),
        wi({ id: 'other-proj', projectId: 'p2' }),
      ],
      migratedSources: [],
    });

    useWorkItemStore.getState().replaceGoalCompassResources(
      'p1',
      new Map([
        ['gen', { equipment: ['tractor'], materials: [m('compost')] }],
        ['over', { equipment: ['x'], materials: [m('x')] }],
        ['man', { equipment: ['y'], materials: [m('y')] }],
        ['other-proj', { equipment: ['z'], materials: [m('z')] }],
      ]),
    );

    const byId = new Map(
      useWorkItemStore.getState().items.map((it) => [it.id, it]),
    );
    expect(byId.get('gen')!.equipmentRequiredAuto).toEqual(['tractor']);
    expect(byId.get('gen')!.materialsAuto).toEqual([m('compost')]);
    // manual fields untouched
    expect(byId.get('gen')!.equipmentRequired).toEqual(['manual-tool']);
    expect(byId.get('gen')!.materials).toEqual([m('manual-mat')]);
    // overridden / manual-source / other-project: never touched
    expect(byId.get('over')!.equipmentRequiredAuto).toEqual([]);
    expect(byId.get('man')!.materialsAuto).toEqual([]);
    expect(byId.get('other-proj')!.equipmentRequiredAuto).toEqual([]);
  });

  it('clears stale auto resources for rows absent from the new map', () => {
    useWorkItemStore.setState({
      items: [
        wi({
          id: 'gen',
          equipmentRequiredAuto: ['old'],
          materialsAuto: [m('old')],
        }),
      ],
      migratedSources: [],
    });
    useWorkItemStore.getState().replaceGoalCompassResources('p1', new Map());
    const row = useWorkItemStore.getState().items[0]!;
    expect(row.equipmentRequiredAuto).toEqual([]);
    expect(row.materialsAuto).toEqual([]);
  });

  it('is idempotent — a second identical call is a no-op', () => {
    useWorkItemStore.setState({
      items: [wi({ id: 'gen' })],
      migratedSources: [],
    });
    const map = new Map([
      ['gen', { equipment: ['tractor'], materials: [m('compost')] }],
    ]);
    useWorkItemStore.getState().replaceGoalCompassResources('p1', map);
    const after1 = useWorkItemStore.getState().items[0]!;
    useWorkItemStore.getState().replaceGoalCompassResources('p1', map);
    const after2 = useWorkItemStore.getState().items[0]!;
    expect(after2).toBe(after1); // same reference: no updatedAt churn
    expect(after2.equipmentRequiredAuto).toEqual(['tractor']);
    expect(after2.materialsAuto).toEqual([m('compost')]);
  });
});
