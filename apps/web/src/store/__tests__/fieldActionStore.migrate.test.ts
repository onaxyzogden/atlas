// @vitest-environment happy-dom
/**
 * fieldActionStore — ADR 2 / ADR 7 Phase 0 persistence migration tests.
 *
 * Covers:
 *   1. remapTaskType: legacy 2-value -> 4-value taxonomy (idempotent).
 *   2. migratePersisted (v1->v2): taskType remap + observedAt /
 *      sourceObjectiveType backfill; cycleId deliberately left undefined for
 *      the cross-store fold; v2+ input returned unchanged.
 *   3. backfillCycleIds: undefined cycleId -> project current cycle; defined
 *      ids untouched; no-op returns the same list reference (idempotent).
 *   4. Lifecycle: a real v1 blob + observeCycleStore slice rehydrate to a
 *      record carrying field_survey + project-max cycleId + observedAt, and a
 *      second rehydrate does not change it. Mirrors closedLoopStore.test.ts.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useFieldActionStore,
  remapTaskType,
  migratePersisted,
  backfillCycleIds,
} from '../fieldActionStore.js';
import type { FieldAction } from '@ogden/shared';

const FIELD_ACTIONS_KEY = 'ogden-field-actions';
const OBSERVE_CYCLES_KEY = 'ogden-observe-cycles';

type LooseByProject = Record<string, Array<Record<string, unknown>>>;

function reset(): void {
  useFieldActionStore.setState({ byProject: {} });
  window.localStorage.clear();
}

describe('remapTaskType', () => {
  it('maps the legacy tokens and passes new ones through', () => {
    expect(remapTaskType('survey')).toBe('field_survey');
    expect(remapTaskType('implementation')).toBe('implementation_task');
    expect(remapTaskType('field_survey')).toBe('field_survey');
    expect(remapTaskType('monitoring_task')).toBe('monitoring_task');
  });

  it('falls back to administrative_task for unknown/empty values', () => {
    expect(remapTaskType(undefined)).toBe('administrative_task');
    expect(remapTaskType('garbage')).toBe('administrative_task');
  });
});

describe('migratePersisted (v1 -> v2)', () => {
  it('remaps taskType and backfills observedAt + sourceObjectiveType, leaving cycleId for the fold', () => {
    const v1 = {
      byProject: {
        'p-1': [
          {
            id: 'a1',
            taskType: 'survey',
            status: 'not_started',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-02-01T00:00:00.000Z',
          },
          {
            id: 'a2',
            taskType: 'implementation',
            status: 'verified',
            createdAt: '2026-01-03T00:00:00.000Z',
            updatedAt: '2026-01-03T00:00:00.000Z',
          },
        ],
      },
    };
    const out = migratePersisted(v1, 1) as unknown as {
      byProject: LooseByProject;
    };
    const list = out.byProject['p-1']!;
    expect(list[0]!.taskType).toBe('field_survey');
    expect(list[1]!.taskType).toBe('implementation_task');
    expect(list[0]!.observedAt).toBe('2026-02-01T00:00:00.000Z'); // = updatedAt
    expect(list[0]!.sourceObjectiveType).toBeNull();
    expect(list[0]!.cycleId).toBeUndefined(); // resolved by onRehydrateStorage
  });

  it('returns v2+ input unchanged (idempotent) and tolerates garbage', () => {
    const v2 = {
      byProject: { p: [{ id: 'a', taskType: 'field_survey', cycleId: 2 }] },
    };
    const out = migratePersisted(v2, 2) as unknown as {
      byProject: LooseByProject;
    };
    expect(out.byProject.p![0]!.cycleId).toBe(2);
    expect(out.byProject.p![0]!.taskType).toBe('field_survey');

    const fromNull = migratePersisted(null, 1) as unknown as {
      byProject: LooseByProject;
    };
    expect(fromNull.byProject).toEqual({});
  });
});

describe('backfillCycleIds', () => {
  it('resolves undefined cycleId to the project current cycle, leaving defined ones', () => {
    const input: Record<string, FieldAction[]> = {
      adv: [
        { id: 'x' } as unknown as FieldAction,
        { id: 'y', cycleId: 2 } as unknown as FieldAction,
      ],
      fresh: [{ id: 'z' } as unknown as FieldAction],
    };
    const { byProject, changed } = backfillCycleIds(input, { adv: 3 });
    expect(changed).toBe(true);
    expect((byProject.adv![0]! as { cycleId: unknown }).cycleId).toBe(3);
    expect((byProject.adv![1]! as { cycleId: unknown }).cycleId).toBe(2);
    expect((byProject.fresh![0]! as { cycleId: unknown }).cycleId).toBe(0); // no entry -> 0
  });

  it('is a no-op (same list reference) when every record already has a cycleId', () => {
    const list = [{ id: 'a', cycleId: 1 } as unknown as FieldAction];
    const input: Record<string, FieldAction[]> = { p: list };
    const { byProject, changed } = backfillCycleIds(input, { p: 5 });
    expect(changed).toBe(false);
    expect(byProject.p).toBe(list);
  });
});

describe('persist lifecycle: v1 blob + observeCycleStore slice -> rehydrate', () => {
  beforeEach(() => reset());

  function seedV1(): void {
    window.localStorage.setItem(
      OBSERVE_CYCLES_KEY,
      JSON.stringify({
        state: {
          byProject: {
            'p-1': {
              water_flow: { currentCycleId: 3, history: [] },
              soil_fertility: { currentCycleId: 1, history: [] },
            },
          },
        },
        version: 1,
      }),
    );
    window.localStorage.setItem(
      FIELD_ACTIONS_KEY,
      JSON.stringify({
        state: {
          byProject: {
            'p-1': [
              {
                id: 'fa-legacy',
                projectId: 'p-1',
                planObjectiveId: 'obj-1',
                tierId: 't0',
                title: 'Walk perimeter',
                taskType: 'survey',
                status: 'not_started',
                proofSchemaId: 'generic-fallback',
                proofItems: [],
                verificationMode: 'self',
                assignedTo: [],
                divergenceFlag: null,
                observeFeedIds: [],
                locationGeometry: null,
                mapOverlayIds: [],
                blockedReason: null,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-02-01T00:00:00.000Z',
                doneAt: null,
              },
            ],
          },
        },
        version: 1,
      }),
    );
  }

  it('migrates taskType + backfills cycleId to the project max + sets observedAt', async () => {
    seedV1();
    await useFieldActionStore.persist.rehydrate();

    const a = useFieldActionStore.getState().getById('p-1', 'fa-legacy');
    expect(a).toBeDefined();
    expect(a!.taskType).toBe('field_survey');
    expect(a!.cycleId).toBe(3); // max(3, 1) across the project's domains
    expect(a!.observedAt).toBe('2026-02-01T00:00:00.000Z');
    expect(a!.sourceObjectiveType).toBeNull();
  });

  it('is idempotent: a second rehydrate keeps the backfilled cycleId', async () => {
    seedV1();
    await useFieldActionStore.persist.rehydrate();
    await useFieldActionStore.persist.rehydrate();

    const a = useFieldActionStore.getState().getById('p-1', 'fa-legacy');
    expect(a!.cycleId).toBe(3);
    expect(a!.taskType).toBe('field_survey');
  });

  it('stamps a freshly created action with cycleId 0 (unaffected by backfill)', async () => {
    seedV1();
    await useFieldActionStore.persist.rehydrate();

    const created = useFieldActionStore.getState().createFieldAction({
      id: 'fa-new',
      projectId: 'p-1',
      planObjectiveId: 'obj-1',
      tierId: 't0',
      title: 'New monitoring round',
      taskType: 'monitoring_task',
      proofSchemaId: 'generic-fallback',
      verificationMode: 'self',
    });
    expect(created.cycleId).toBe(0);
    expect(created.observedAt).toBeTruthy();
  });
});
