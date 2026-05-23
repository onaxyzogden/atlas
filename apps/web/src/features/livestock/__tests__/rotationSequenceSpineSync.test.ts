/**
 * @vitest-environment happy-dom
 *
 * rotationSequenceSpineSync — pure seeder + dependency helper +
 * orchestrator preservation-gate tests (B3 spine push).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { WorkItem } from '@ogden/shared';
import {
  useLivestockStore,
  type Paddock,
} from '../../../store/livestockStore.js';
import { usePhaseStore } from '../../../store/phaseStore.js';
import { useRotationPlanStore } from '../../../store/rotationPlanStore.js';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import type { BuildPhase } from '../../../store/phaseStore.js';
import type {
  RotationCell,
  RotationPlan,
} from '../rotationSequenceMath.js';
import {
  pushRotationSequenceToSpine,
  rotationMoveProvenanceId,
  seedRotationSequenceDependencies,
  seedRotationSequenceWorkItems,
} from '../rotationSequenceSpineSync.js';

function paddock(
  over: Partial<Paddock> & { id: string; name: string },
): Paddock {
  return {
    projectId: 'p1',
    color: '#888',
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
    },
    areaM2: 4046.86,
    grazingCellGroup: null,
    species: [],
    stockingDensity: null,
    fencing: 'none',
    guestSafeBuffer: false,
    waterPointNote: '',
    shelterNote: '',
    phase: 'phase-1',
    notes: '',
    createdAt: '2026-05-20T00:00:00.000Z',
    updatedAt: '2026-05-20T00:00:00.000Z',
    ...over,
  };
}

function cell(over: Partial<RotationCell> & { paddockId: string }): RotationCell {
  return {
    cellGroup: 'g1',
    sequenceOrder: 0,
    targetGrazeDays: 3,
    targetRestDays: 30,
    ...over,
  };
}

function phase(
  over: Partial<BuildPhase> & { id: string; order: number; name: string },
): BuildPhase {
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

function manualItem(over: Partial<WorkItem> & { id: string }): WorkItem {
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
    precedesAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
    ...over,
  };
}

const DECLARED_PHASES: BuildPhase[] = [
  phase({ id: 'phase-1', order: 0, name: 'P1' }),
];

describe('rotationMoveProvenanceId', () => {
  it('is the composite "<cellGroup>__<paddockId>__<seq>__<cycle>"', () => {
    expect(rotationMoveProvenanceId('g1', 'pad-a', 0, 0)).toBe(
      'g1__pad-a__0__0',
    );
    expect(rotationMoveProvenanceId('g1', 'pad-a', 2, 1)).toBe(
      'g1__pad-a__2__1',
    );
  });
});

describe('seedRotationSequenceWorkItems', () => {
  it('emits one WorkItem per projected move (single cellGroup, single cycle)', () => {
    const paddocks = [
      paddock({ id: 'pa', name: 'A' }),
      paddock({ id: 'pb', name: 'B' }),
    ];
    const plan: RotationPlan = {
      projectId: 'p1',
      cells: [
        cell({ paddockId: 'pa', cellGroup: 'g1', sequenceOrder: 0, targetGrazeDays: 3 }),
        cell({ paddockId: 'pb', cellGroup: 'g1', sequenceOrder: 1, targetGrazeDays: 4 }),
      ],
    };
    const items = seedRotationSequenceWorkItems({
      projectId: 'p1',
      paddocks,
      plan,
      declaredPhases: DECLARED_PHASES,
      startDateISO: '2026-05-01',
      cycles: 1,
      now: () => '2026-05-20T00:00:00.000Z',
    });
    expect(items).toHaveLength(2);
    expect(items.every((it) => it.source === 'rotation-sequence')).toBe(true);
    expect(items.every((it) => it.overridden === false)).toBe(true);
    expect(items.map((it) => it.id)).toEqual([
      'rs__g1__pa__0__0',
      'rs__g1__pb__1__0',
    ]);
    expect(items[0]?.scheduledStart).toBe('2026-05-01');
    expect(items[0]?.scheduledEnd).toBe('2026-05-04');
    expect(items[1]?.scheduledStart).toBe('2026-05-04');
    expect(items[1]?.scheduledEnd).toBe('2026-05-08');
    expect(items[0]?.title).toBe('Rotation move: A (graze 3d)');
    expect(items[1]?.title).toBe('Rotation move: B (graze 4d)');
  });

  it('multi-cycle: cycleIndex increments per paddock occurrence in cellGroup order', () => {
    const paddocks = [
      paddock({ id: 'pa', name: 'A' }),
      paddock({ id: 'pb', name: 'B' }),
    ];
    const plan: RotationPlan = {
      projectId: 'p1',
      cells: [
        cell({ paddockId: 'pa', cellGroup: 'g1', sequenceOrder: 0 }),
        cell({ paddockId: 'pb', cellGroup: 'g1', sequenceOrder: 1 }),
      ],
    };
    const items = seedRotationSequenceWorkItems({
      projectId: 'p1',
      paddocks,
      plan,
      declaredPhases: DECLARED_PHASES,
      startDateISO: '2026-05-01',
      cycles: 2,
    });
    expect(items.map((it) => it.id)).toEqual([
      'rs__g1__pa__0__0',
      'rs__g1__pb__1__0',
      'rs__g1__pa__0__1',
      'rs__g1__pb__1__1',
    ]);
  });

  it('multi-cellGroup: groups project independently (date cursor + cycleIndex per group)', () => {
    const paddocks = [
      paddock({ id: 'pa', name: 'A' }),
      paddock({ id: 'pc', name: 'C' }),
    ];
    const plan: RotationPlan = {
      projectId: 'p1',
      cells: [
        cell({ paddockId: 'pa', cellGroup: 'north', sequenceOrder: 0 }),
        cell({ paddockId: 'pc', cellGroup: 'south', sequenceOrder: 0 }),
      ],
    };
    const items = seedRotationSequenceWorkItems({
      projectId: 'p1',
      paddocks,
      plan,
      declaredPhases: DECLARED_PHASES,
      startDateISO: '2026-05-01',
      cycles: 1,
    });
    const ids = items.map((it) => it.id).sort();
    expect(ids).toEqual([
      'rs__north__pa__0__0',
      'rs__south__pc__0__0',
    ]);
    // Same startDateISO across groups (independent cursors).
    const north = items.find((it) => it.id === 'rs__north__pa__0__0');
    const south = items.find((it) => it.id === 'rs__south__pc__0__0');
    expect(north?.scheduledStart).toBe('2026-05-01');
    expect(south?.scheduledStart).toBe('2026-05-01');
  });

  it('returns [] when the plan is null, empty, or projectId has no paddocks', () => {
    expect(
      seedRotationSequenceWorkItems({
        projectId: 'p1',
        paddocks: [],
        plan: null,
        declaredPhases: DECLARED_PHASES,
      }),
    ).toEqual([]);
    expect(
      seedRotationSequenceWorkItems({
        projectId: 'p1',
        paddocks: [paddock({ id: 'pa', name: 'A' })],
        plan: { projectId: 'p1', cells: [] },
        declaredPhases: DECLARED_PHASES,
      }),
    ).toEqual([]);
    expect(
      seedRotationSequenceWorkItems({
        projectId: 'p1',
        paddocks: [paddock({ id: 'pa', name: 'A', projectId: 'p2' })],
        plan: {
          projectId: 'p1',
          cells: [cell({ paddockId: 'pa' })],
        },
        declaredPhases: DECLARED_PHASES,
      }),
    ).toEqual([]);
  });

  it('joins Paddock.phase to declared phase by id and by name (case-insensitive)', () => {
    const paddocks = [
      paddock({ id: 'pa', name: 'A', phase: 'phase-1' }),
      paddock({ id: 'pb', name: 'B', phase: 'p1' }),
      paddock({ id: 'pc', name: 'C', phase: 'unknown' }),
    ];
    const plan: RotationPlan = {
      projectId: 'p1',
      cells: [
        cell({ paddockId: 'pa', sequenceOrder: 0 }),
        cell({ paddockId: 'pb', sequenceOrder: 1 }),
        cell({ paddockId: 'pc', sequenceOrder: 2 }),
      ],
    };
    const items = seedRotationSequenceWorkItems({
      projectId: 'p1',
      paddocks,
      plan,
      declaredPhases: DECLARED_PHASES,
      startDateISO: '2026-05-01',
    });
    expect(items[0]?.phaseId).toBe('phase-1');
    expect(items[1]?.phaseId).toBe('phase-1');
    expect(items[2]?.phaseId).toBeNull();
  });

  it('respects plan.startDateISO and plan.horizonCycles defaults', () => {
    const paddocks = [paddock({ id: 'pa', name: 'A' })];
    const plan: RotationPlan = {
      projectId: 'p1',
      cells: [cell({ paddockId: 'pa', sequenceOrder: 0, targetGrazeDays: 2 })],
      startDateISO: '2026-06-15',
      horizonCycles: 2,
    };
    const items = seedRotationSequenceWorkItems({
      projectId: 'p1',
      paddocks,
      plan,
      declaredPhases: DECLARED_PHASES,
    });
    expect(items).toHaveLength(2);
    expect(items[0]?.scheduledStart).toBe('2026-06-15');
    expect(items[1]?.id).toBe('rs__g1__pa__0__1');
  });

  it('attaches the per-move materials kit (salt/mineral/water + fencing) for a stocked paddock', () => {
    const paddocks = [
      paddock({
        id: 'pa',
        name: 'A',
        species: ['cattle'],
        stockingDensity: 2,
        areaM2: 10_000,
      }),
    ];
    const plan: RotationPlan = {
      projectId: 'p1',
      cells: [cell({ paddockId: 'pa', sequenceOrder: 0, targetGrazeDays: 4 })],
    };
    const items = seedRotationSequenceWorkItems({
      projectId: 'p1',
      paddocks,
      plan,
      declaredPhases: DECLARED_PHASES,
      startDateISO: '2026-05-01',
      cycles: 1,
    });
    expect(items).toHaveLength(1);
    const row = items[0]!;
    expect(row.materialsAuto.map((m) => m.label)).toEqual([
      'Free-choice salt',
      'Loose mineral mix',
      'Water haul',
    ]);
    expect(row.equipmentRequiredAuto).toHaveLength(1);
    expect(row.equipmentRequiredAuto[0]).toContain('Portable electric fence');
    // 2.5 AU x 4 graze-days x 45 L/AU/day = 450 L water haul.
    expect(row.materialsAuto[2]?.notes).toContain('450 L total');
    // Per-move totals live in notes; quantityPerAcre stays unset.
    expect(row.materialsAuto.every((m) => m.quantityPerAcre === undefined)).toBe(
      true,
    );
  });

  it('emits only the fencing equipment line (no consumables) for an unstocked paddock', () => {
    const paddocks = [paddock({ id: 'pa', name: 'A' })]; // species [], stockingDensity null
    const plan: RotationPlan = {
      projectId: 'p1',
      cells: [cell({ paddockId: 'pa', sequenceOrder: 0 })],
    };
    const items = seedRotationSequenceWorkItems({
      projectId: 'p1',
      paddocks,
      plan,
      declaredPhases: DECLARED_PHASES,
      startDateISO: '2026-05-01',
    });
    expect(items[0]?.materialsAuto).toEqual([]);
    expect(items[0]?.equipmentRequiredAuto).toHaveLength(1);
  });
});

describe('seedRotationSequenceDependencies', () => {
  it('chains rows within a cellGroup by emission order', () => {
    const rows: WorkItem[] = [
      manualItem({
        id: 'rs__g1__pa__0__0',
        source: 'rotation-sequence',
        generatedFromRotationMove: 'g1__pa__0__0',
      }),
      manualItem({
        id: 'rs__g1__pb__1__0',
        source: 'rotation-sequence',
        generatedFromRotationMove: 'g1__pb__1__0',
      }),
      manualItem({
        id: 'rs__g1__pa__0__1',
        source: 'rotation-sequence',
        generatedFromRotationMove: 'g1__pa__0__1',
      }),
    ];
    const edges = seedRotationSequenceDependencies(rows);
    expect(edges.get('rs__g1__pa__0__0')).toEqual(['rs__g1__pb__1__0']);
    expect(edges.get('rs__g1__pb__1__0')).toEqual(['rs__g1__pa__0__1']);
    // Last row in cellGroup emits no edge.
    expect(edges.has('rs__g1__pa__0__1')).toBe(false);
  });

  it('does NOT chain across cellGroups', () => {
    const rows: WorkItem[] = [
      manualItem({
        id: 'rs__north__pa__0__0',
        source: 'rotation-sequence',
        generatedFromRotationMove: 'north__pa__0__0',
      }),
      manualItem({
        id: 'rs__south__pc__0__0',
        source: 'rotation-sequence',
        generatedFromRotationMove: 'south__pc__0__0',
      }),
    ];
    const edges = seedRotationSequenceDependencies(rows);
    // Single row in each group → no edges.
    expect(edges.size).toBe(0);
  });

  it('ignores non-rotation-sequence rows', () => {
    const rows: WorkItem[] = [
      manualItem({
        id: 'gc1',
        source: 'goal-compass',
      }),
      manualItem({
        id: 'rs__g1__pa__0__0',
        source: 'rotation-sequence',
        generatedFromRotationMove: 'g1__pa__0__0',
      }),
    ];
    const edges = seedRotationSequenceDependencies(rows);
    expect(edges.has('gc1')).toBe(false);
    // Only one rotation-sequence row → no edges.
    expect(edges.size).toBe(0);
  });
});

describe('pushRotationSequenceToSpine — preservation gate', () => {
  beforeEach(() => {
    useLivestockStore.setState({ paddocks: [], fenceLines: [] });
    useRotationPlanStore.setState({ byProject: {} });
    usePhaseStore.setState({ phases: [] });
    useWorkItemStore.setState({ items: [], migratedSources: [] });
  });

  it('preserves manual + goal-compass + overridden rotation-sequence rows; replaces only un-overridden rotation-sequence rows', () => {
    usePhaseStore.setState({
      phases: [phase({ id: 'phase-1', order: 0, name: 'P1' })],
    });
    useLivestockStore.setState({
      paddocks: [paddock({ id: 'pa', name: 'A' })],
      fenceLines: [],
    });
    useRotationPlanStore.setState({
      byProject: {
        p1: {
          projectId: 'p1',
          cells: [cell({ paddockId: 'pa', sequenceOrder: 0 })],
          startDateISO: '2026-05-01',
        },
      },
    });

    const manual = manualItem({ id: 'm1', title: 'manual T' });
    const goalCompass = manualItem({
      id: 'gc1',
      source: 'goal-compass',
      title: 'gc T',
    });
    const overriddenRs = manualItem({
      id: 'rs__stale__paX__0__0',
      source: 'rotation-sequence',
      overridden: true,
      generatedFromRotationMove: 'stale__paX__0__0',
      title: 'overridden rs',
    });
    const staleRs = manualItem({
      id: 'rs__gone__paY__0__0',
      source: 'rotation-sequence',
      overridden: false,
      generatedFromRotationMove: 'gone__paY__0__0',
      title: 'stale rs (engine-owned)',
    });

    useWorkItemStore.setState({
      items: [manual, goalCompass, overriddenRs, staleRs],
      migratedSources: [],
    });

    pushRotationSequenceToSpine('p1');

    const items = useWorkItemStore.getState().items;
    expect(items.find((i) => i.id === 'm1')).toBeDefined();
    expect(items.find((i) => i.id === 'gc1')).toBeDefined();
    expect(items.find((i) => i.id === 'rs__stale__paX__0__0')).toBeDefined();
    expect(items.find((i) => i.id === 'rs__gone__paY__0__0')).toBeUndefined();
    expect(items.find((i) => i.id === 'rs__g1__pa__0__0')).toBeDefined();
    // Overridden rotation-sequence rows keep their own materials — the per-move
    // kit is never re-applied to them.
    const keptOverride = items.find((i) => i.id === 'rs__stale__paX__0__0');
    expect(keptOverride?.materialsAuto).toEqual([]);
    // The engine-owned replacement row still receives the always-on fencing line.
    const fresh = items.find((i) => i.id === 'rs__g1__pa__0__0');
    expect(fresh?.equipmentRequiredAuto).toHaveLength(1);
  });

  it('writes precedesAuto edges only on rotation-sequence rows; cross-source untouched', () => {
    usePhaseStore.setState({
      phases: [phase({ id: 'phase-1', order: 0, name: 'P1' })],
    });
    useLivestockStore.setState({
      paddocks: [
        paddock({ id: 'pa', name: 'A' }),
        paddock({ id: 'pb', name: 'B' }),
      ],
      fenceLines: [],
    });
    useRotationPlanStore.setState({
      byProject: {
        p1: {
          projectId: 'p1',
          cells: [
            cell({ paddockId: 'pa', sequenceOrder: 0 }),
            cell({ paddockId: 'pb', sequenceOrder: 1 }),
          ],
          startDateISO: '2026-05-01',
        },
      },
    });
    useWorkItemStore.setState({
      items: [
        manualItem({
          id: 'gc1',
          source: 'goal-compass',
          dependsOnAuto: ['preexisting'],
        }),
      ],
      migratedSources: [],
    });

    pushRotationSequenceToSpine('p1');

    const first = useWorkItemStore
      .getState()
      .items.find((i) => i.id === 'rs__g1__pa__0__0');
    const second = useWorkItemStore
      .getState()
      .items.find((i) => i.id === 'rs__g1__pb__1__0');
    expect(first?.precedesAuto).toEqual(['rs__g1__pb__1__0']);
    expect(second?.precedesAuto ?? []).toEqual([]);
    // Cross-source untouched.
    const gc = useWorkItemStore.getState().items.find((i) => i.id === 'gc1');
    expect(gc?.dependsOnAuto).toEqual(['preexisting']);
    expect(gc?.precedesAuto ?? []).toEqual([]);
  });

  it('cross-source independence — replaceGoalCompassRows([]) leaves rotation-sequence rows untouched', () => {
    usePhaseStore.setState({
      phases: [phase({ id: 'phase-1', order: 0, name: 'P1' })],
    });
    useLivestockStore.setState({
      paddocks: [paddock({ id: 'pa', name: 'A' })],
      fenceLines: [],
    });
    useRotationPlanStore.setState({
      byProject: {
        p1: {
          projectId: 'p1',
          cells: [cell({ paddockId: 'pa', sequenceOrder: 0 })],
          startDateISO: '2026-05-01',
        },
      },
    });
    useWorkItemStore.setState({ items: [], migratedSources: [] });

    pushRotationSequenceToSpine('p1');
    const before = useWorkItemStore.getState().items.map((i) => i.id).sort();
    useWorkItemStore.getState().replaceGoalCompassRows('p1', []);
    const after = useWorkItemStore.getState().items.map((i) => i.id).sort();
    expect(after).toEqual(before);
  });

  it('idempotent re-push — same plan produces same row set (same ids)', () => {
    usePhaseStore.setState({
      phases: [phase({ id: 'phase-1', order: 0, name: 'P1' })],
    });
    useLivestockStore.setState({
      paddocks: [paddock({ id: 'pa', name: 'A' })],
      fenceLines: [],
    });
    useRotationPlanStore.setState({
      byProject: {
        p1: {
          projectId: 'p1',
          cells: [cell({ paddockId: 'pa', sequenceOrder: 0 })],
          startDateISO: '2026-05-01',
        },
      },
    });
    useWorkItemStore.setState({ items: [], migratedSources: [] });

    pushRotationSequenceToSpine('p1');
    const idsA = useWorkItemStore.getState().items.map((i) => i.id).sort();
    pushRotationSequenceToSpine('p1');
    const idsB = useWorkItemStore.getState().items.map((i) => i.id).sort();
    expect(idsB).toEqual(idsA);
  });
});
