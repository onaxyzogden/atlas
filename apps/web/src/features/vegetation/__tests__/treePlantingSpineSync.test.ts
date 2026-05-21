/**
 * @vitest-environment happy-dom
 *
 * treePlantingSpineSync — Slice 8-A of the 2026-05-21 habitat-feature
 * unification. Verifies the pure seeder + the side-effecting push:
 *
 *   1. One WorkItem per vegetation-category point DesignElement of the
 *      four kinds, with stable `tree__<id>`, correct source, correct
 *      verb-led title, `designLayer: 'vegetation'`.
 *   2. Non-tree kinds (hedgerow / structure / habitat / paddock) are
 *      ignored.
 *   3. Steward-overridden rows survive a re-push.
 *   4. Cross-source rows (cover-crop / habitat-feature / manual) survive
 *      a re-push.
 *   5. Idempotent re-run produces stable ids + counts.
 *   6. Removing the source DesignElement clears its WorkItem on next push.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { WorkItem } from '@ogden/shared';
import type { DesignElement } from '../../../store/designElementsStore.js';
import { useLandDesignStore } from '../../../store/landDesignStore.js';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import {
  TREE_PLANTING_KINDS,
  treePlantingProvenanceId,
  pushTreePlantingsToSpine,
  seedTreePlantingWorkItems,
} from '../treePlantingSpineSync.js';

function treePoint(over: Partial<DesignElement> & { id: string; kind: string }): DesignElement {
  return {
    category: 'vegetation',
    geometry: { type: 'Point', coordinates: [0, 0] },
    phase: 'trees',
    createdAt: '2026-05-21T00:00:00.000Z',
    ...over,
  } as DesignElement;
}

function hedgerowLine(over: Partial<DesignElement> & { id: string }): DesignElement {
  return {
    category: 'vegetation',
    kind: 'hedgerow',
    geometry: { type: 'LineString', coordinates: [[0, 0], [0, 0.001]] },
    phase: 'trees',
    createdAt: '2026-05-21T00:00:00.000Z',
    ...over,
  } as DesignElement;
}

function manualWorkItem(over: Partial<WorkItem> & { id: string }): WorkItem {
  return {
    projectId: 'p1',
    source: 'manual',
    overridden: false,
    createdAt: '2026-05-21T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
    title: 'manual',
    phaseId: null,
    status: 'todo',
    doneAt: null,
    dependsOn: [],
    dependsOnAuto: [],
    precedesAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
    ...over,
  };
}

beforeEach(() => {
  localStorage.clear();
  useLandDesignStore.setState({ byProject: {} });
  useWorkItemStore.setState({ items: [] });
});

describe('seedTreePlantingWorkItems (pure)', () => {
  it('emits one WorkItem per tree-planting kind with stable ids + titles', () => {
    const elements: DesignElement[] = TREE_PLANTING_KINDS.map((kind, i) =>
      treePoint({ id: `el-${kind}-${i}`, kind }),
    );
    const result = seedTreePlantingWorkItems({
      projectId: 'p1',
      designElements: elements,
      now: () => '2026-05-21T00:00:00.000Z',
    });
    expect(result.length).toBe(TREE_PLANTING_KINDS.length);
    for (const it of result) {
      expect(it.source).toBe('tree-planting');
      expect(it.id.startsWith('tree__')).toBe(true);
      expect(it.title.toLowerCase().startsWith('plant ')).toBe(true);
      expect(it.designLayer).toBe('vegetation');
      expect(it.overridden).toBe(false);
      expect(it.phaseId).toBeNull();
      expect(it.materialsAuto).toEqual([]);
    }
    const oak = result.find((i) => i.id === treePlantingProvenanceId('el-oak-tree-0'));
    expect(oak?.title).toBe('Plant oak tree');
    const shrub = result.find((i) => i.title === 'Plant shrub');
    expect(shrub).toBeDefined();
  });

  it('ignores non-tree-planting kinds (hedgerow / habitat / cropArea)', () => {
    const elements: DesignElement[] = [
      hedgerowLine({ id: 'hr1' }),
      treePoint({ id: 'shouldEmit', kind: 'apple-tree' }),
      {
        id: 'habitat1',
        category: 'habitat',
        kind: 'owl-box',
        geometry: { type: 'Point', coordinates: [0, 0] },
        phase: 'trees',
        createdAt: '2026-05-21T00:00:00.000Z',
      } as DesignElement,
    ];
    const result = seedTreePlantingWorkItems({
      projectId: 'p1',
      designElements: elements,
    });
    expect(result.length).toBe(1);
    expect(result[0]!.id).toBe(treePlantingProvenanceId('shouldEmit'));
  });

  it('is idempotent under repeated calls', () => {
    const elements = [treePoint({ id: 'el1', kind: 'oak-tree' })];
    const a = seedTreePlantingWorkItems({
      projectId: 'p1',
      designElements: elements,
      now: () => '2026-05-21T00:00:00.000Z',
    });
    const b = seedTreePlantingWorkItems({
      projectId: 'p1',
      designElements: elements,
      now: () => '2026-05-21T00:00:00.000Z',
    });
    expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id));
  });
});

describe('pushTreePlantingsToSpine (side-effecting)', () => {
  it('writes tree-planting rows + preserves cross-source rows', () => {
    useLandDesignStore.setState({
      byProject: {
        p1: [treePoint({ id: 'oak', kind: 'oak-tree' })],
      },
    });
    useWorkItemStore.setState({
      items: [
        manualWorkItem({ id: 'm1' }),
        manualWorkItem({ id: 'hf__keep', source: 'habitat-feature' }),
        manualWorkItem({ id: 'cc__keep', source: 'cover-crop' }),
      ],
    });
    pushTreePlantingsToSpine('p1');
    const items = useWorkItemStore.getState().items;
    expect(items.find((i) => i.id === 'm1')).toBeDefined();
    expect(items.find((i) => i.id === 'hf__keep')).toBeDefined();
    expect(items.find((i) => i.id === 'cc__keep')).toBeDefined();
    expect(items.find((i) => i.id === treePlantingProvenanceId('oak'))).toBeDefined();
  });

  it('removing the source DesignElement clears its WorkItem on next push', () => {
    useLandDesignStore.setState({
      byProject: {
        p1: [
          treePoint({ id: 'a', kind: 'oak-tree' }),
          treePoint({ id: 'b', kind: 'pine-tree' }),
        ],
      },
    });
    pushTreePlantingsToSpine('p1');
    expect(useWorkItemStore.getState().items.length).toBe(2);
    // Remove 'b'.
    useLandDesignStore.setState({
      byProject: {
        p1: [treePoint({ id: 'a', kind: 'oak-tree' })],
      },
    });
    pushTreePlantingsToSpine('p1');
    const items = useWorkItemStore.getState().items;
    expect(items.length).toBe(1);
    expect(items[0]!.id).toBe(treePlantingProvenanceId('a'));
  });

  it('preserves steward-overridden tree-planting rows under re-push', () => {
    useLandDesignStore.setState({
      byProject: {
        p1: [treePoint({ id: 'a', kind: 'oak-tree' })],
      },
    });
    pushTreePlantingsToSpine('p1');
    // Steward edits the row.
    useWorkItemStore.setState({
      items: useWorkItemStore.getState().items.map((it) =>
        it.id === treePlantingProvenanceId('a')
          ? { ...it, overridden: true, title: 'Hand-planted heritage oak' }
          : it,
      ),
    });
    // Re-push; overridden row should be preserved.
    pushTreePlantingsToSpine('p1');
    const items = useWorkItemStore.getState().items;
    const overridden = items.find((i) => i.id === treePlantingProvenanceId('a'));
    expect(overridden?.overridden).toBe(true);
    expect(overridden?.title).toBe('Hand-planted heritage oak');
  });
});
