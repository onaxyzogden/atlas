/**
 * @vitest-environment happy-dom
 *
 * habitatFeatureSpineSync — Slice 5 of the 2026-05-21 habitat-feature
 * unification. Verifies the pure seeder + the side-effecting push:
 *
 *   1. One WorkItem per habitat-category DesignElement, with stable
 *      `hf__<id>`, correct source, correct verb-led title, designLayer
 *      mapped from PhaseKey.
 *   2. Non-habitat kinds (hedgerow / pond / shrub / structure) are
 *      ignored.
 *   3. Steward-overridden rows survive a re-push.
 *   4. Cross-source rows (cover-crop / goal-compass / manual) survive
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
  HABITAT_FEATURE_KINDS,
  habitatFeatureProvenanceId,
  pushHabitatFeaturesToSpine,
  seedHabitatFeatureWorkItems,
} from '../habitatFeatureSpineSync.js';

function pointElement(over: Partial<DesignElement> & { id: string; kind: string }): DesignElement {
  return {
    category: 'habitat',
    geometry: { type: 'Point', coordinates: [0, 0] },
    phase: 'trees',
    createdAt: '2026-05-21T00:00:00.000Z',
    ...over,
  } as DesignElement;
}

function lineElement(over: Partial<DesignElement> & { id: string; kind: string }): DesignElement {
  return {
    category: 'habitat',
    geometry: {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [0, 0.001],
      ],
    },
    phase: 'soil',
    createdAt: '2026-05-21T00:00:00.000Z',
    ...over,
  } as DesignElement;
}

function polygonElement(over: Partial<DesignElement> & { id: string; kind: string }): DesignElement {
  return {
    category: 'habitat',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0, 0.001],
          [0.001, 0.001],
          [0.001, 0],
          [0, 0],
        ],
      ],
    },
    phase: 'water',
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

describe('habitatFeatureProvenanceId', () => {
  it('is the composite "hf__<designElementId>"', () => {
    expect(habitatFeatureProvenanceId('de-1')).toBe('hf__de-1');
    expect(habitatFeatureProvenanceId('owlbox-42')).toBe('hf__owlbox-42');
  });
});

describe('seedHabitatFeatureWorkItems', () => {
  it('emits one WorkItem per habitat-category element with the per-kind title', () => {
    const elements: DesignElement[] = [
      pointElement({ id: 'a', kind: 'owl-box', phase: 'trees' }),
      pointElement({ id: 'b', kind: 'raptor-perch', phase: 'trees' }),
      pointElement({ id: 'c', kind: 'nest-box', phase: 'trees' }),
      pointElement({ id: 'd', kind: 'brush-pile', phase: 'soil' }),
      pointElement({ id: 'e', kind: 'snag', phase: 'trees' }),
      lineElement({ id: 'f', kind: 'insectary-strip', phase: 'soil' }),
      polygonElement({ id: 'g', kind: 'wetland-edge', phase: 'water' }),
    ];
    const items = seedHabitatFeatureWorkItems({
      projectId: 'p1',
      designElements: elements,
      now: () => '2026-05-21T00:00:00.000Z',
    });
    expect(items).toHaveLength(7);
    expect(items.every((it) => it.source === 'habitat-feature')).toBe(true);
    expect(items.every((it) => it.overridden === false)).toBe(true);
    expect(items.map((it) => it.id)).toEqual([
      'hf__a',
      'hf__b',
      'hf__c',
      'hf__d',
      'hf__e',
      'hf__f',
      'hf__g',
    ]);
    expect(items.map((it) => it.title)).toEqual([
      'Install owl box',
      'Place raptor perch',
      'Install nest box',
      'Build brush pile',
      'Designate snag',
      'Establish insectary strip',
      'Establish wetland edge',
    ]);
    expect(items.map((it) => it.generatedFromHabitatElement)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
    ]);
  });

  it('maps PhaseKey to designLayer (trees/soil → vegetation; water → water)', () => {
    const items = seedHabitatFeatureWorkItems({
      projectId: 'p1',
      designElements: [
        pointElement({ id: 'a', kind: 'owl-box', phase: 'trees' }),
        pointElement({ id: 'b', kind: 'brush-pile', phase: 'soil' }),
        polygonElement({ id: 'c', kind: 'wetland-edge', phase: 'water' }),
      ],
    });
    expect(items[0]?.designLayer).toBe('vegetation');
    expect(items[1]?.designLayer).toBe('vegetation');
    expect(items[2]?.designLayer).toBe('water');
  });

  it('ignores non-habitat kinds (hedgerow / pond / shrub / paddock / structure)', () => {
    const items = seedHabitatFeatureWorkItems({
      projectId: 'p1',
      designElements: [
        lineElement({ id: 'h1', kind: 'hedgerow', category: 'vegetation' }),
        polygonElement({ id: 'p1', kind: 'pond', category: 'water' }),
        pointElement({ id: 's1', kind: 'shrub', category: 'vegetation' }),
        pointElement({ id: 'pad', kind: 'paddock', category: 'grazing' }),
        pointElement({ id: 'barn', kind: 'barn', category: 'structure' }),
      ],
    });
    expect(items).toEqual([]);
  });

  it('every declared habitat kind has a verb-led title (no orphans)', () => {
    const elements = HABITAT_FEATURE_KINDS.map((k, i) =>
      pointElement({ id: `e${i}`, kind: k }),
    );
    const items = seedHabitatFeatureWorkItems({
      projectId: 'p1',
      designElements: elements,
    });
    expect(items).toHaveLength(HABITAT_FEATURE_KINDS.length);
    for (const it of items) {
      expect(it.title).toMatch(/^[A-Z]\w+ \w/);
      expect(it.title.length).toBeGreaterThan(5);
    }
  });
});

describe('pushHabitatFeaturesToSpine — preservation gate', () => {
  beforeEach(() => {
    useLandDesignStore.setState({ byProject: {} });
    useWorkItemStore.setState({ items: [], migratedSources: [] });
  });

  it('replaces only this project\'s un-overridden habitat-feature rows', () => {
    useLandDesignStore.setState({
      byProject: {
        p1: [pointElement({ id: 'owl-1', kind: 'owl-box' })],
      },
    });
    const manual = manualWorkItem({ id: 'm1', title: 'manual T' });
    const goalCompass = manualWorkItem({
      id: 'gc1',
      source: 'goal-compass',
      title: 'goal-compass T',
    });
    const overriddenHabitat = manualWorkItem({
      id: 'hf__stale',
      source: 'habitat-feature',
      overridden: true,
      generatedFromHabitatElement: 'stale',
      title: 'overridden habitat',
    });
    const staleHabitat = manualWorkItem({
      id: 'hf__gone',
      source: 'habitat-feature',
      overridden: false,
      generatedFromHabitatElement: 'gone',
      title: 'stale (engine-owned)',
    });
    useWorkItemStore.setState({
      items: [manual, goalCompass, overriddenHabitat, staleHabitat],
    });

    pushHabitatFeaturesToSpine('p1');

    const items = useWorkItemStore.getState().items;
    // manual + goal-compass + overridden habitat-feature survive
    expect(items.find((i) => i.id === 'm1')).toBeDefined();
    expect(items.find((i) => i.id === 'gc1')).toBeDefined();
    expect(items.find((i) => i.id === 'hf__stale')).toBeDefined();
    // un-overridden stale habitat-feature is dropped
    expect(items.find((i) => i.id === 'hf__gone')).toBeUndefined();
    // new habitat-feature row appears
    expect(items.find((i) => i.id === 'hf__owl-1')).toBeDefined();
  });

  it('cross-source independence — replaceCoverCropRows([]) leaves habitat-feature rows untouched', () => {
    useLandDesignStore.setState({
      byProject: {
        p1: [pointElement({ id: 'owl-1', kind: 'owl-box' })],
      },
    });
    pushHabitatFeaturesToSpine('p1');
    const before = useWorkItemStore
      .getState()
      .items.map((i) => i.id)
      .sort();
    useWorkItemStore.getState().replaceCoverCropRows('p1', []);
    const after = useWorkItemStore
      .getState()
      .items.map((i) => i.id)
      .sort();
    expect(after).toEqual(before);
  });

  it('cross-source independence — replaceHabitatFeatureRows([]) leaves cover-crop / goal-compass untouched', () => {
    useWorkItemStore.setState({
      items: [
        manualWorkItem({ id: 'cc1', source: 'cover-crop' }),
        manualWorkItem({ id: 'gc1', source: 'goal-compass' }),
        manualWorkItem({
          id: 'hf__owl-1',
          source: 'habitat-feature',
          generatedFromHabitatElement: 'owl-1',
        }),
      ],
      migratedSources: [],
    });
    useWorkItemStore.getState().replaceHabitatFeatureRows('p1', []);
    const items = useWorkItemStore.getState().items;
    expect(items.find((i) => i.id === 'cc1')).toBeDefined();
    expect(items.find((i) => i.id === 'gc1')).toBeDefined();
    expect(items.find((i) => i.id === 'hf__owl-1')).toBeUndefined();
  });

  it('idempotent — pushing twice yields the same id set', () => {
    useLandDesignStore.setState({
      byProject: {
        p1: [
          pointElement({ id: 'owl-1', kind: 'owl-box' }),
          lineElement({ id: 'ins-1', kind: 'insectary-strip' }),
        ],
      },
    });
    pushHabitatFeaturesToSpine('p1');
    const before = useWorkItemStore
      .getState()
      .items.filter((i) => i.source === 'habitat-feature')
      .map((i) => i.id)
      .sort();
    pushHabitatFeaturesToSpine('p1');
    const after = useWorkItemStore
      .getState()
      .items.filter((i) => i.source === 'habitat-feature')
      .map((i) => i.id)
      .sort();
    expect(after).toEqual(before);
    expect(after).toEqual(['hf__ins-1', 'hf__owl-1']);
  });

  it('removing the source DesignElement clears its WorkItem on next push', () => {
    useLandDesignStore.setState({
      byProject: {
        p1: [
          pointElement({ id: 'owl-1', kind: 'owl-box' }),
          pointElement({ id: 'owl-2', kind: 'owl-box' }),
        ],
      },
    });
    pushHabitatFeaturesToSpine('p1');
    expect(
      useWorkItemStore.getState().items.find((i) => i.id === 'hf__owl-2'),
    ).toBeDefined();
    // Delete owl-2
    useLandDesignStore.setState({
      byProject: {
        p1: [pointElement({ id: 'owl-1', kind: 'owl-box' })],
      },
    });
    pushHabitatFeaturesToSpine('p1');
    expect(
      useWorkItemStore.getState().items.find((i) => i.id === 'hf__owl-2'),
    ).toBeUndefined();
    expect(
      useWorkItemStore.getState().items.find((i) => i.id === 'hf__owl-1'),
    ).toBeDefined();
  });

  it('overridden habitat-feature row survives a wipe (overridden gate)', () => {
    useLandDesignStore.setState({
      byProject: {
        p1: [pointElement({ id: 'keep', kind: 'owl-box' })],
      },
    });
    useWorkItemStore.setState({
      items: [
        manualWorkItem({
          id: 'hf__keep',
          source: 'habitat-feature',
          overridden: true,
          generatedFromHabitatElement: 'keep',
          title: 'overridden — steward-edited',
        }),
      ],
      migratedSources: [],
    });
    pushHabitatFeaturesToSpine('p1');
    const row = useWorkItemStore
      .getState()
      .items.find((i) => i.id === 'hf__keep');
    expect(row).toBeDefined();
    expect(row?.title).toBe('overridden — steward-edited');
    expect(row?.overridden).toBe(true);
  });
});
