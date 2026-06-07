/**
 * @vitest-environment happy-dom
 *
 * useActObjectiveTaskBridge — store-aware, read-only resolution of the formal
 * ActTask roster for a tier-shell PlanStratumObjective. Verifies all four
 * branches (offline / no-domain / no-task / ready) and that the hook performs
 * NO store writes in any branch.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  findPlanStratumObjective,
  type ActTask,
  type PlanStratumObjective,
} from '@ogden/shared';
import { useActTaskStore } from '../../../../store/olos/index.js';
import { useActObjectiveTaskBridge } from '../useActObjectiveTaskBridge';

const PROJECT = 'local-1';
const SERVER = 'srv-1';

// s6-yield-flows overrides to ['plants-food', ...] => primary domain
// plants-food => catalogue Act objective 'plants-food--act'.
const OBJECTIVE = findPlanStratumObjective('s6-yield-flows')!;
const ACT_OBJECTIVE_ID = 'plants-food--act';

/** Seed one ActTask tied to the resolved catalogue objective id. Only the
 *  fields the hook reads need to be real; the rest is a structural stub. */
function seedTask(objectiveId: string): void {
  const task = {
    id: 'task-seed-1',
    projectId: PROJECT,
    objectiveId,
    handoffPackageId: 'pkg-1',
    title: 'Seeded task',
    status: 'ready',
  } as unknown as ActTask;
  useActTaskStore.setState({ byProject: { [PROJECT]: { [task.id]: task } } });
}

function resetStore(): void {
  useActTaskStore.setState({ byProject: {}, syncByProject: {} });
}

beforeEach(() => {
  localStorage.clear();
  resetStore();
});

describe('useActObjectiveTaskBridge', () => {
  it('returns "offline" with the resolved id when there is no serverId', () => {
    const { result } = renderHook(() =>
      useActObjectiveTaskBridge(PROJECT, undefined, OBJECTIVE),
    );
    expect(result.current.status).toBe('offline');
    expect(result.current.actObjectiveId).toBe(ACT_OBJECTIVE_ID);
    expect(result.current.tasks).toEqual([]);
  });

  it('returns "no-domain" when the objective maps to no domain', () => {
    const orphan = {
      id: 'orphan',
      stratumId: 'sX-nonexistent',
    } as unknown as PlanStratumObjective;
    const { result } = renderHook(() =>
      useActObjectiveTaskBridge(PROJECT, SERVER, orphan),
    );
    expect(result.current.status).toBe('no-domain');
    expect(result.current.actObjectiveId).toBeNull();
    expect(result.current.tasks).toEqual([]);
  });

  it('returns "no-task" when synced + resolved but no ActTask exists yet', () => {
    const { result } = renderHook(() =>
      useActObjectiveTaskBridge(PROJECT, SERVER, OBJECTIVE),
    );
    expect(result.current.status).toBe('no-task');
    expect(result.current.actObjectiveId).toBe(ACT_OBJECTIVE_ID);
    expect(result.current.tasks).toEqual([]);
  });

  it('returns "ready" with the matching tasks when one is seeded', () => {
    seedTask(ACT_OBJECTIVE_ID);
    const { result } = renderHook(() =>
      useActObjectiveTaskBridge(PROJECT, SERVER, OBJECTIVE),
    );
    expect(result.current.status).toBe('ready');
    expect(result.current.actObjectiveId).toBe(ACT_OBJECTIVE_ID);
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0]!.objectiveId).toBe(ACT_OBJECTIVE_ID);
  });

  it('ignores tasks tied to a different catalogue objective', () => {
    seedTask('soil--act');
    const { result } = renderHook(() =>
      useActObjectiveTaskBridge(PROJECT, SERVER, OBJECTIVE),
    );
    expect(result.current.status).toBe('no-task');
    expect(result.current.tasks).toEqual([]);
  });

  it('performs NO store writes in any branch', () => {
    seedTask(ACT_OBJECTIVE_ID);
    const before = JSON.stringify(useActTaskStore.getState().byProject);
    renderHook(() => useActObjectiveTaskBridge(PROJECT, SERVER, OBJECTIVE));
    renderHook(() => useActObjectiveTaskBridge(PROJECT, undefined, OBJECTIVE));
    renderHook(() =>
      useActObjectiveTaskBridge(PROJECT, SERVER, {
        id: 'orphan',
        stratumId: 'sX',
      } as unknown as PlanStratumObjective),
    );
    const after = JSON.stringify(useActTaskStore.getState().byProject);
    expect(after).toBe(before);
  });
});
