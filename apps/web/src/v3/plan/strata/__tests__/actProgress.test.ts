import { describe, expect, it } from 'vitest';
import type { ActTask, VerificationRecord } from '@ogden/shared';
import { deriveActProgress } from '../actProgress';

// Minimal fixtures — deriveActProgress only reads task.id/task.objectiveId
// and verification.taskId/verification.outcome, so the rest is filled with
// valid-shaped defaults and cast honestly.
function task(id: string, objectiveId: string): ActTask {
  return {
    id,
    projectId: 'proj-local',
    objectiveId,
    handoffPackageId: 'pkg-1',
    title: id,
    description: '',
    priority: 'normal',
    status: 'ready',
    createdAt: '2026-01-01T00:00:00.000Z',
  } as ActTask;
}

function verif(
  taskId: string,
  outcome: VerificationRecord['outcome'],
): VerificationRecord {
  return {
    id: `v-${taskId}`,
    projectId: 'proj-local',
    taskId,
    outcome,
    criteriaChecked: [],
    requiredReworkIds: [],
    proofRecordIds: [],
    verifiedAt: '2026-01-02T00:00:00.000Z',
  } as VerificationRecord;
}

const OBJ = 's1-obj';

describe('deriveActProgress', () => {
  it('reports {0,0} when the objective has no Act tasks', () => {
    expect(deriveActProgress([], [], OBJ)).toEqual({ verified: 0, total: 0 });
  });

  it('counts tasks but no verifications as {0,N}', () => {
    const tasks = [task('t1', OBJ), task('t2', OBJ)];
    expect(deriveActProgress(tasks, [], OBJ)).toEqual({
      verified: 0,
      total: 2,
    });
  });

  it('counts only passing verifications toward verified', () => {
    const tasks = [task('t1', OBJ), task('t2', OBJ), task('t3', OBJ)];
    const verifications = [
      verif('t1', 'pass'),
      verif('t2', 'partial'),
      verif('t3', 'fail'),
    ];
    expect(deriveActProgress(tasks, verifications, OBJ)).toEqual({
      verified: 1,
      total: 3,
    });
  });

  it('ignores partial, fail, and needs-rework outcomes', () => {
    const tasks = [task('t1', OBJ)];
    for (const outcome of ['partial', 'fail', 'needs-rework'] as const) {
      expect(
        deriveActProgress(tasks, [verif('t1', outcome)], OBJ).verified,
      ).toBe(0);
    }
  });

  it('only counts tasks tied to the given objective', () => {
    const tasks = [task('t1', OBJ), task('t2', 'other-obj')];
    const verifications = [verif('t1', 'pass'), verif('t2', 'pass')];
    expect(deriveActProgress(tasks, verifications, OBJ)).toEqual({
      verified: 1,
      total: 1,
    });
  });

  it('does not double-count a task with multiple passing records', () => {
    const tasks = [task('t1', OBJ)];
    const verifications = [verif('t1', 'pass'), verif('t1', 'pass')];
    expect(deriveActProgress(tasks, verifications, OBJ)).toEqual({
      verified: 1,
      total: 1,
    });
  });
});
