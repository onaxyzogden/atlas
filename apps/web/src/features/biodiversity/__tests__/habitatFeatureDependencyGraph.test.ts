/**
 * @vitest-environment happy-dom
 *
 * habitatFeatureDependencyGraph — Slice 8-B of the 2026-05-21 habitat-
 * feature unification. Verifies the pure host-tree linkage projector:
 *
 *   1. Owl-box with hostTreeFeatureId → oak-tree emits a tree__<id>
 *      dependency edge.
 *   2. Owl-box with hostTreeFeatureId → non-existent id silently drops.
 *   3. Owl-box with hostTreeFeatureId → non-vegetation element (pond /
 *      structure) silently drops.
 *   4. Owl-box with hostTreeFeatureId → non-tree-kind vegetation
 *      (hedgerow line) silently drops.
 *   5. seedHabitatFeatureWorkItems surfaces the auto-edge on the emitted
 *      WorkItem.
 *   6. Steward-overridden habitat row's manual dependsOn survives a
 *      re-push (override-preservation gate in replaceHabitatFeatureRows).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { DesignElement } from '../../../store/designElementsStore.js';
import { useLandDesignStore } from '../../../store/landDesignStore.js';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import {
  habitatFeatureProvenanceId,
  pushHabitatFeaturesToSpine,
  seedHabitatFeatureWorkItems,
} from '../habitatFeatureSpineSync.js';
import { seedHabitatFeatureDependencies } from '../habitatFeatureDependencyGraph.js';
import { treePlantingProvenanceId } from '../../vegetation/treePlantingSpineSync.js';
import { buildHabitatFeatureEditSchema } from '../../../v3/plan/layers/inlineEditSchemas.js';
import { updateDesignElement } from '../../../store/builtEnvironmentSelectors.js';

function treePoint(over: Partial<DesignElement> & { id: string; kind: string }): DesignElement {
  return {
    category: 'vegetation',
    geometry: { type: 'Point', coordinates: [0, 0] },
    phase: 'trees',
    createdAt: '2026-05-21T00:00:00.000Z',
    ...over,
  } as DesignElement;
}

function habitatPoint(
  over: Partial<DesignElement> & { id: string; kind: string },
): DesignElement {
  return {
    category: 'habitat',
    geometry: { type: 'Point', coordinates: [0, 0] },
    phase: 'trees',
    createdAt: '2026-05-21T00:00:00.000Z',
    ...over,
  } as DesignElement;
}

beforeEach(() => {
  localStorage.clear();
  useLandDesignStore.setState({ byProject: {} });
  useWorkItemStore.setState({ items: [] });
});

describe('seedHabitatFeatureDependencies (pure)', () => {
  it('projects hostTreeFeatureId → tree__<id> when host is a placed oak-tree', () => {
    const elements: DesignElement[] = [
      treePoint({ id: 'oak1', kind: 'oak-tree' }),
      habitatPoint({
        id: 'owl1',
        kind: 'owl-box',
        habitatMetadata: { hostTreeFeatureId: 'oak1' },
      }),
    ];
    const deps = seedHabitatFeatureDependencies({ designElements: elements });
    expect(deps.get(habitatFeatureProvenanceId('owl1'))).toEqual([
      treePlantingProvenanceId('oak1'),
    ]);
  });

  it('silently drops a hostTreeFeatureId pointing at a non-existent element', () => {
    const elements: DesignElement[] = [
      habitatPoint({
        id: 'owl1',
        kind: 'owl-box',
        habitatMetadata: { hostTreeFeatureId: 'ghost-tree' },
      }),
    ];
    const deps = seedHabitatFeatureDependencies({ designElements: elements });
    expect(deps.has(habitatFeatureProvenanceId('owl1'))).toBe(false);
  });

  it('silently drops a hostTreeFeatureId pointing at a non-vegetation element', () => {
    const elements: DesignElement[] = [
      {
        id: 'pond1',
        category: 'water',
        kind: 'pond',
        geometry: { type: 'Point', coordinates: [0, 0] },
        phase: 'water',
        createdAt: '2026-05-21T00:00:00.000Z',
      } as DesignElement,
      habitatPoint({
        id: 'owl1',
        kind: 'owl-box',
        habitatMetadata: { hostTreeFeatureId: 'pond1' },
      }),
    ];
    const deps = seedHabitatFeatureDependencies({ designElements: elements });
    expect(deps.has(habitatFeatureProvenanceId('owl1'))).toBe(false);
  });

  it('silently drops a hostTreeFeatureId pointing at a non-tree-kind vegetation element', () => {
    const elements: DesignElement[] = [
      {
        id: 'hr1',
        category: 'vegetation',
        kind: 'hedgerow',
        geometry: { type: 'LineString', coordinates: [[0, 0], [0, 0.001]] },
        phase: 'trees',
        createdAt: '2026-05-21T00:00:00.000Z',
      } as DesignElement,
      habitatPoint({
        id: 'owl1',
        kind: 'owl-box',
        habitatMetadata: { hostTreeFeatureId: 'hr1' },
      }),
    ];
    const deps = seedHabitatFeatureDependencies({ designElements: elements });
    expect(deps.has(habitatFeatureProvenanceId('owl1'))).toBe(false);
  });
});

describe('seedHabitatFeatureWorkItems (D1 projection)', () => {
  it('surfaces dependsOnAuto on the emitted WorkItem when host resolves', () => {
    const elements: DesignElement[] = [
      treePoint({ id: 'oak1', kind: 'oak-tree' }),
      habitatPoint({
        id: 'owl1',
        kind: 'owl-box',
        habitatMetadata: { hostTreeFeatureId: 'oak1' },
      }),
    ];
    const items = seedHabitatFeatureWorkItems({
      projectId: 'p1',
      designElements: elements,
      now: () => '2026-05-21T00:00:00.000Z',
    });
    const owl = items.find((i) => i.id === habitatFeatureProvenanceId('owl1'));
    expect(owl?.dependsOnAuto).toEqual([treePlantingProvenanceId('oak1')]);
  });
});

describe('popover → store → seeder roundtrip (Slice 8-E)', () => {
  it('schema onSave writes hostTreeFeatureId; subsequent push surfaces dependsOnAuto', () => {
    const oak = treePoint({ id: 'oak1', kind: 'oak-tree' });
    const owl = habitatPoint({ id: 'owl1', kind: 'owl-box' });
    useLandDesignStore.setState({ byProject: { p1: [oak, owl] } });
    const designElements = useLandDesignStore.getState().byProject.p1!;
    const schema = buildHabitatFeatureEditSchema(
      owl,
      'p1',
      updateDesignElement,
      designElements,
    );
    schema.onSave({ ...schema.initial, hostTreeFeatureId: 'oak1' });
    const stored = useLandDesignStore
      .getState()
      .byProject.p1!.find((e) => e.id === 'owl1');
    expect(stored?.habitatMetadata?.hostTreeFeatureId).toBe('oak1');
    pushHabitatFeaturesToSpine('p1');
    const items = useWorkItemStore.getState().items;
    const owlWi = items.find((i) => i.id === habitatFeatureProvenanceId('owl1'));
    expect(owlWi?.dependsOnAuto).toEqual([treePlantingProvenanceId('oak1')]);
  });
});

describe('pushHabitatFeaturesToSpine (override preservation)', () => {
  it('preserves a steward-overridden habitat row under re-push', () => {
    useLandDesignStore.setState({
      byProject: {
        p1: [
          treePoint({ id: 'oak1', kind: 'oak-tree' }),
          habitatPoint({
            id: 'owl1',
            kind: 'owl-box',
            habitatMetadata: { hostTreeFeatureId: 'oak1' },
          }),
        ],
      },
    });
    pushHabitatFeaturesToSpine('p1');
    // Steward edits the row — manual dependsOn + override flag.
    useWorkItemStore.setState({
      items: useWorkItemStore.getState().items.map((it) =>
        it.id === habitatFeatureProvenanceId('owl1')
          ? { ...it, overridden: true, dependsOn: ['manual-task-x'] }
          : it,
      ),
    });
    pushHabitatFeaturesToSpine('p1');
    const items = useWorkItemStore.getState().items;
    const owl = items.find((i) => i.id === habitatFeatureProvenanceId('owl1'));
    expect(owl?.overridden).toBe(true);
    expect(owl?.dependsOn).toEqual(['manual-task-x']);
  });
});
