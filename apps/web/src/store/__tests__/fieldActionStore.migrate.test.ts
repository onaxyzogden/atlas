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
 *      record carrying field_survey + project-max cycleId + observedAt +
 *      stratumId (tierId 't0' -> 's1'), and a second rehydrate does not change
 *      it. Mirrors closedLoopStore.test.ts.
 *   5. migratePersisted (v2->v3 + v1->v3): the Stratum rename - tierId KEY ->
 *      stratumId with slug renumber (bare t0 + full t1-land-reading),
 *      planObjectiveId renumber, UUID id untouched; idempotent on stratum-
 *      bearing data; composes with the v1->v2 taskType remap.
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

describe('migratePersisted (v2 -> v3): Stratum rename', () => {
  it('renames tierId KEY -> stratumId and renumbers both slugs', () => {
    const v2 = {
      byProject: {
        'p-1': [
          // full tier slug + a plan-objective slug
          {
            id: 'fa-1',
            tierId: 't1-land-reading',
            planObjectiveId: 't1-land-baseline',
            taskType: 'field_survey',
          },
          // bare tierId token (older fixture shape) + per-type objective slug
          {
            id: 'fa-2',
            tierId: 't0',
            planObjectiveId: 'rf-t1-landscape-context',
            taskType: 'monitoring_task',
          },
        ],
      },
    };
    const out = migratePersisted(v2, 2) as unknown as {
      byProject: LooseByProject;
    };
    const list = out.byProject['p-1']!;

    expect(list[0]!.stratumId).toBe('s2-land-reading');
    expect(list[0]!.planObjectiveId).toBe('s2-land-baseline');
    expect(list[1]!.stratumId).toBe('s1'); // bare t0 -> s1
    expect(list[1]!.planObjectiveId).toBe('rf-s2-landscape-context');

    // the legacy tierId key is dropped on every record
    expect((list[0]! as { tierId?: unknown }).tierId).toBeUndefined();
    expect((list[1]! as { tierId?: unknown }).tierId).toBeUndefined();
    // the UUID id is untouched
    expect(list[0]!.id).toBe('fa-1');
    expect(list[1]!.id).toBe('fa-2');
  });

  it('is idempotent: a record already carrying stratumId is preserved', () => {
    const already = {
      byProject: {
        'p-1': [
          {
            id: 'fa-1',
            stratumId: 's2-land-reading',
            planObjectiveId: 's2-land-baseline',
            taskType: 'field_survey',
          },
        ],
      },
    };
    const out = migratePersisted(already, 2) as unknown as {
      byProject: LooseByProject;
    };
    const a = out.byProject['p-1']![0]!;
    expect(a.stratumId).toBe('s2-land-reading'); // pre-present stratumId wins
    expect(a.planObjectiveId).toBe('s2-land-baseline'); // no double-bump
    expect((a as { tierId?: unknown }).tierId).toBeUndefined();
  });

  it('leaves v3 input untouched (version gate skips the rename)', () => {
    const v3 = {
      byProject: { 'p-1': [{ id: 'fa-1', stratumId: 's3-systems-reading' }] },
    };
    const out = migratePersisted(v3, 3) as unknown as {
      byProject: LooseByProject;
    };
    expect(out.byProject['p-1']![0]!.stratumId).toBe('s3-systems-reading');
  });
});

describe('migratePersisted (v1 -> v3): composite upgrade', () => {
  it('applies BOTH the taskType remap and the Stratum rename', () => {
    const v1 = {
      byProject: {
        'p-1': [
          {
            id: 'fa-legacy',
            tierId: 't1-land-reading',
            planObjectiveId: 't1-land-baseline',
            taskType: 'survey', // legacy 2-value taxonomy
            status: 'not_started',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-02-01T00:00:00.000Z',
          },
        ],
      },
    };
    const out = migratePersisted(v1, 1) as unknown as {
      byProject: LooseByProject;
    };
    const a = out.byProject['p-1']![0]!;
    // v1 -> v2 transforms
    expect(a.taskType).toBe('field_survey');
    expect(a.observedAt).toBe('2026-02-01T00:00:00.000Z');
    expect(a.sourceObjectiveType).toBeNull();
    expect(a.cycleId).toBeUndefined(); // left for the onRehydrate fold
    // v2 -> v3 rename
    expect(a.stratumId).toBe('s2-land-reading');
    expect(a.planObjectiveId).toBe('s2-land-baseline');
    expect((a as { tierId?: unknown }).tierId).toBeUndefined();
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
    // v2 -> v3 Stratum rename rides the same migrate:
    expect(a!.stratumId).toBe('s1'); // bare tierId 't0' -> stratumId 's1'
    expect((a as { tierId?: unknown }).tierId).toBeUndefined();
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
      stratumId: 's1',
      title: 'New monitoring round',
      taskType: 'monitoring_task',
      proofSchemaId: 'generic-fallback',
      verificationMode: 'self',
    });
    expect(created.cycleId).toBe(0);
    expect(created.observedAt).toBeTruthy();
  });
});
