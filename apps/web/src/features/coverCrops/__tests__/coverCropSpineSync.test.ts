/**
 * @vitest-environment happy-dom
 *
 * coverCropSpineSync — preservation gate + idempotence + composite id
 * stability tests (B5.2.x.b C3).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCropStore } from '../../../store/cropStore.js';
import { usePhaseStore } from '../../../store/phaseStore.js';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import type { CropArea, CropCoverWindow } from '../../../store/cropStore.js';
import type { BuildPhase } from '../../../store/phaseStore.js';
import type { WorkItem } from '@ogden/shared';
import {
  coverCropProvenanceId,
  pushCoverCropPlanToSpine,
  seedCoverCropCosts,
  seedCoverCropResources,
  seedCoverCropWorkItems,
} from '../coverCropSpineSync.js';
import type { CoverCropEntry } from '../coverCropCatalog.js';

const ONE_ACRE_M2 = 4046.8564224;

const CATALOG: CoverCropEntry[] = [
  {
    speciesId: 'winter_rye',
    roles: ['winter_cover'],
    livingRootSeasons: ['winter'],
    plantingMonthWindow: [9, 10],
    rationale: '',
    citation: '',
    seedCostUSDPerAcre: 25,
    seedingLaborHrsPerAcre: 0.4,
    seedRateLbPerAcre: 90,
  },
  {
    speciesId: 'comfrey',
    roles: ['living_mulch'],
    livingRootSeasons: ['spring'],
    plantingMonthWindow: [4, 6],
    rationale: '',
    citation: '',
  },
];

function area(over: Partial<CropArea> & { id: string }): CropArea {
  return {
    projectId: 'p1',
    name: 'A',
    color: '#888',
    type: 'row_crop',
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
    },
    areaM2: ONE_ACRE_M2,
    species: [],
    treeSpacingM: null,
    rowSpacingM: null,
    waterDemand: 'medium',
    irrigationType: 'drip',
    phase: 'phase-1',
    notes: '',
    createdAt: '2026-05-20T00:00:00.000Z',
    updatedAt: '2026-05-20T00:00:00.000Z',
    ...over,
  };
}

const win = (
  speciesId: string,
  startMonth: number,
  endMonth: number,
  over: Partial<CropCoverWindow> = {},
): CropCoverWindow => ({
  speciesId,
  startMonth,
  endMonth,
  role: 'winter_cover',
  ...over,
});

function phase(over: Partial<BuildPhase> & { id: string; order: number; name: string }): BuildPhase {
  return {
    projectId: 'p1',
    timeframe: '',
    description: '',
    color: '#888',
    completed: false,
    notes: '',
    completedAt: null,
    ...over,
  };
}

function manualWorkItem(over: Partial<WorkItem> & { id: string }): WorkItem {
  return {
    projectId: 'p1',
    source: 'manual',
    overridden: false,
    createdAt: '2026-05-20T00:00:00.000Z',
    updatedAt: '2026-05-20T00:00:00.000Z',
    title: 'manual',
    phaseId: null,
    status: 'todo',
    doneAt: null,
    dependsOn: [],
    dependsOnAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
    ...over,
  };
}

describe('coverCropProvenanceId', () => {
  it('is the composite "<cropAreaId>__<windowIndex>"', () => {
    expect(coverCropProvenanceId('ca1', 0)).toBe('ca1__0');
    expect(coverCropProvenanceId('ca1', 2)).toBe('ca1__2');
  });
});

describe('seedCoverCropWorkItems', () => {
  const declaredPhases = [phase({ id: 'phase-1', order: 0, name: 'P1' })];

  it('emits one WorkItem per window', () => {
    const items = seedCoverCropWorkItems({
      projectId: 'p1',
      catalog: CATALOG,
      declaredPhases,
      cropAreas: [
        area({ id: 'ca1', coverCropPlan: [win('winter_rye', 9, 5), win('winter_rye', 6, 8)] }),
        area({ id: 'ca2', coverCropPlan: [win('winter_rye', 9, 5)] }),
      ],
      now: () => '2026-05-20T00:00:00.000Z',
    });
    expect(items).toHaveLength(3);
    expect(items.every((it) => it.source === 'cover-crop')).toBe(true);
    expect(items.every((it) => it.overridden === false)).toBe(true);
    expect(items.map((it) => it.generatedFromCoverCropWindow)).toEqual([
      'ca1__0',
      'ca1__1',
      'ca2__0',
    ]);
  });

  it('joins CropArea.phase to declared phase by id (and by name, case-insensitive)', () => {
    const items = seedCoverCropWorkItems({
      projectId: 'p1',
      catalog: CATALOG,
      declaredPhases,
      cropAreas: [
        area({ id: 'a', phase: 'phase-1', coverCropPlan: [win('winter_rye', 9, 5)] }),
        area({ id: 'b', phase: 'p1', coverCropPlan: [win('winter_rye', 9, 5)] }),
        area({ id: 'c', phase: 'unknown', coverCropPlan: [win('winter_rye', 9, 5)] }),
      ],
    });
    expect(items[0]?.phaseId).toBe('phase-1');
    expect(items[1]?.phaseId).toBe('phase-1');
    expect(items[2]?.phaseId).toBeNull();
  });

  it('excludes cross-project areas', () => {
    const items = seedCoverCropWorkItems({
      projectId: 'p1',
      catalog: CATALOG,
      declaredPhases,
      cropAreas: [
        area({ id: 'a', projectId: 'p2', coverCropPlan: [win('winter_rye', 9, 5)] }),
      ],
    });
    expect(items).toEqual([]);
  });
});

describe('seedCoverCropCosts', () => {
  const declaredPhases = [phase({ id: 'phase-1', order: 0, name: 'P1' })];

  it('emits a degenerate band (low=mid=high) per item with effective seed cost', () => {
    const cropAreas = [area({ id: 'ca1', areaM2: ONE_ACRE_M2, coverCropPlan: [win('winter_rye', 9, 5)] })];
    const items = seedCoverCropWorkItems({ projectId: 'p1', cropAreas, declaredPhases, catalog: CATALOG });
    const costs = seedCoverCropCosts({ items, cropAreas, catalog: CATALOG });
    const band = costs.get(items[0]!.id);
    expect(band).toEqual({ low: 25, mid: 25, high: 25 });
  });

  it('omits items missing both override and catalog data', () => {
    const cropAreas = [area({ id: 'ca1', coverCropPlan: [win('comfrey', 4, 6)] })];
    const items = seedCoverCropWorkItems({ projectId: 'p1', cropAreas, declaredPhases, catalog: CATALOG });
    const costs = seedCoverCropCosts({ items, cropAreas, catalog: CATALOG });
    expect(costs.size).toBe(0);
  });
});

describe('seedCoverCropResources', () => {
  const declaredPhases = [phase({ id: 'phase-1', order: 0, name: 'P1' })];

  it('emits a seed BOM line when seedRateLbPerAcre is present', () => {
    const cropAreas = [area({ id: 'ca1', coverCropPlan: [win('winter_rye', 9, 5)] })];
    const items = seedCoverCropWorkItems({ projectId: 'p1', cropAreas, declaredPhases, catalog: CATALOG });
    const r = seedCoverCropResources({ items, cropAreas, catalog: CATALOG });
    expect(r.get(items[0]!.id)).toEqual({
      equipment: [],
      materials: [{ label: 'winter_rye seed', unit: 'lb', quantityPerAcre: 90 }],
    });
  });

  it('omits items lacking seedRateLbPerAcre', () => {
    const cropAreas = [area({ id: 'ca1', coverCropPlan: [win('comfrey', 4, 6)] })];
    const items = seedCoverCropWorkItems({ projectId: 'p1', cropAreas, declaredPhases, catalog: CATALOG });
    const r = seedCoverCropResources({ items, cropAreas, catalog: CATALOG });
    expect(r.size).toBe(0);
  });
});

describe('pushCoverCropPlanToSpine — preservation gate', () => {
  beforeEach(() => {
    useCropStore.setState({ cropAreas: [] });
    usePhaseStore.setState({ phases: [] });
    useWorkItemStore.setState({ items: [], migratedSources: [] });
  });

  it('preserves manual + goal-compass + overridden cover-crop rows; replaces only un-overridden cover-crop rows', () => {
    usePhaseStore.setState({
      phases: [phase({ id: 'phase-1', order: 0, name: 'P1' })],
    });
    useCropStore.setState({
      cropAreas: [area({ id: 'ca1', coverCropPlan: [win('winter_rye', 9, 5)] })],
    });

    const manual = manualWorkItem({ id: 'm1', title: 'manual T' });
    const goalCompass = manualWorkItem({
      id: 'gc1',
      source: 'goal-compass',
      title: 'goal-compass T',
    });
    const overriddenCover = manualWorkItem({
      id: 'cc__stale__0',
      source: 'cover-crop',
      overridden: true,
      generatedFromCoverCropWindow: 'stale__0',
      title: 'overridden cover-crop',
    });
    const staleCover = manualWorkItem({
      id: 'cc__gone__0',
      source: 'cover-crop',
      overridden: false,
      generatedFromCoverCropWindow: 'gone__0',
      title: 'stale (engine-owned)',
    });

    useWorkItemStore.setState({
      items: [manual, goalCompass, overriddenCover, staleCover],
    });

    pushCoverCropPlanToSpine('p1');

    const items = useWorkItemStore.getState().items;
    // manual + goal-compass + overridden cover-crop survive
    expect(items.find((i) => i.id === 'm1')).toBeDefined();
    expect(items.find((i) => i.id === 'gc1')).toBeDefined();
    expect(items.find((i) => i.id === 'cc__stale__0')).toBeDefined();
    // un-overridden stale cover-crop is replaced
    expect(items.find((i) => i.id === 'cc__gone__0')).toBeUndefined();
    // new cover-crop row appears
    expect(items.find((i) => i.id === 'cc__ca1__0')).toBeDefined();
  });

  it('seeds costRangeAuto + materialsAuto on the new cover-crop rows', () => {
    usePhaseStore.setState({
      phases: [phase({ id: 'phase-1', order: 0, name: 'P1' })],
    });
    useCropStore.setState({
      cropAreas: [
        area({
          id: 'ca1',
          areaM2: ONE_ACRE_M2,
          coverCropPlan: [win('winter_rye', 9, 5)],
        }),
      ],
    });
    useWorkItemStore.setState({ items: [], migratedSources: [] });

    pushCoverCropPlanToSpine('p1');

    const items = useWorkItemStore.getState().items;
    const ccRow = items.find((i) => i.id === 'cc__ca1__0');
    expect(ccRow).toBeDefined();
    expect(ccRow?.costRangeAuto).toEqual({ low: 25, mid: 25, high: 25 });
    expect(ccRow?.materialsAuto).toEqual([
      { label: 'winter_rye seed', unit: 'lb', quantityPerAcre: 90 },
    ]);
  });

  it('cross-source independence — replaceGoalCompassRows([]) leaves cover-crop rows untouched', () => {
    usePhaseStore.setState({
      phases: [phase({ id: 'phase-1', order: 0, name: 'P1' })],
    });
    useCropStore.setState({
      cropAreas: [area({ id: 'ca1', coverCropPlan: [win('winter_rye', 9, 5)] })],
    });
    useWorkItemStore.setState({ items: [], migratedSources: [] });

    pushCoverCropPlanToSpine('p1');
    const beforeIds = useWorkItemStore.getState().items.map((i) => i.id).sort();

    // Wipe goal-compass — cover-crop must survive.
    useWorkItemStore.getState().replaceGoalCompassRows('p1', []);
    const afterIds = useWorkItemStore.getState().items.map((i) => i.id).sort();

    expect(afterIds).toEqual(beforeIds);
  });

  it('cross-source independence — replaceCoverCropRows([]) leaves goal-compass rows untouched', () => {
    useWorkItemStore.setState({
      items: [
        manualWorkItem({
          id: 'gc1',
          source: 'goal-compass',
          overridden: false,
          title: 'gc',
        }),
      ],
      migratedSources: [],
    });

    useWorkItemStore.getState().replaceCoverCropRows('p1', []);
    const items = useWorkItemStore.getState().items;
    expect(items.find((i) => i.id === 'gc1')).toBeDefined();
  });

  it('overridden cover-crop rows survive a wipe (overridden gate)', () => {
    useWorkItemStore.setState({
      items: [
        manualWorkItem({
          id: 'cc__keep__0',
          source: 'cover-crop',
          overridden: true,
          generatedFromCoverCropWindow: 'keep__0',
          title: 'keep me',
        }),
      ],
      migratedSources: [],
    });

    useWorkItemStore.getState().replaceCoverCropRows('p1', []);
    expect(useWorkItemStore.getState().items.find((i) => i.id === 'cc__keep__0')).toBeDefined();
  });
});
