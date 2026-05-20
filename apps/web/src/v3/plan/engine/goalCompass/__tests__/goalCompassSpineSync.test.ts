// @vitest-environment happy-dom
/**
 * Phase-4 regression gates (Sub-project D0):
 *
 *  - the Goal-Compass regeneration seam (`pushGoalCompassToSpine`) replaces
 *    engine-generated rows but preserves a steward-overridden spine row and
 *    manual rows — the hard gate, exercised end-to-end through the real
 *    pure converter (not the store action in isolation);
 *  - the planting-calendar seam (`pushPlantingCalendarToSpine`) wholesale-
 *    replaces `generatedFromPlantingCalendar` nursery rows, leaving a
 *    user-authored batch row untouched;
 *  - the scheduled→actual livestock fulfilment link: `markFulfilled`
 *    stamps the matched actual move with the WorkItem id it completes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkItemStore } from '../../../../../store/workItemStore.js';
import { useScheduledLivestockMoveStore } from '../../../../../store/scheduledLivestockMoveStore.js';
import { useLivestockMoveLogStore } from '../../../../../store/livestockMoveLogStore.js';
import {
  pushGoalCompassToSpine,
  pushPlantingCalendarToSpine,
} from '../goalCompassSpineSync.js';
import type { BuildPhase, PhaseTask } from '../../../../../store/phaseStore.js';
import type { ScheduledTaskOutput } from '../scheduleTasksToCalendar.js';
import type { PropagationBatch } from '../../../../../store/nurseryStore.js';
import type { WorkItem } from '@ogden/shared';

function reset() {
  if (typeof localStorage !== 'undefined') localStorage.clear();
  useWorkItemStore.setState({ items: [], migratedSources: [] });
  useScheduledLivestockMoveStore.setState({ plans: [] });
  useLivestockMoveLogStore.setState({ events: [] });
}

const phase: BuildPhase = {
  id: 'ph1',
  projectId: 'p1',
  name: 'Water',
  timeframe: 'Year 0',
  order: 1,
  description: '',
  color: '#000',
  completed: false,
  notes: '',
  completedAt: null,
  generatedFromGoalCompass: true,
};

function genTask(id: string): ScheduledTaskOutput {
  const task: PhaseTask = {
    id,
    season: 'spring',
    title: id,
    laborHrs: 8,
    costUSD: 100,
    status: 'generated',
    scheduledStart: '2026-03-01',
    scheduledEnd: '2026-03-02',
  };
  return { phaseId: 'ph1', task };
}

describe('pushGoalCompassToSpine — override-preservation hard gate', () => {
  beforeEach(reset);

  it('replaces generated rows, preserves a steward-overridden + manual row', () => {
    // First generation seeds two generated rows.
    pushGoalCompassToSpine('p1', [phase], [genTask('gc-task-a'), genTask('gc-task-b')]);
    expect(useWorkItemStore.getState().items.map((i) => i.id).sort()).toEqual([
      'gc-task-a',
      'gc-task-b',
    ]);

    // Steward overrides one row; a manual row is added out-of-band.
    useWorkItemStore.getState().updateItem('gc-task-a', { overridden: true, title: 'hand-edited' });
    useWorkItemStore.getState().addItem({
      id: 'manual-1',
      projectId: 'p1',
      source: 'manual',
      overridden: true,
      title: 'manual task',
      phaseId: null,
      status: 'todo',
      dependsOn: [],
      dependsOnAuto: [],
      precedesAuto: [],
      materialsAuto: [],
      equipmentRequiredAuto: [],
      createdAt: 'c',
      updatedAt: 'u',
    });

    // Regenerate: gc-task-b (generated) is replaced; the overridden
    // gc-task-a and manual-1 survive untouched.
    pushGoalCompassToSpine('p1', [phase], [genTask('gc-task-b'), genTask('gc-task-c')]);

    const byId = new Map(useWorkItemStore.getState().items.map((i) => [i.id, i]));
    expect([...byId.keys()].sort()).toEqual([
      'gc-task-a',
      'gc-task-b',
      'gc-task-c',
      'manual-1',
    ]);
    expect(byId.get('gc-task-a')!.title).toBe('hand-edited');
    expect(byId.get('gc-task-a')!.overridden).toBe(true);
    expect(byId.get('manual-1')!.source).toBe('manual');
  });
});

describe('pushPlantingCalendarToSpine — wholesale-regen contract', () => {
  beforeEach(reset);

  function batch(id: string, gen?: string): PropagationBatch {
    return {
      id,
      projectId: 'p1',
      species: 'oak',
      method: 'seed',
      quantity: 10,
      stage: 'seedling',
      sowDate: '2026-03-01',
      expectedReadyDate: '2026-09-01',
      destinationZoneId: null,
      seedSaving: false,
      notes: '',
      createdAt: 'c',
      updatedAt: 'u',
      generatedFromPlantingCalendar: gen,
    };
  }

  it('replaces only generatedFromPlantingCalendar rows, keeps a manual batch', () => {
    pushPlantingCalendarToSpine('p1', [batch('pc-old', 'oak:ca1:2026')]);
    const manual: WorkItem = {
      id: 'manual-batch',
      projectId: 'p1',
      source: 'nursery-batch',
      overridden: true,
      title: 'manual batch',
      phaseId: null,
      status: 'todo',
      dependsOn: [],
      dependsOnAuto: [],
      precedesAuto: [],
      materialsAuto: [],
      equipmentRequiredAuto: [],
      createdAt: 'c',
      updatedAt: 'u',
    };
    useWorkItemStore.getState().addItem(manual);

    pushPlantingCalendarToSpine('p1', [batch('pc-new', 'oak:ca1:2027')]);

    expect(useWorkItemStore.getState().items.map((i) => i.id).sort()).toEqual([
      'manual-batch',
      'pc-new',
    ]);
  });
});

describe('scheduled→actual livestock fulfilment link', () => {
  beforeEach(reset);

  it('markFulfilled stamps the matched actual move with the WorkItem id', () => {
    useScheduledLivestockMoveStore.getState().addPlan({
      id: 'slvm-1',
      projectId: 'p1',
      toPaddockId: 'pad-2',
      plannedDate: '2026-07-01',
      direction: 'move_in',
      species: 'cattle',
      headCount: 12,
      createdAt: 'c',
    });
    useLivestockMoveLogStore.getState().addEvent({
      id: 'lvm-1',
      projectId: 'p1',
      toPaddockId: 'pad-2',
      date: '2026-07-02',
      direction: 'move_in',
      species: 'cattle',
      headCount: 12,
    });

    useScheduledLivestockMoveStore.getState().markFulfilled('slvm-1', 'lvm-1');

    const plan = useScheduledLivestockMoveStore.getState().plans[0]!;
    const event = useLivestockMoveLogStore.getState().events[0]!;
    expect(plan.fulfilledByEventId).toBe('lvm-1');
    // The scheduled-move id is carried verbatim as the WorkItem id by the
    // migration (source 'scheduled-livestock-move'), so this is the
    // proof-of-completion back-link.
    expect(event.workItemId).toBe('slvm-1');
  });
});
