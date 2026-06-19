import { describe, it, expect, beforeEach } from 'vitest';
import {
  useLaunchMilestoneStore,
  EMPTY_OBJECTIVE_MILESTONES,
  milestonesFor,
} from '../launchMilestoneStore';

const PID = 'project-1';
const OBJ = 's5-system-design';
const M1 = 'Milestone vs plan';
const M2 = 'Expenditure vs budget';

const get = () => useLaunchMilestoneStore.getState();
const reached = (pid = PID, obj = OBJ) =>
  milestonesFor(get().byProject, pid, obj);

const AT = '2026-06-19T10:00:00.000Z';

beforeEach(() => {
  useLaunchMilestoneStore.setState({ byProject: {} });
});

describe('launchMilestoneStore -- empty record', () => {
  it('returns the shared frozen empty record for an unknown project/objective', () => {
    expect(reached('unknown', 'nope')).toBe(EMPTY_OBJECTIVE_MILESTONES);
    expect(reached('unknown', 'nope')).toEqual({});
  });

  it('the frozen empty record is referentially stable across reads', () => {
    expect(reached('a', 'x')).toBe(reached('b', 'y'));
  });
});

describe('launchMilestoneStore -- markReached', () => {
  it('records a milestone with explicit timestamp and steward', () => {
    get().markReached(PID, OBJ, M1, 'u:steward-7', AT);
    expect(reached()[M1]).toEqual({ reachedAt: AT, reachedBy: 'u:steward-7' });
  });

  it('defaults reachedBy to act-tier and stamps a real ISO timestamp', () => {
    get().markReached(PID, OBJ, M1);
    const rec = reached()[M1]!;
    expect(rec.reachedBy).toBe('act-tier');
    expect(typeof rec.reachedAt).toBe('string');
    expect(Number.isNaN(Date.parse(rec.reachedAt))).toBe(false);
  });

  it('is idempotent -- a second mark keeps the original reach record', () => {
    get().markReached(PID, OBJ, M1, 'act-tier', AT);
    get().markReached(PID, OBJ, M1, 'u:someone-else', '2099-01-01T00:00:00.000Z');
    expect(reached()[M1]).toEqual({ reachedAt: AT, reachedBy: 'act-tier' });
  });

  it('tracks multiple milestones on the same objective independently', () => {
    get().markReached(PID, OBJ, M1, 'act-tier', AT);
    get().markReached(PID, OBJ, M2, 'act-tier', AT);
    expect(Object.keys(reached())).toEqual([M1, M2]);
  });
});

describe('launchMilestoneStore -- clearReached (remove-only)', () => {
  it('removes exactly the one milestone, leaving siblings intact', () => {
    get().markReached(PID, OBJ, M1, 'act-tier', AT);
    get().markReached(PID, OBJ, M2, 'act-tier', AT);
    get().clearReached(PID, OBJ, M1);
    expect(M1 in reached()).toBe(false);
    expect(reached()[M2]).toEqual({ reachedAt: AT, reachedBy: 'act-tier' });
  });

  it('is a no-op when the milestone was never reached', () => {
    get().markReached(PID, OBJ, M1, 'act-tier', AT);
    get().clearReached(PID, OBJ, 'never-marked');
    expect(reached()[M1]).toEqual({ reachedAt: AT, reachedBy: 'act-tier' });
  });

  it('a mark -> clear -> mark round-trip restamps fresh', () => {
    get().markReached(PID, OBJ, M1, 'act-tier', AT);
    get().clearReached(PID, OBJ, M1);
    get().markReached(PID, OBJ, M1, 'u:later', '2026-07-01T00:00:00.000Z');
    expect(reached()[M1]).toEqual({
      reachedAt: '2026-07-01T00:00:00.000Z',
      reachedBy: 'u:later',
    });
  });
});

describe('launchMilestoneStore -- isolation + reset', () => {
  it('keeps milestones scoped per project and per objective', () => {
    get().markReached(PID, OBJ, M1, 'act-tier', AT);
    get().markReached('project-2', OBJ, M1, 'act-tier', AT);
    get().markReached(PID, 's7-launch', M1, 'act-tier', AT);
    expect(reached(PID, OBJ)[M1]).toBeDefined();
    expect(reached('project-2', OBJ)[M1]).toBeDefined();
    expect(reached(PID, 's7-launch')[M1]).toBeDefined();
    get().clearReached(PID, OBJ, M1);
    expect(M1 in reached(PID, OBJ)).toBe(false);
    expect(reached('project-2', OBJ)[M1]).toBeDefined();
    expect(reached(PID, 's7-launch')[M1]).toBeDefined();
  });

  it('reset drops only the named project', () => {
    get().markReached(PID, OBJ, M1, 'act-tier', AT);
    get().markReached('project-2', OBJ, M1, 'act-tier', AT);
    get().reset(PID);
    expect(PID in get().byProject).toBe(false);
    expect(reached('project-2', OBJ)[M1]).toBeDefined();
  });

  it('reset is a no-op for an unknown project', () => {
    get().markReached(PID, OBJ, M1, 'act-tier', AT);
    get().reset('unknown');
    expect(reached()[M1]).toBeDefined();
  });
});
