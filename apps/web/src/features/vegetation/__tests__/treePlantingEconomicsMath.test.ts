/**
 * @vitest-environment happy-dom
 *
 * treePlantingEconomicsMath — Slice 8-D rollup tests.
 *
 * Mirrors the agroforestry economics test shape:
 *   1. Empty program → zero band, empty Map.
 *   2. Single oak-tree → per-kind row with flat per-element cost + labor.
 *   3. Mixed kinds (oak + pine + apple + shrub) → byKind has 4 entries,
 *      totals sum.
 *   4. Items missing provenance / source-element / catalog entry are
 *      silently skipped.
 *   5. Non-tree-planting items are ignored.
 */

import { describe, it, expect } from 'vitest';
import type { WorkItem } from '@ogden/shared';
import type { DesignElement } from '../../../store/designElementsStore.js';
import { computeTreePlantingProgramEconomics } from '../treePlantingEconomicsMath.js';
import {
  treePlantingProvenanceId,
  seedTreePlantingWorkItems,
  type TreePlantingKind,
} from '../treePlantingSpineSync.js';
import { treePlantingCatalogEntryFor } from '../treePlantingCatalog.js';

function point(id: string, kind: TreePlantingKind): DesignElement {
  return {
    id,
    category: 'vegetation',
    kind,
    geometry: { type: 'Point', coordinates: [0, 0] },
    phase: 'trees',
    createdAt: '2026-05-21T00:00:00.000Z',
  } as DesignElement;
}

function manualItem(over: Partial<WorkItem> & { id: string }): WorkItem {
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

describe('computeTreePlantingProgramEconomics', () => {
  it('empty program returns zero band + empty byKind', () => {
    const out = computeTreePlantingProgramEconomics({
      items: [],
      designElements: [],
    });
    expect(out.totalLaborHrs).toBe(0);
    expect(out.totalCostRange).toEqual({ low: 0, mid: 0, high: 0 });
    expect(out.byKind.size).toBe(0);
  });

  it('single oak-tree carries flat per-element cost + labor', () => {
    const el = point('oak1', 'oak-tree');
    const items = seedTreePlantingWorkItems({
      projectId: 'p1',
      designElements: [el],
    });
    const out = computeTreePlantingProgramEconomics({
      items,
      designElements: [el],
    });
    const entry = treePlantingCatalogEntryFor('oak-tree')!;
    expect(out.byKind.size).toBe(1);
    expect(out.byKind.get('oak-tree')!.count).toBe(1);
    expect(out.totalLaborHrs).toBeCloseTo(entry.installLaborHrs, 6);
    expect(out.totalCostRange.low).toBeCloseTo(entry.costUSD.low, 6);
    expect(out.totalCostRange.mid).toBeCloseTo(entry.costUSD.mid, 6);
    expect(out.totalCostRange.high).toBeCloseTo(entry.costUSD.high, 6);
  });

  it('mixed kinds (oak + pine + apple + shrub) blend in totals', () => {
    const elements: DesignElement[] = [
      point('o1', 'oak-tree'),
      point('p1', 'pine-tree'),
      point('a1', 'apple-tree'),
      point('s1', 'shrub'),
    ];
    const items = seedTreePlantingWorkItems({
      projectId: 'p1',
      designElements: elements,
    });
    const out = computeTreePlantingProgramEconomics({
      items,
      designElements: elements,
    });
    expect(out.byKind.size).toBe(4);
    for (const kind of [
      'oak-tree',
      'pine-tree',
      'apple-tree',
      'shrub',
    ] as TreePlantingKind[]) {
      expect(out.byKind.get(kind)!.count).toBe(1);
    }
    const sum =
      out.byKind.get('oak-tree')!.laborHrs +
      out.byKind.get('pine-tree')!.laborHrs +
      out.byKind.get('apple-tree')!.laborHrs +
      out.byKind.get('shrub')!.laborHrs;
    expect(out.totalLaborHrs).toBeCloseTo(sum, 6);
  });

  it('silently skips items without recoverable source DesignElement', () => {
    const orphan = manualItem({
      id: treePlantingProvenanceId('missing'),
      source: 'tree-planting',
      generatedFromTreeElement: 'missing',
    });
    const out = computeTreePlantingProgramEconomics({
      items: [orphan],
      designElements: [],
    });
    expect(out.byKind.size).toBe(0);
    expect(out.totalLaborHrs).toBe(0);
  });

  it('ignores non-tree-planting items (habitat-feature, agroforestry, manual)', () => {
    const el = point('o1', 'oak-tree');
    const realItems = seedTreePlantingWorkItems({
      projectId: 'p1',
      designElements: [el],
    });
    const foreign: WorkItem[] = [
      manualItem({ id: 'm1' }),
      manualItem({
        id: 'hf__irrelevant',
        source: 'habitat-feature',
        generatedFromHabitatElement: 'o1',
      }),
      manualItem({
        id: 'agf__irrelevant',
        source: 'agroforestry',
        generatedFromAgroforestryElement: 'o1',
      }),
    ];
    const out = computeTreePlantingProgramEconomics({
      items: [...realItems, ...foreign],
      designElements: [el],
    });
    expect(out.byKind.size).toBe(1);
    expect(out.byKind.get('oak-tree')!.count).toBe(1);
  });
});
