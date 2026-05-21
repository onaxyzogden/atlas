/**
 * @vitest-environment happy-dom
 *
 * habitatFeatureEconomicsMath — Slice 6 (S6-B) of the 2026-05-21
 * habitat-feature unification. Rollup invariants:
 *   - empty program → zero totals + empty byKind
 *   - mixed-kind program → byKind has both, totals match sum
 *   - cross-source items ignored
 *   - orphan items (missing source DesignElement) ignored
 */

import { describe, it, expect } from 'vitest';
import type { WorkItem } from '@ogden/shared';
import type { DesignElement } from '../../../store/designElementsStore.js';
import {
  seedHabitatFeatureWorkItems,
} from '../habitatFeatureSpineSync.js';
import { computeHabitatFeatureProgramEconomics } from '../habitatFeatureEconomicsMath.js';

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

describe('computeHabitatFeatureProgramEconomics', () => {
  it('empty program → zero totals and empty byKind', () => {
    const result = computeHabitatFeatureProgramEconomics({
      items: [],
      designElements: [],
    });
    expect(result.totalLaborHrs).toBe(0);
    expect(result.totalCostRange).toEqual({ low: 0, mid: 0, high: 0 });
    expect(result.byKind.size).toBe(0);
  });

  it('owl-box ×3 → 4.5 hr labor + $45/135/450 band', () => {
    const elements = [
      pointElement({ id: 'a', kind: 'owl-box' }),
      pointElement({ id: 'b', kind: 'owl-box' }),
      pointElement({ id: 'c', kind: 'owl-box' }),
    ];
    const items = seedHabitatFeatureWorkItems({
      projectId: 'p1',
      designElements: elements,
    });
    const result = computeHabitatFeatureProgramEconomics({
      items,
      designElements: elements,
    });
    expect(result.totalLaborHrs).toBeCloseTo(4.5, 5);
    expect(result.totalCostRange.low).toBeCloseTo(45, 5);
    expect(result.totalCostRange.mid).toBeCloseTo(135, 5);
    expect(result.totalCostRange.high).toBeCloseTo(450, 5);
    const owl = result.byKind.get('owl-box');
    expect(owl?.count).toBe(3);
    expect(owl?.laborHrs).toBeCloseTo(4.5, 5);
  });

  it('mixed-kind program — totals sum across kinds; byKind separates them', () => {
    const elements = [
      pointElement({ id: 'a', kind: 'owl-box' }),
      pointElement({ id: 'b', kind: 'nest-box' }),
      pointElement({ id: 'c', kind: 'snag' }),
    ];
    const items = seedHabitatFeatureWorkItems({
      projectId: 'p1',
      designElements: elements,
    });
    const result = computeHabitatFeatureProgramEconomics({
      items,
      designElements: elements,
    });
    // owl-box: 1.5 + nest-box: 0.75 + snag: 0.25 = 2.5
    expect(result.totalLaborHrs).toBeCloseTo(2.5, 5);
    // owl-box mid 45 + nest-box mid 25 + snag mid 0 = 70
    expect(result.totalCostRange.mid).toBeCloseTo(70, 5);
    expect(result.byKind.get('owl-box')?.count).toBe(1);
    expect(result.byKind.get('nest-box')?.count).toBe(1);
    expect(result.byKind.get('snag')?.count).toBe(1);
    expect(result.byKind.get('snag')?.costRange).toEqual({
      low: 0,
      mid: 0,
      high: 0,
    });
  });

  it('insectary-strip rollup scales with polyline length', () => {
    const ins = lineElement({ id: 'i', kind: 'insectary-strip' });
    const items = seedHabitatFeatureWorkItems({
      projectId: 'p1',
      designElements: [ins],
    });
    const result = computeHabitatFeatureProgramEconomics({
      items,
      designElements: [ins],
    });
    const row = result.byKind.get('insectary-strip');
    expect(row?.count).toBe(1);
    // 0.001° lat ≈ 111 m; mid cost $1.20/m → ~$133
    expect(row?.costRange.mid).toBeGreaterThan(50);
    expect(row?.costRange.mid).toBeLessThan(250);
    expect(row?.laborHrs).toBeGreaterThan(2);
    expect(row?.laborHrs).toBeLessThan(10);
  });

  it('cross-source items ignored (cover-crop / goal-compass / manual)', () => {
    const elements = [pointElement({ id: 'a', kind: 'owl-box' })];
    const items: WorkItem[] = [
      ...seedHabitatFeatureWorkItems({
        projectId: 'p1',
        designElements: elements,
      }),
      manualWorkItem({ id: 'cc1', source: 'cover-crop', costRangeAuto: { low: 9999, mid: 9999, high: 9999 } }),
      manualWorkItem({ id: 'gc1', source: 'goal-compass', costRangeAuto: { low: 9999, mid: 9999, high: 9999 } }),
      manualWorkItem({ id: 'm1', source: 'manual', costRangeAuto: { low: 9999, mid: 9999, high: 9999 } }),
    ];
    const result = computeHabitatFeatureProgramEconomics({
      items,
      designElements: elements,
    });
    // owl-box mid 45 alone — cover-crop / goal-compass / manual ignored
    expect(result.totalCostRange.mid).toBeCloseTo(45, 5);
    expect(result.byKind.size).toBe(1);
  });

  it('orphan items (missing source DesignElement) ignored', () => {
    const orphan = manualWorkItem({
      id: 'hf__orphan',
      source: 'habitat-feature',
      generatedFromHabitatElement: 'missing',
      costRangeAuto: { low: 9999, mid: 9999, high: 9999 },
    });
    const result = computeHabitatFeatureProgramEconomics({
      items: [orphan],
      designElements: [],
    });
    expect(result.totalLaborHrs).toBe(0);
    expect(result.totalCostRange).toEqual({ low: 0, mid: 0, high: 0 });
    expect(result.byKind.size).toBe(0);
  });

  it('byKind totals sum to project total (invariant)', () => {
    const elements = [
      pointElement({ id: 'a', kind: 'owl-box' }),
      pointElement({ id: 'b', kind: 'raptor-perch' }),
      pointElement({ id: 'c', kind: 'brush-pile' }),
      pointElement({ id: 'd', kind: 'nest-box' }),
    ];
    const items = seedHabitatFeatureWorkItems({
      projectId: 'p1',
      designElements: elements,
    });
    const result = computeHabitatFeatureProgramEconomics({
      items,
      designElements: elements,
    });
    let summedLabor = 0;
    let summedMid = 0;
    for (const row of result.byKind.values()) {
      summedLabor += row.laborHrs;
      summedMid += row.costRange.mid;
    }
    expect(summedLabor).toBeCloseTo(result.totalLaborHrs, 5);
    expect(summedMid).toBeCloseTo(result.totalCostRange.mid, 5);
  });
});
