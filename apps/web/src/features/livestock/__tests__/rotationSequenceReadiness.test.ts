/**
 * @vitest-environment happy-dom
 *
 * rotationSequenceReadiness — pure spine-presence + moves-completed
 * evaluators (B3.x promotion-criteria wiring).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { WorkItem } from '@ogden/shared';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import type { BuildPhase } from '../../../store/phaseStore.js';
import type { Paddock } from '../../../store/livestockStore.js';
import type {
  RotationCell,
  RotationPlan,
} from '../rotationSequenceMath.js';
import {
  computeRotationMovesCompletedPct,
  computeRotationSpinePresencePct,
} from '../rotationSequenceReadiness.js';

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

function cell(
  over: Partial<RotationCell> & { paddockId: string },
): RotationCell {
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

function rsItem(over: Partial<WorkItem> & { id: string }): WorkItem {
  return {
    projectId: 'p1',
    source: 'rotation-sequence',
    overridden: false,
    createdAt: '2026-05-20T00:00:00.000Z',
    updatedAt: '2026-05-20T00:00:00.000Z',
    title: 'Rotation move',
    phaseId: 'phase-1',
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

beforeEach(() => {
  useWorkItemStore.setState({ items: [], migratedSources: [] });
});

describe('computeRotationSpinePresencePct', () => {
  it('returns 100 when the plan is null (nothing expected)', () => {
    const pct = computeRotationSpinePresencePct({
      projectId: 'p1',
      paddocks: [paddock({ id: 'pa', name: 'A' })],
      plan: null,
      declaredPhases: DECLARED_PHASES,
    });
    expect(pct).toBe(100);
  });

  it('returns 100 when the plan has zero cells', () => {
    const pct = computeRotationSpinePresencePct({
      projectId: 'p1',
      paddocks: [paddock({ id: 'pa', name: 'A' })],
      plan: { projectId: 'p1', cells: [] },
      declaredPhases: DECLARED_PHASES,
    });
    expect(pct).toBe(100);
  });

  it('returns 0 when no rotation-sequence rows present on the spine', () => {
    const plan: RotationPlan = {
      projectId: 'p1',
      cells: [
        cell({ paddockId: 'pa', sequenceOrder: 0 }),
        cell({ paddockId: 'pb', sequenceOrder: 1 }),
      ],
      startDateISO: '2026-05-01',
    };
    const pct = computeRotationSpinePresencePct({
      projectId: 'p1',
      paddocks: [
        paddock({ id: 'pa', name: 'A' }),
        paddock({ id: 'pb', name: 'B' }),
      ],
      plan,
      declaredPhases: DECLARED_PHASES,
    });
    expect(pct).toBe(0);
  });

  it('returns 100 when every expected provenance is present on the spine', () => {
    const plan: RotationPlan = {
      projectId: 'p1',
      cells: [
        cell({ paddockId: 'pa', sequenceOrder: 0 }),
        cell({ paddockId: 'pb', sequenceOrder: 1 }),
      ],
      startDateISO: '2026-05-01',
    };
    useWorkItemStore.setState({
      items: [
        rsItem({
          id: 'rs__g1__pa__0__0',
          generatedFromRotationMove: 'g1__pa__0__0',
        }),
        rsItem({
          id: 'rs__g1__pb__1__0',
          generatedFromRotationMove: 'g1__pb__1__0',
        }),
      ],
      migratedSources: [],
    });
    const pct = computeRotationSpinePresencePct({
      projectId: 'p1',
      paddocks: [
        paddock({ id: 'pa', name: 'A' }),
        paddock({ id: 'pb', name: 'B' }),
      ],
      plan,
      declaredPhases: DECLARED_PHASES,
    });
    expect(pct).toBe(100);
  });

  it('returns 50 when half of the expected provenances are present', () => {
    const plan: RotationPlan = {
      projectId: 'p1',
      cells: [
        cell({ paddockId: 'pa', sequenceOrder: 0 }),
        cell({ paddockId: 'pb', sequenceOrder: 1 }),
      ],
      startDateISO: '2026-05-01',
    };
    useWorkItemStore.setState({
      items: [
        rsItem({
          id: 'rs__g1__pa__0__0',
          generatedFromRotationMove: 'g1__pa__0__0',
        }),
      ],
      migratedSources: [],
    });
    const pct = computeRotationSpinePresencePct({
      projectId: 'p1',
      paddocks: [
        paddock({ id: 'pa', name: 'A' }),
        paddock({ id: 'pb', name: 'B' }),
      ],
      plan,
      declaredPhases: DECLARED_PHASES,
    });
    expect(pct).toBe(50);
  });

  it('counts overridden rotation-sequence rows as present (steward still owns the move)', () => {
    const plan: RotationPlan = {
      projectId: 'p1',
      cells: [cell({ paddockId: 'pa', sequenceOrder: 0 })],
      startDateISO: '2026-05-01',
    };
    useWorkItemStore.setState({
      items: [
        rsItem({
          id: 'rs__g1__pa__0__0',
          generatedFromRotationMove: 'g1__pa__0__0',
          overridden: true,
        }),
      ],
      migratedSources: [],
    });
    const pct = computeRotationSpinePresencePct({
      projectId: 'p1',
      paddocks: [paddock({ id: 'pa', name: 'A' })],
      plan,
      declaredPhases: DECLARED_PHASES,
    });
    expect(pct).toBe(100);
  });

  it('ignores cross-project rotation-sequence rows (project isolation)', () => {
    const plan: RotationPlan = {
      projectId: 'p1',
      cells: [cell({ paddockId: 'pa', sequenceOrder: 0 })],
      startDateISO: '2026-05-01',
    };
    useWorkItemStore.setState({
      items: [
        rsItem({
          id: 'rs__g1__pa__0__0',
          projectId: 'p2',
          generatedFromRotationMove: 'g1__pa__0__0',
        }),
      ],
      migratedSources: [],
    });
    const pct = computeRotationSpinePresencePct({
      projectId: 'p1',
      paddocks: [paddock({ id: 'pa', name: 'A' })],
      plan,
      declaredPhases: DECLARED_PHASES,
    });
    expect(pct).toBe(0);
  });

  it('ignores non-rotation-sequence rows even when ids collide', () => {
    const plan: RotationPlan = {
      projectId: 'p1',
      cells: [cell({ paddockId: 'pa', sequenceOrder: 0 })],
      startDateISO: '2026-05-01',
    };
    useWorkItemStore.setState({
      items: [
        rsItem({
          id: 'rs__g1__pa__0__0',
          source: 'manual',
          generatedFromRotationMove: 'g1__pa__0__0',
        }),
      ],
      migratedSources: [],
    });
    const pct = computeRotationSpinePresencePct({
      projectId: 'p1',
      paddocks: [paddock({ id: 'pa', name: 'A' })],
      plan,
      declaredPhases: DECLARED_PHASES,
    });
    expect(pct).toBe(0);
  });
});

describe('computeRotationMovesCompletedPct', () => {
  it('returns 100 when no rotation-sequence rows exist', () => {
    const pct = computeRotationMovesCompletedPct({
      projectId: 'p1',
      todayISO: '2026-05-20',
    });
    expect(pct).toBe(100);
  });

  it('returns 100 when no rows are past-due (nothing yet due)', () => {
    useWorkItemStore.setState({
      items: [
        rsItem({
          id: 'rs__g1__pa__0__0',
          scheduledStart: '2026-06-01',
          scheduledEnd: '2026-06-04',
        }),
      ],
      migratedSources: [],
    });
    const pct = computeRotationMovesCompletedPct({
      projectId: 'p1',
      todayISO: '2026-05-20',
    });
    expect(pct).toBe(100);
  });

  it('returns 0 when every past-due row is still todo', () => {
    useWorkItemStore.setState({
      items: [
        rsItem({
          id: 'rs__g1__pa__0__0',
          scheduledStart: '2026-05-01',
          scheduledEnd: '2026-05-04',
        }),
        rsItem({
          id: 'rs__g1__pb__1__0',
          scheduledStart: '2026-05-04',
          scheduledEnd: '2026-05-08',
        }),
      ],
      migratedSources: [],
    });
    const pct = computeRotationMovesCompletedPct({
      projectId: 'p1',
      todayISO: '2026-05-20',
    });
    expect(pct).toBe(0);
  });

  it('returns 50 when half of past-due rows are done', () => {
    useWorkItemStore.setState({
      items: [
        rsItem({
          id: 'rs__g1__pa__0__0',
          scheduledStart: '2026-05-01',
          scheduledEnd: '2026-05-04',
          status: 'done',
          doneAt: '2026-05-04T12:00:00.000Z',
        }),
        rsItem({
          id: 'rs__g1__pb__1__0',
          scheduledStart: '2026-05-04',
          scheduledEnd: '2026-05-08',
        }),
      ],
      migratedSources: [],
    });
    const pct = computeRotationMovesCompletedPct({
      projectId: 'p1',
      todayISO: '2026-05-20',
    });
    expect(pct).toBe(50);
  });

  it('only counts past-due rows in the denominator (future rows excluded)', () => {
    useWorkItemStore.setState({
      items: [
        rsItem({
          id: 'rs__g1__pa__0__0',
          scheduledStart: '2026-05-01',
          scheduledEnd: '2026-05-04',
          status: 'done',
          doneAt: '2026-05-04T12:00:00.000Z',
        }),
        rsItem({
          id: 'rs__g1__pb__1__0',
          scheduledStart: '2026-06-01',
          scheduledEnd: '2026-06-04',
        }),
      ],
      migratedSources: [],
    });
    const pct = computeRotationMovesCompletedPct({
      projectId: 'p1',
      todayISO: '2026-05-20',
    });
    expect(pct).toBe(100);
  });

  it('ignores cross-project rotation-sequence rows (project isolation)', () => {
    useWorkItemStore.setState({
      items: [
        rsItem({
          id: 'rs__g1__pa__0__0',
          projectId: 'p2',
          scheduledStart: '2026-05-01',
          scheduledEnd: '2026-05-04',
        }),
      ],
      migratedSources: [],
    });
    const pct = computeRotationMovesCompletedPct({
      projectId: 'p1',
      todayISO: '2026-05-20',
    });
    expect(pct).toBe(100);
  });

  it('ignores non-rotation-sequence rows in the denominator', () => {
    useWorkItemStore.setState({
      items: [
        rsItem({
          id: 'gc__1',
          source: 'goal-compass',
          scheduledStart: '2026-05-01',
          scheduledEnd: '2026-05-04',
        }),
      ],
      migratedSources: [],
    });
    const pct = computeRotationMovesCompletedPct({
      projectId: 'p1',
      todayISO: '2026-05-20',
    });
    expect(pct).toBe(100);
  });

  it('counts overridden rotation-sequence rows in the denominator (override does not erase the schedule)', () => {
    useWorkItemStore.setState({
      items: [
        rsItem({
          id: 'rs__g1__pa__0__0',
          overridden: true,
          scheduledStart: '2026-05-01',
          scheduledEnd: '2026-05-04',
        }),
      ],
      migratedSources: [],
    });
    const pct = computeRotationMovesCompletedPct({
      projectId: 'p1',
      todayISO: '2026-05-20',
    });
    expect(pct).toBe(0);
  });

  it('status flips on existing rows are reflected without re-seed', () => {
    useWorkItemStore.setState({
      items: [
        rsItem({
          id: 'rs__g1__pa__0__0',
          scheduledStart: '2026-05-01',
          scheduledEnd: '2026-05-04',
        }),
      ],
      migratedSources: [],
    });
    expect(
      computeRotationMovesCompletedPct({
        projectId: 'p1',
        todayISO: '2026-05-20',
      }),
    ).toBe(0);
    useWorkItemStore.setState({
      items: [
        rsItem({
          id: 'rs__g1__pa__0__0',
          scheduledStart: '2026-05-01',
          scheduledEnd: '2026-05-04',
          status: 'done',
          doneAt: '2026-05-04T12:00:00.000Z',
        }),
      ],
      migratedSources: [],
    });
    expect(
      computeRotationMovesCompletedPct({
        projectId: 'p1',
        todayISO: '2026-05-20',
      }),
    ).toBe(100);
  });
});
