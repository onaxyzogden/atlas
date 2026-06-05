/**
 * @vitest-environment happy-dom
 *
 * Slice 7 (S7-A) of the 2026-05-21 habitat-feature unification —
 * combined cover-crop + habitat-feature per-phase cashflow rollup.
 *
 * Invariants:
 *   - empty project → empty rows + zero totals
 *   - cover-crop-only / habitat-only programs isolate cleanly
 *   - mixed program sums per-phase + project-wide
 *   - declared `BuildPhase.order` respected for row ordering
 *   - habitat items lacking a resolvable phase fall into the
 *     `__unphased__` synthetic bucket
 *   - cross-source / orphan items silently ignored
 */

import { describe, it, expect } from 'vitest';
import type { WorkItem } from '@ogden/shared';
import type { DesignElement } from '../../../store/designElementsStore.js';
import type { BuildPhase } from '../../../store/phaseStore.js';
import type { CropArea, CropCoverWindow } from '../../../store/cropStore.js';
import {
  computeStewardshipProgramsCashflow,
  UNPHASED_CASHFLOW_BUCKET_ID,
} from '../stewardshipProgramsCashflow.js';

const NOW = '2026-05-21T00:00:00.000Z';

function buildPhase(over: Partial<BuildPhase> & { id: string; order: number; name: string }): BuildPhase {
  return {
    projectId: 'p1',
    timeframe: '',
    description: '',
    color: '',
    completed: false,
    notes: '',
    completedAt: null,
    ...over,
  } as BuildPhase;
}

function habitatPoint(over: Partial<DesignElement> & { id: string; kind: string }): DesignElement {
  return {
    category: 'habitat',
    geometry: { type: 'Point', coordinates: [0, 0] },
    phase: 'trees',
    createdAt: NOW,
    ...over,
  } as DesignElement;
}

function treePoint(id: string, kind: string): DesignElement {
  return {
    id,
    category: 'vegetation',
    kind,
    geometry: { type: 'Point', coordinates: [0, 0] },
    phase: 'trees',
    createdAt: NOW,
  } as DesignElement;
}

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
    createdAt: NOW,
  } as DesignElement;
}

function workItem(over: Partial<WorkItem> & { id: string }): WorkItem {
  return {
    projectId: 'p1',
    source: 'manual',
    overridden: false,
    createdAt: NOW,
    updatedAt: NOW,
    title: 'wi',
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

function cropArea(over: Partial<CropArea> & { id: string; areaM2: number; coverCropPlan: CropCoverWindow[] }): CropArea {
  return {
    projectId: 'p1',
    name: 'A',
    color: '#000',
    type: 'row_crop',
    geometry: { type: 'Polygon', coordinates: [] },
    species: [],
    treeSpacingM: null,
    rowSpacingM: null,
    waterDemand: 'low',
    irrigationType: 'rain_fed',
    phase: '',
    notes: '',
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  } as CropArea;
}

const PHASES: BuildPhase[] = [
  buildPhase({ id: 'ph-soil', order: 1, name: 'Soil Year' }),
  buildPhase({ id: 'ph-trees', order: 2, name: 'Tree Year' }),
];

describe('computeStewardshipProgramsCashflow', () => {
  it('empty project → empty rows + zero totals', () => {
    const result = computeStewardshipProgramsCashflow({
      projectId: 'p1',
      items: [],
      designElements: [],
      declaredPhases: PHASES,
      cropAreas: [],
    });
    expect(result.rows).toEqual([]);
    expect(result.totals.coverCrop).toEqual({ laborHrs: 0, costRange: { low: 0, mid: 0, high: 0 } });
    expect(result.totals.habitatFeature).toEqual({ laborHrs: 0, costRange: { low: 0, mid: 0, high: 0 } });
    expect(result.totals.combined).toEqual({ laborHrs: 0, costRange: { low: 0, mid: 0, high: 0 } });
  });

  it('habitat-only program → owl-box ×2 → unphased bucket with $30/90/300 + 3hr', () => {
    const elements = [
      habitatPoint({ id: 'el-a', kind: 'owl-box' }),
      habitatPoint({ id: 'el-b', kind: 'owl-box' }),
    ];
    const items = [
      workItem({ id: 'hf__el-a', source: 'habitat-feature', generatedFromHabitatElement: 'el-a' }),
      workItem({ id: 'hf__el-b', source: 'habitat-feature', generatedFromHabitatElement: 'el-b' }),
    ];
    const result = computeStewardshipProgramsCashflow({
      projectId: 'p1',
      items,
      designElements: elements,
      declaredPhases: PHASES,
      cropAreas: [],
    });
    expect(result.rows.length).toBe(1);
    const row = result.rows[0]!;
    expect(row.phaseId).toBe(UNPHASED_CASHFLOW_BUCKET_ID);
    expect(row.habitatFeature.laborHrs).toBeCloseTo(3.0, 5);
    expect(row.habitatFeature.costRange).toEqual({ low: 30, mid: 90, high: 300 });
    expect(row.coverCrop).toEqual({ laborHrs: 0, costRange: { low: 0, mid: 0, high: 0 } });
    expect(row.total.laborHrs).toBeCloseTo(3.0, 5);
    expect(row.total.costRange).toEqual({ low: 30, mid: 90, high: 300 });
    expect(result.totals.habitatFeature.costRange).toEqual({ low: 30, mid: 90, high: 300 });
    expect(result.totals.combined.costRange).toEqual({ low: 30, mid: 90, high: 300 });
  });

  it('region scales the cost band (×1.20 for ca-ontario) but leaves labor unchanged', () => {
    const elements = [
      habitatPoint({ id: 'el-a', kind: 'owl-box' }),
      habitatPoint({ id: 'el-b', kind: 'owl-box' }),
    ];
    const items = [
      workItem({ id: 'hf__el-a', source: 'habitat-feature', generatedFromHabitatElement: 'el-a' }),
      workItem({ id: 'hf__el-b', source: 'habitat-feature', generatedFromHabitatElement: 'el-b' }),
    ];
    const result = computeStewardshipProgramsCashflow({
      projectId: 'p1',
      items,
      designElements: elements,
      declaredPhases: PHASES,
      cropAreas: [],
      region: 'ca-ontario', // ×1.20
    });
    const row = result.rows[0]!;
    // Base owl-box ×2 = {30, 90, 300}; ×1.20 = {36, 108, 360}.
    expect(row.habitatFeature.costRange).toEqual({ low: 36, mid: 108, high: 360 });
    // Labor is a cost-index-invariant — unchanged from the ×1.00 baseline.
    expect(row.habitatFeature.laborHrs).toBeCloseTo(3.0, 5);
    expect(result.totals.combined.costRange).toEqual({ low: 36, mid: 108, high: 360 });
    expect(result.totals.combined.laborHrs).toBeCloseTo(3.0, 5);
  });

  it('omitting region is the ×1.00 identity (unchanged from baseline)', () => {
    const elements = [habitatPoint({ id: 'el-a', kind: 'owl-box' })];
    const items = [
      workItem({ id: 'hf__el-a', source: 'habitat-feature', generatedFromHabitatElement: 'el-a' }),
    ];
    const result = computeStewardshipProgramsCashflow({
      projectId: 'p1',
      items,
      designElements: elements,
      declaredPhases: PHASES,
      cropAreas: [],
    });
    // Single owl-box base band, no scaling.
    expect(result.rows[0]!.habitatFeature.costRange).toEqual({ low: 15, mid: 45, high: 150 });
  });

  it('habitat item with declared phaseId resolves into that phase bucket', () => {
    const elements = [habitatPoint({ id: 'el-a', kind: 'owl-box' })];
    const items = [
      workItem({
        id: 'hf__el-a',
        source: 'habitat-feature',
        generatedFromHabitatElement: 'el-a',
        phaseId: 'ph-trees',
      }),
    ];
    const result = computeStewardshipProgramsCashflow({
      projectId: 'p1',
      items,
      designElements: elements,
      declaredPhases: PHASES,
      cropAreas: [],
    });
    expect(result.rows.length).toBe(1);
    const row = result.rows[0]!;
    expect(row.phaseId).toBe('ph-trees');
    expect(row.phaseName).toBe('Tree Year');
    expect(row.phaseOrder).toBe(2);
    expect(row.habitatFeature.costRange).toEqual({ low: 15, mid: 45, high: 150 });
  });

  it('cross-source / orphan items are silently ignored', () => {
    const elements = [habitatPoint({ id: 'el-a', kind: 'owl-box' })];
    const items = [
      // Wrong source.
      workItem({ id: 'm1', source: 'manual' }),
      // Wrong project.
      workItem({
        id: 'hf__el-other',
        projectId: 'p-other',
        source: 'habitat-feature',
        generatedFromHabitatElement: 'el-a',
      }),
      // No provenance.
      workItem({ id: 'hf__nada', source: 'habitat-feature' }),
      // Missing source DesignElement.
      workItem({
        id: 'hf__ghost',
        source: 'habitat-feature',
        generatedFromHabitatElement: 'el-missing',
      }),
    ];
    const result = computeStewardshipProgramsCashflow({
      projectId: 'p1',
      items,
      designElements: elements,
      declaredPhases: PHASES,
      cropAreas: [],
    });
    expect(result.rows).toEqual([]);
    expect(result.totals.combined).toEqual({ laborHrs: 0, costRange: { low: 0, mid: 0, high: 0 } });
  });

  it('cover-crop-only program → seeds a phase row with flat cost projected into low=mid=high', () => {
    // Use injected catalog so the test doesn't depend on PLANT_CATALOG state.
    const catalog = [
      {
        speciesId: 'sp-rye',
        roles: ['winter_cover'] as const,
        livingRootSeasons: ['winter'] as const,
        plantingMonthWindow: [9, 11] as [number, number],
        rationale: 'test',
        citation: 'test',
        seedCostUSDPerAcre: 40,
        seedingLaborHrsPerAcre: 0.5,
      },
    ];
    const areas = [
      cropArea({
        id: 'ca1',
        areaM2: 4046.8564224, // exactly 1 acre
        phase: 'ph-soil',
        coverCropPlan: [
          { speciesId: 'sp-rye', startMonth: 9, endMonth: 12, role: 'winter_cover' },
        ],
      }),
    ];
    const result = computeStewardshipProgramsCashflow({
      projectId: 'p1',
      items: [],
      designElements: [],
      declaredPhases: PHASES,
      cropAreas: areas,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      coverCropCatalog: catalog as any,
    });
    expect(result.rows.length).toBe(1);
    const row = result.rows[0]!;
    expect(row.phaseId).toBe('ph-soil');
    expect(row.coverCrop.laborHrs).toBeCloseTo(0.5, 5);
    expect(row.coverCrop.costRange.low).toBeCloseTo(40, 5);
    expect(row.coverCrop.costRange.mid).toBeCloseTo(40, 5);
    expect(row.coverCrop.costRange.high).toBeCloseTo(40, 5);
    expect(row.habitatFeature).toEqual({ laborHrs: 0, costRange: { low: 0, mid: 0, high: 0 } });
    expect(row.total.laborHrs).toBeCloseTo(0.5, 5);
  });

  it('mixed program → rows ordered by phase.order, unphased last, totals sum both programs', () => {
    const elements = [habitatPoint({ id: 'el-a', kind: 'owl-box' })];
    const items = [
      // Habitat item assigned to ph-trees.
      workItem({
        id: 'hf__el-a',
        source: 'habitat-feature',
        generatedFromHabitatElement: 'el-a',
        phaseId: 'ph-trees',
      }),
    ];
    const catalog = [
      {
        speciesId: 'sp-rye',
        roles: ['winter_cover'] as const,
        livingRootSeasons: ['winter'] as const,
        plantingMonthWindow: [9, 11] as [number, number],
        rationale: 'test',
        citation: 'test',
        seedCostUSDPerAcre: 40,
        seedingLaborHrsPerAcre: 0.5,
      },
    ];
    const areas = [
      // Cover-crop in ph-soil (order 1).
      cropArea({
        id: 'ca1',
        areaM2: 4046.8564224,
        phase: 'ph-soil',
        coverCropPlan: [
          { speciesId: 'sp-rye', startMonth: 9, endMonth: 12, role: 'winter_cover' },
        ],
      }),
      // Cover-crop with unresolvable phase → unphased bucket.
      cropArea({
        id: 'ca2',
        areaM2: 4046.8564224,
        phase: 'no-such-phase',
        coverCropPlan: [
          { speciesId: 'sp-rye', startMonth: 9, endMonth: 12, role: 'winter_cover' },
        ],
      }),
    ];
    const result = computeStewardshipProgramsCashflow({
      projectId: 'p1',
      items,
      designElements: elements,
      declaredPhases: PHASES,
      cropAreas: areas,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      coverCropCatalog: catalog as any,
    });
    expect(result.rows.length).toBe(3);
    // ph-soil (order 1) → ph-trees (order 2) → unphased (MAX_SAFE_INTEGER).
    expect(result.rows[0]!.phaseId).toBe('ph-soil');
    expect(result.rows[1]!.phaseId).toBe('ph-trees');
    expect(result.rows[2]!.phaseId).toBe(UNPHASED_CASHFLOW_BUCKET_ID);

    // ph-soil: cover-crop only.
    expect(result.rows[0]!.coverCrop.costRange.mid).toBeCloseTo(40, 5);
    expect(result.rows[0]!.habitatFeature.costRange.mid).toBe(0);

    // ph-trees: habitat only.
    expect(result.rows[1]!.coverCrop.costRange.mid).toBe(0);
    expect(result.rows[1]!.habitatFeature.costRange.mid).toBe(45);

    // unphased: cover-crop only (ca2).
    expect(result.rows[2]!.coverCrop.costRange.mid).toBeCloseTo(40, 5);
    expect(result.rows[2]!.habitatFeature.costRange.mid).toBe(0);

    // Totals.
    expect(result.totals.coverCrop.costRange.mid).toBeCloseTo(80, 5);
    expect(result.totals.habitatFeature.costRange.mid).toBe(45);
    expect(result.totals.combined.costRange.mid).toBeCloseTo(125, 5);
    expect(result.totals.combined.laborHrs).toBeCloseTo(0.5 + 0.5 + 1.5, 5);
  });

  /* ---------------- Slice 8-C: agroforestry --------------------- */

  it('agroforestry-only program → hedgerow contributes a per-phase row', () => {
    const elements = [hedgerow('h1')];
    const items = [
      workItem({
        id: 'agf__h1',
        source: 'agroforestry',
        generatedFromAgroforestryElement: 'h1',
        phaseId: 'ph-trees',
      }),
    ];
    const result = computeStewardshipProgramsCashflow({
      projectId: 'p1',
      items,
      designElements: elements,
      declaredPhases: PHASES,
      cropAreas: [],
    });
    expect(result.rows.length).toBe(1);
    const row = result.rows[0]!;
    expect(row.phaseId).toBe('ph-trees');
    expect(row.agroforestry.costRange.mid).toBeGreaterThan(0);
    expect(row.agroforestry.laborHrs).toBeGreaterThan(0);
    // No cross-program leakage.
    expect(row.coverCrop.costRange.mid).toBe(0);
    expect(row.habitatFeature.costRange.mid).toBe(0);
    // Combined matches agroforestry alone.
    expect(row.total.costRange.mid).toBeCloseTo(row.agroforestry.costRange.mid, 6);
    expect(result.totals.agroforestry.costRange.mid).toBeCloseTo(
      row.agroforestry.costRange.mid,
      6,
    );
  });

  it('hedgerow length scales the cost band (per-meter mid 4.0)', () => {
    const elements = [hedgerow('h1')];
    const items = [
      workItem({
        id: 'agf__h1',
        source: 'agroforestry',
        generatedFromAgroforestryElement: 'h1',
        phaseId: 'ph-trees',
      }),
    ];
    const result = computeStewardshipProgramsCashflow({
      projectId: 'p1',
      items,
      designElements: elements,
      declaredPhases: PHASES,
      cropAreas: [],
    });
    const row = result.rows[0]!;
    // Length is ~111 m for a 0.001° longitude segment at equator.
    // Per-meter mid is 4.0 → ~$444 mid; assert order-of-magnitude.
    expect(row.agroforestry.costRange.mid).toBeGreaterThan(100);
    expect(row.agroforestry.costRange.mid).toBeLessThan(1000);
    // Band ordering preserved.
    expect(row.agroforestry.costRange.low).toBeLessThanOrEqual(
      row.agroforestry.costRange.mid,
    );
    expect(row.agroforestry.costRange.mid).toBeLessThanOrEqual(
      row.agroforestry.costRange.high,
    );
  });

  it('mixed CC + HF + agroforestry → combined sums all three programs', () => {
    const elements = [
      habitatPoint({ id: 'el-a', kind: 'owl-box' }),
      hedgerow('h1'),
    ];
    const items = [
      workItem({
        id: 'hf__el-a',
        source: 'habitat-feature',
        generatedFromHabitatElement: 'el-a',
        phaseId: 'ph-trees',
      }),
      workItem({
        id: 'agf__h1',
        source: 'agroforestry',
        generatedFromAgroforestryElement: 'h1',
        phaseId: 'ph-trees',
      }),
      // Tree-planting WorkItem whose source DesignElement is a habitat
      // owl-box → no tree-planting catalog entry for kind='owl-box', so
      // the loop silently skips it (B4/B5 "omitted-not-stubbed").
      workItem({
        id: 'tree__t1',
        source: 'tree-planting',
        generatedFromTreeElement: 'el-a',
        phaseId: 'ph-trees',
      }),
    ];
    const catalog = [
      {
        speciesId: 'sp-rye',
        roles: ['winter_cover'] as const,
        livingRootSeasons: ['winter'] as const,
        plantingMonthWindow: [9, 11] as [number, number],
        rationale: 'test',
        citation: 'test',
        seedCostUSDPerAcre: 40,
        seedingLaborHrsPerAcre: 0.5,
      },
    ];
    const areas = [
      cropArea({
        id: 'ca1',
        areaM2: 4046.8564224,
        phase: 'ph-soil',
        coverCropPlan: [
          { speciesId: 'sp-rye', startMonth: 9, endMonth: 12, role: 'winter_cover' },
        ],
      }),
    ];
    const result = computeStewardshipProgramsCashflow({
      projectId: 'p1',
      items,
      designElements: elements,
      declaredPhases: PHASES,
      cropAreas: areas,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      coverCropCatalog: catalog as any,
    });

    // Two rows: ph-soil (cover-crop) + ph-trees (habitat + agroforestry).
    expect(result.rows.length).toBe(2);
    const trees = result.rows.find((r) => r.phaseId === 'ph-trees')!;
    expect(trees.habitatFeature.costRange.mid).toBe(45);
    expect(trees.agroforestry.costRange.mid).toBeGreaterThan(0);
    // ph-trees total = habitat + agroforestry (no cover-crop there).
    expect(trees.total.costRange.mid).toBeCloseTo(
      45 + trees.agroforestry.costRange.mid,
      6,
    );

    // Combined totals = sum of all three program totals.
    expect(result.totals.combined.costRange.mid).toBeCloseTo(
      result.totals.coverCrop.costRange.mid +
        result.totals.habitatFeature.costRange.mid +
        result.totals.agroforestry.costRange.mid,
      6,
    );
    expect(result.totals.combined.laborHrs).toBeCloseTo(
      result.totals.coverCrop.laborHrs +
        result.totals.habitatFeature.laborHrs +
        result.totals.agroforestry.laborHrs +
        result.totals.treePlanting.laborHrs,
      6,
    );
  });

  /* ---------------- Slice 8-D: tree-planting -------------------- */

  it('tree-planting-only program → oak-tree contributes a per-phase row with flat band', () => {
    const elements = [treePoint('o1', 'oak-tree')];
    const items = [
      workItem({
        id: 'tree__o1',
        source: 'tree-planting',
        generatedFromTreeElement: 'o1',
        phaseId: 'ph-trees',
      }),
    ];
    const result = computeStewardshipProgramsCashflow({
      projectId: 'p1',
      items,
      designElements: elements,
      declaredPhases: PHASES,
      cropAreas: [],
    });
    expect(result.rows.length).toBe(1);
    const row = result.rows[0]!;
    expect(row.phaseId).toBe('ph-trees');
    // Catalog oak-tree: 8/35/150, 1.5 hr (flat per-element).
    expect(row.treePlanting.costRange).toEqual({ low: 8, mid: 35, high: 150 });
    expect(row.treePlanting.laborHrs).toBeCloseTo(1.5, 6);
    // No cross-program leakage.
    expect(row.coverCrop.costRange.mid).toBe(0);
    expect(row.habitatFeature.costRange.mid).toBe(0);
    expect(row.agroforestry.costRange.mid).toBe(0);
    // Combined matches tree-planting alone for this row.
    expect(row.total.costRange.mid).toBe(35);
    expect(row.total.laborHrs).toBeCloseTo(1.5, 6);
    expect(result.totals.treePlanting.costRange).toEqual({
      low: 8,
      mid: 35,
      high: 150,
    });
  });

  it('oak-tree join via generatedFromTreeElement pulls the right catalog entry', () => {
    const elements = [
      treePoint('o1', 'oak-tree'),
      treePoint('p1', 'pine-tree'),
    ];
    const items = [
      workItem({
        id: 'tree__o1',
        source: 'tree-planting',
        generatedFromTreeElement: 'o1',
        phaseId: 'ph-trees',
      }),
      workItem({
        id: 'tree__p1',
        source: 'tree-planting',
        generatedFromTreeElement: 'p1',
        phaseId: 'ph-trees',
      }),
    ];
    const result = computeStewardshipProgramsCashflow({
      projectId: 'p1',
      items,
      designElements: elements,
      declaredPhases: PHASES,
      cropAreas: [],
    });
    const row = result.rows[0]!;
    // oak 8/35/150 + pine 5/25/100 = 13/60/250
    expect(row.treePlanting.costRange).toEqual({ low: 13, mid: 60, high: 250 });
    // 1.5 + 0.75 = 2.25 hr
    expect(row.treePlanting.laborHrs).toBeCloseTo(2.25, 6);
  });

  it('mixed CC + HF + AF + TP → combined sums all four programs', () => {
    const elements = [
      habitatPoint({ id: 'el-a', kind: 'owl-box' }),
      hedgerow('h1'),
      treePoint('o1', 'oak-tree'),
    ];
    const items = [
      workItem({
        id: 'hf__el-a',
        source: 'habitat-feature',
        generatedFromHabitatElement: 'el-a',
        phaseId: 'ph-trees',
      }),
      workItem({
        id: 'agf__h1',
        source: 'agroforestry',
        generatedFromAgroforestryElement: 'h1',
        phaseId: 'ph-trees',
      }),
      workItem({
        id: 'tree__o1',
        source: 'tree-planting',
        generatedFromTreeElement: 'o1',
        phaseId: 'ph-trees',
      }),
    ];
    const catalog = [
      {
        speciesId: 'sp-rye',
        roles: ['winter_cover'] as const,
        livingRootSeasons: ['winter'] as const,
        plantingMonthWindow: [9, 11] as [number, number],
        rationale: 'test',
        citation: 'test',
        seedCostUSDPerAcre: 40,
        seedingLaborHrsPerAcre: 0.5,
      },
    ];
    const areas = [
      cropArea({
        id: 'ca1',
        areaM2: 4046.8564224,
        phase: 'ph-soil',
        coverCropPlan: [
          { speciesId: 'sp-rye', startMonth: 9, endMonth: 12, role: 'winter_cover' },
        ],
      }),
    ];
    const result = computeStewardshipProgramsCashflow({
      projectId: 'p1',
      items,
      designElements: elements,
      declaredPhases: PHASES,
      cropAreas: areas,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      coverCropCatalog: catalog as any,
    });

    const trees = result.rows.find((r) => r.phaseId === 'ph-trees')!;
    expect(trees.habitatFeature.costRange.mid).toBe(45);
    expect(trees.agroforestry.costRange.mid).toBeGreaterThan(0);
    expect(trees.treePlanting.costRange.mid).toBe(35);
    expect(trees.total.costRange.mid).toBeCloseTo(
      45 + trees.agroforestry.costRange.mid + 35,
      6,
    );

    expect(result.totals.combined.costRange.mid).toBeCloseTo(
      result.totals.coverCrop.costRange.mid +
        result.totals.habitatFeature.costRange.mid +
        result.totals.agroforestry.costRange.mid +
        result.totals.treePlanting.costRange.mid,
      6,
    );
    expect(result.totals.combined.laborHrs).toBeCloseTo(
      result.totals.coverCrop.laborHrs +
        result.totals.habitatFeature.laborHrs +
        result.totals.agroforestry.laborHrs +
        result.totals.treePlanting.laborHrs,
      6,
    );
  });
});
