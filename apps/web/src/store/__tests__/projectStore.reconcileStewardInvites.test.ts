// @vitest-environment happy-dom
//
// reconcileStewardInvites - merges the steward-capture invite queue into the
// canonical metadata.team.queuedInvites. Load-bearing guarantees:
//   - replaces the queue wholesale (the steward FormValue is source of truth);
//   - preserves existing primarySteward / coStewards (and all other metadata);
//   - no-op when the project is missing;
//   - works on builtin projects (metadata is in the updateProject allowlist).

import { describe, expect, it, beforeEach } from 'vitest';
import { useProjectStore } from '../projectStore.js';
import type { QueuedTeamInvite } from '@ogden/shared';

beforeEach(() => {
  useProjectStore.setState({ projects: [], activeProjectId: null });
});

/** Create a typeless project and return its id. */
function createProject(name: string): string {
  const project = useProjectStore.getState().createProject({
    name,
    country: 'US',
    units: 'metric',
  });
  return project.id;
}

/** Fetch a project by id (throws if missing). */
function getProject(id: string) {
  const project = useProjectStore.getState().projects.find((p) => p.id === id);
  if (!project) throw new Error(`project ${id} not found`);
  return project;
}

/** Small invite fixture builder. */
const inv = (email: string): QueuedTeamInvite => ({
  email,
  role: 'team_member',
  queuedAt: '2026-06-07T00:00:00.000Z',
});

describe('reconcileStewardInvites', () => {
  it('writes queuedInvites for a normal project', () => {
    const id = createProject('Normal');
    useProjectStore.getState().reconcileStewardInvites(id, [inv('a@b.com')]);
    expect(getProject(id).metadata?.team?.queuedInvites).toEqual([inv('a@b.com')]);
  });

  it('preserves existing primarySteward / coStewards', () => {
    const id = createProject('With stewards');
    useProjectStore.getState().updateProject(id, {
      metadata: {
        team: {
          primarySteward: { name: 'P', email: 'p@b.com' },
          coStewards: [{ name: 'C', email: 'c@b.com' }],
        },
      },
    });
    useProjectStore.getState().reconcileStewardInvites(id, [inv('a@b.com')]);
    const team = getProject(id).metadata?.team;
    expect(team?.primarySteward).toEqual({ name: 'P', email: 'p@b.com' });
    expect(team?.coStewards).toEqual([{ name: 'C', email: 'c@b.com' }]);
    expect(team?.queuedInvites).toEqual([inv('a@b.com')]);
  });

  it('replaces a prior queue (second wins)', () => {
    const id = createProject('Replace');
    useProjectStore.getState().reconcileStewardInvites(id, [inv('a@b.com')]);
    useProjectStore.getState().reconcileStewardInvites(id, [inv('b@b.com')]);
    expect(getProject(id).metadata?.team?.queuedInvites).toEqual([inv('b@b.com')]);
  });

  it('no-op for unknown projectId', () => {
    const before = useProjectStore.getState().projects;
    expect(() =>
      useProjectStore.getState().reconcileStewardInvites('no-such-id', [inv('a@b.com')]),
    ).not.toThrow();
    expect(useProjectStore.getState().projects).toEqual(before);
  });

  it('works on a builtin project', () => {
    const id = createProject('Builtin');
    useProjectStore.setState((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, isBuiltin: true } : p,
      ),
    }));
    useProjectStore.getState().reconcileStewardInvites(id, [inv('a@b.com')]);
    expect(getProject(id).metadata?.team?.queuedInvites).toEqual([inv('a@b.com')]);
  });
});
