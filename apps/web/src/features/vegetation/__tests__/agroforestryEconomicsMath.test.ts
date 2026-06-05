/**
 * @vitest-environment happy-dom
 *
 * agroforestryEconomicsMath — Slice 8-C rollup tests.
 *
 * Mirrors the habitat-feature economics test shape:
 *   1. Empty program → zero band, empty Map.
 *   2. Single hedgerow → per-kind row with length-scaled cost + labor.
 *   3. Mixed kinds (hedgerow + orchard + silvopasture) → byKind has 3
 *      entries, totals sum.
 *   4. Items missing provenance / source-element / catalog entry are
 *      silently skipped.
 *   5. Non-agroforestry items are ignored.
 */

import { describe, it, expect } from 'vitest';
import type { WorkItem } from '@ogden/shared';
import type { DesignElement } from '../../../store/designElementsStore.js';
import { computeAgroforestryProgramEconomics } from '../agroforestryEconomicsMath.js';
import {
  agroforestryProvenanceId,
  seedAgroforestryWorkItems,
} from '../agroforestrySpineSync.js';

function hedgerow(id: string): DesignElement {
  return {
    id,
    category: 'vegetation',
    kind: 'hedgerow',
    geometry: {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [0.001, 0],
      ],
    },
    phase: 'trees',
    createdAt: '2026-05-21T00:00:00.000Z',
  } as DesignElement;
}

function orchard(id: string): DesignElement {
  return {
    id,
    category: 'grazing',
    kind: 'orchard',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0.0001, 0],
          [0.0001, 0.0001],
          [0, 0.0001],
          [0, 0],
        ],
      ],
    },
    phase: 'trees',
    createdAt: '2026-05-21T00:00:00.000Z',
  } as DesignElement;
}

function silvopasture(id: string): DesignElement {
  return { ...orchard(id), kind: 'silvopasture' } as DesignElement;
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

describe('computeAgroforestryProgramEconomics', () => {
  it('empty program returns zero band + empty byKind', () => {
    const out = computeAgroforestryProgramEconomics({
      items: [],
      designElements: [],
    });
    expect(out.totalLaborHrs).toBe(0);
    expect(out.totalCostRange).toEqual({ low: 0, mid: 0, high: 0 });
    expect(out.byKind.size).toBe(0);
  });

  it('hedgerow-only rollup carries non-zero band + 1 byKind entry', () => {
    const el = hedgerow('h1');
    const items = seedAgroforestryWorkItems({
      projectId: 'p1',
      designElements: [el],
    });
    const out = computeAgroforestryProgramEconomics({
      items,
      designElements: [el],
    });
    expect(out.byKind.size).toBe(1);
    expect(out.byKind.get('hedgerow')!.count).toBe(1);
    expect(out.totalLaborHrs).toBeGreaterThan(0);
    expect(out.totalCostRange.mid).toBeGreaterThan(0);
    expect(out.totalCostRange.low).toBeLessThanOrEqual(out.totalCostRange.mid);
    expect(out.totalCostRange.mid).toBeLessThanOrEqual(out.totalCostRange.high);
  });

  it('mixed kinds (hedgerow + orchard + silvopasture) blend in totals', () => {
    const elements = [hedgerow('h1'), orchard('o1'), silvopasture('s1')];
    const items = seedAgroforestryWorkItems({
      projectId: 'p1',
      designElements: elements,
    });
    const out = computeAgroforestryProgramEconomics({
      items,
      designElements: elements,
    });
    expect(out.byKind.size).toBe(3);
    expect(out.byKind.get('hedgerow')!.count).toBe(1);
    expect(out.byKind.get('orchard')!.count).toBe(1);
    expect(out.byKind.get('silvopasture')!.count).toBe(1);
    // Total labor = sum of per-kind labor.
    const sum =
      out.byKind.get('hedgerow')!.laborHrs +
      out.byKind.get('orchard')!.laborHrs +
      out.byKind.get('silvopasture')!.laborHrs;
    expect(out.totalLaborHrs).toBeCloseTo(sum, 6);
  });

  it('silently skips items without recoverable source DesignElement', () => {
    const orphan = manualItem({
      id: agroforestryProvenanceId('missing'),
      source: 'agroforestry',
      generatedFromAgroforestryElement: 'missing',
    });
    const out = computeAgroforestryProgramEconomics({
      items: [orphan],
      designElements: [],
    });
    expect(out.byKind.size).toBe(0);
    expect(out.totalLaborHrs).toBe(0);
  });

  it('ignores non-agroforestry items (habitat-feature, manual)', () => {
    const el = hedgerow('h1');
    const realItems = seedAgroforestryWorkItems({
      projectId: 'p1',
      designElements: [el],
    });
    const foreign: WorkItem[] = [
      manualItem({ id: 'm1' }),
      manualItem({
        id: 'hf__irrelevant',
        source: 'habitat-feature',
        generatedFromHabitatElement: 'h1',
      }),
    ];
    const out = computeAgroforestryProgramEconomics({
      items: [...realItems, ...foreign],
      designElements: [el],
    });
    expect(out.byKind.size).toBe(1);
    expect(out.byKind.get('hedgerow')!.count).toBe(1);
  });
});
