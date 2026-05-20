// @vitest-environment happy-dom
/**
 * workItemStore migration + supersede contracts (Sub-project D0).
 *
 *  - per-source field mapping over real legacy fixtures (all 5 sources);
 *  - idempotence: a second run maps nothing new, no duplicate ids;
 *  - legacy stores left intact (rollback safety);
 *  - the Goal-Compass override-preservation contract on the spine:
 *    regenerate replaces only generated rows, keeps overridden + manual
 *    + every non-goal-compass source;
 *  - the planting-calendar wholesale-regen contract.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { usePhaseStore } from '../phaseStore.js';
import { useFieldTaskStore } from '../fieldTaskStore.js';
import { useMaintenanceStore } from '../maintenanceStore.js';
import { useScheduledLivestockMoveStore } from '../scheduledLivestockMoveStore.js';
import { useNurseryStore } from '../nurseryStore.js';
import { runWorkItemMigration } from '../workItemStore.migration.js';
import { useWorkItemStore } from '../workItemStore.js';
import type { WorkItem } from '@ogden/shared';

function resetAll() {
  if (typeof localStorage !== 'undefined') localStorage.clear();
  usePhaseStore.setState({ phases: [], activeFilter: 'all' });
  useFieldTaskStore.setState({ tasks: [] });
  useMaintenanceStore.setState({ tasks: [] });
  useScheduledLivestockMoveStore.setState({ plans: [] });
  useNurseryStore.setState({ batches: [], transfers: [] });
  useWorkItemStore.setState({ items: [], migratedSources: [] });
}

describe('runWorkItemMigration — per-source field mapping', () => {
  beforeEach(resetAll);

  it('maps phaseStore tasks with the generated/overridden/manual contract', () => {
    usePhaseStore.setState({
      phases: [
        {
          id: 'ph1',
          projectId: 'p1',
          name: 'Phase 1',
          timeframe: 'Year 0-1',
          order: 1,
          description: '',
          color: '#888',
          completed: false,
          notes: '',
          completedAt: null,
          generatedFromGoalCompass: true,
          tasks: [
            { id: 'gen1', season: 'spring', title: 'Generated', laborHrs: 4, costUSD: 100, status: 'generated', generatedFromIntervention: 'compost' },
            { id: 'ovr1', season: 'fall', title: 'Overridden', laborHrs: 2, costUSD: 50, status: 'overridden' },
            { id: 'man1', season: 'summer', title: 'User authored', laborHrs: 1, costUSD: 0, done: true, doneAt: '2026-05-01T00:00:00.000Z' },
          ],
        },
      ],
    });

    const res = runWorkItemMigration([], []);
    expect(res).not.toBeNull();
    const get = (id: string): WorkItem => {
      const found = res!.items.find((i) => i.id === id);
      if (!found) throw new Error(`no WorkItem ${id}`);
      return found;
    };

    expect(get('gen1').source).toBe('goal-compass');
    expect(get('gen1').overridden).toBe(false);
    expect(get('gen1').generatedFromInterventionId).toBe('compost');
    expect(get('gen1').phaseId).toBe('ph1');
    expect(get('gen1').status).toBe('todo');

    expect(get('ovr1').source).toBe('goal-compass');
    expect(get('ovr1').overridden).toBe(true);

    expect(get('man1').source).toBe('manual');
    expect(get('man1').overridden).toBe(true);
    expect(get('man1').status).toBe('done');
    expect(get('man1').doneAt).toBe('2026-05-01T00:00:00.000Z');
  });

  it('maps fieldTasks (dueAt→scheduledEnd, status carried, manual)', () => {
    useFieldTaskStore.setState({
      tasks: [
        {
          id: 'ft1', projectId: 'p1', title: 'Fix fence', category: 'ops',
          dueAt: '2026-06-01T00:00:00.000Z', priority: 'high', status: 'in-progress',
          notes: 'n', location: [1, 2], createdAt: 'c', updatedAt: 'u',
        },
      ],
    });
    const wi = runWorkItemMigration([], [])!.items.find((i) => i.id === 'ft1')!;
    expect(wi.source).toBe('field-task');
    expect(wi.overridden).toBe(true);
    expect(wi.scheduledEnd).toBe('2026-06-01T00:00:00.000Z');
    expect(wi.priority).toBe('high');
    expect(wi.category).toBe('ops');
    expect(wi.location).toEqual([1, 2]);
    expect(wi.status).toBe('in-progress');
  });

  it('maps maintenance (cadence→recurrence, lastDoneAt→done)', () => {
    useMaintenanceStore.setState({
      tasks: [
        { id: 'm1', projectId: 'p1', title: 'Prune', cadence: 'annual', season: 'winter', linkedFeatureId: 'zone-9', notes: 'x', lastDoneAt: '2026-01-01T00:00:00.000Z' },
        { id: 'm2', projectId: 'p1', title: 'Mow', cadence: 'weekly' },
      ],
    });
    const items = runWorkItemMigration([], [])!.items;
    const m1 = items.find((i) => i.id === 'm1')!;
    expect(m1.source).toBe('maintenance');
    expect(m1.isRecurring).toBe(true);
    expect(m1.recurrenceFrequency).toBe('annual');
    expect(m1.linkedFeatureId).toBe('zone-9');
    expect(m1.status).toBe('done');
    expect(m1.doneAt).toBe('2026-01-01T00:00:00.000Z');
    expect(items.find((i) => i.id === 'm2')!.status).toBe('todo');
  });

  it('maps scheduled livestock moves (plannedDate→scheduledEnd, target)', () => {
    useScheduledLivestockMoveStore.setState({
      plans: [
        { id: 'slvm1', projectId: 'p1', toPaddockId: 'pad-2', fromPaddockId: 'pad-1', plannedDate: '2026-07-01', direction: 'move_in', species: 'cattle', headCount: 12, who: 'me', notes: '', createdAt: 'c' },
      ],
    });
    const wi = runWorkItemMigration([], [])!.items.find((i) => i.id === 'slvm1')!;
    expect(wi.source).toBe('scheduled-livestock-move');
    expect(wi.scheduledEnd).toBe('2026-07-01');
    expect(wi.target).toEqual({ kind: 'paddock', fromId: 'pad-1', toId: 'pad-2' });
    expect(wi.species).toBe('cattle');
    expect(wi.headCount).toBe(12);
    expect(wi.status).toBe('todo');
  });

  it('maps nursery batches; planting-calendar batches are not overridden', () => {
    useNurseryStore.setState({
      batches: [
        { id: 'b1', projectId: 'p1', species: 'oak', method: 'seed', quantity: 50, stage: 'seedling', sowDate: '2026-03-01', expectedReadyDate: '2026-09-01', destinationZoneId: 'z1', seedSaving: true, notes: '', createdAt: 'c', updatedAt: 'u' },
        { id: 'b2', projectId: 'p1', species: 'apple', method: 'graft', quantity: 10, stage: 'ready_to_plant', sowDate: '2026-02-01', expectedReadyDate: '2026-08-01', destinationZoneId: null, seedSaving: false, notes: '', createdAt: 'c', updatedAt: 'u', generatedFromPlantingCalendar: 'apple:ca1:2026' },
      ],
      transfers: [],
    });
    const items = runWorkItemMigration([], [])!.items;
    const b1 = items.find((i) => i.id === 'b1')!;
    expect(b1.source).toBe('nursery-batch');
    expect(b1.overridden).toBe(true);
    expect(b1.scheduledStart).toBe('2026-03-01');
    expect(b1.scheduledEnd).toBe('2026-09-01');
    expect(b1.propagationMethod).toBe('seed');
    expect(b1.linkedFeatureId).toBe('z1');
    expect(b1.seedSaving).toBe(true);
    const b2 = items.find((i) => i.id === 'b2')!;
    expect(b2.overridden).toBe(false);
    expect(b2.seedSaving).toBe(false);
    expect(b2.generatedFromPlantingCalendar).toBe('apple:ca1:2026');
    expect(b2.status).toBe('done');
  });
});

describe('runWorkItemMigration — idempotence + legacy intactness', () => {
  beforeEach(resetAll);

  it('second run maps nothing new and never duplicates an id', () => {
    useFieldTaskStore.setState({
      tasks: [{ id: 'ft1', projectId: 'p1', title: 't', category: 'ops', dueAt: 'd', priority: 'low', status: 'todo', notes: '', createdAt: 'c', updatedAt: 'u' }],
    });
    const first = runWorkItemMigration([], [])!;
    expect(first.items).toHaveLength(1);

    const second = runWorkItemMigration(first.items, first.migratedSources);
    expect(second).toBeNull(); // all sources already migrated
  });

  it('leaves the legacy stores untouched (rollback safety)', () => {
    useFieldTaskStore.setState({
      tasks: [{ id: 'ft1', projectId: 'p1', title: 't', category: 'ops', dueAt: 'd', priority: 'low', status: 'todo', notes: '', createdAt: 'c', updatedAt: 'u' }],
    });
    runWorkItemMigration([], []);
    expect(useFieldTaskStore.getState().tasks).toHaveLength(1);
    expect(useFieldTaskStore.getState().tasks[0]!.id).toBe('ft1');
  });
});

describe('workItemStore — Goal-Compass override-preservation contract', () => {
  beforeEach(resetAll);

  function wi(id: string, extra: Partial<WorkItem> = {}): WorkItem {
    return {
      id, projectId: 'p1', source: 'goal-compass', overridden: false,
      title: id, phaseId: 'ph1', status: 'todo', dependsOn: [], dependsOnAuto: [],
      precedesAuto: [], materialsAuto: [], equipmentRequiredAuto: [],
      createdAt: 'c', updatedAt: 'u', ...extra,
    };
  }

  it('regenerate replaces generated, preserves overridden + manual + other sources', () => {
    useWorkItemStore.setState({
      items: [
        wi('gen-old'),
        wi('ovr1', { overridden: true }),
        wi('man1', { source: 'manual', overridden: true }),
        wi('field1', { source: 'field-task', overridden: true }),
      ],
      migratedSources: [],
    });

    useWorkItemStore.getState().replaceGoalCompassRows('p1', [wi('gen-new')]);
    const ids = useWorkItemStore.getState().items.map((i) => i.id).sort();

    expect(ids).toEqual(['field1', 'gen-new', 'man1', 'ovr1']);
  });

  it('does not touch another project on regenerate', () => {
    useWorkItemStore.setState({
      items: [wi('gen-old'), wi('other', { projectId: 'p2' })],
      migratedSources: [],
    });
    useWorkItemStore.getState().replaceGoalCompassRows('p1', [wi('gen-new')]);
    expect(useWorkItemStore.getState().items.some((i) => i.id === 'other')).toBe(true);
  });

  it('planting-calendar regen replaces only generatedFromPlantingCalendar batches', () => {
    useWorkItemStore.setState({
      items: [
        wi('pc-old', { source: 'nursery-batch', overridden: false, generatedFromPlantingCalendar: 'x:1:2026' }),
        wi('manual-batch', { source: 'nursery-batch', overridden: true }),
      ],
      migratedSources: [],
    });
    useWorkItemStore.getState().replacePlantingCalendarBatches('p1', [
      wi('pc-new', { source: 'nursery-batch', overridden: false, generatedFromPlantingCalendar: 'x:1:2027' }),
    ]);
    const ids = useWorkItemStore.getState().items.map((i) => i.id).sort();
    expect(ids).toEqual(['manual-batch', 'pc-new']);
  });
});
