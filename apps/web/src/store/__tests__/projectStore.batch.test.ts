// @vitest-environment happy-dom
//
// Batch lifecycle wrappers (archiveProjects / unarchiveProjects /
// deleteProjects) added 2026-06-02 for the v3 Portfolio multi-select toolbar.
// They loop the proven per-id actions with Promise.allSettled and return an
// { ok, failed } tally. Projects are seeded LOCAL (no serverId) so no API call
// fires; geodataCache is stubbed so the delete cascade doesn't touch IndexedDB.

import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock('../../lib/geodataCache.js', () => ({
  geodataCache: {
    remove: async () => {},
    removeByPrefix: async () => {},
  },
}));

import { useProjectStore, runBatch } from '../projectStore.js';

function seed(name: string): string {
  return useProjectStore.getState().createProject({
    name,
    projectType: 'regenerative_farm',
    country: 'US',
    units: 'metric',
  }).id;
}

function statusOf(id: string): string | undefined {
  return useProjectStore.getState().projects.find((p) => p.id === id)?.status;
}

beforeEach(() => {
  useProjectStore.setState({ projects: [], activeProjectId: null });
});

describe('runBatch', () => {
  it('tallies fulfilled vs rejected outcomes', async () => {
    const result = await runBatch(['a', 'b', 'c'], async (id) => {
      if (id === 'b') throw new Error('boom');
    });
    expect(result).toEqual({ ok: 2, failed: 1 });
  });

  it('handles an empty id list', async () => {
    expect(await runBatch([], async () => {})).toEqual({ ok: 0, failed: 0 });
  });
});

describe('projectStore batch wrappers', () => {
  it('deleteProjects removes the named projects and keeps the rest', async () => {
    const a = seed('A');
    const b = seed('B');
    const c = seed('C');

    const result = await useProjectStore.getState().deleteProjects([a, b]);

    expect(result).toEqual({ ok: 2, failed: 0 });
    const ids = useProjectStore.getState().projects.map((p) => p.id);
    expect(ids).toEqual([c]);
  });

  it('archiveProjects flips status to archived; unarchiveProjects restores it', async () => {
    const a = seed('A');
    const b = seed('B');

    const archived = await useProjectStore.getState().archiveProjects([a, b]);
    expect(archived).toEqual({ ok: 2, failed: 0 });
    expect(statusOf(a)).toBe('archived');
    expect(statusOf(b)).toBe('archived');

    const restored = await useProjectStore.getState().unarchiveProjects([a]);
    expect(restored).toEqual({ ok: 1, failed: 0 });
    expect(statusOf(a)).toBe('active');
    expect(statusOf(b)).toBe('archived');
  });

  it('no-ops on builtins without removing them (still counts as ok)', async () => {
    const a = seed('A');
    useProjectStore.setState((s) => ({
      projects: s.projects.map((p) =>
        p.id === a ? { ...p, isBuiltin: true } : p,
      ),
    }));

    const result = await useProjectStore.getState().deleteProjects([a]);

    expect(result).toEqual({ ok: 1, failed: 0 });
    // The builtin guard means the project is NOT removed.
    expect(useProjectStore.getState().projects.map((p) => p.id)).toEqual([a]);
  });
});
