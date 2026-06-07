// @vitest-environment happy-dom
/**
 * T1.9 -- commencementDate field tests.
 *
 * Verifies that:
 *   1. updateProject round-trips commencementDate for a non-builtin project.
 *   2. updateProject round-trips commencementDate for a builtin project via the
 *      allowedKeys allowlist.
 *   3. A project without commencementDate parses and edits fine (field stays
 *      undefined / absent, no crash).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../lib/geodataCache.js', () => ({
  geodataCache: {
    remove: async () => {},
    removeByPrefix: async () => {},
  },
}));

import { useProjectStore } from '../projectStore.js';

function resetStore(): void {
  useProjectStore.setState({ projects: [], activeProjectId: null });
}

describe('projectStore -- commencementDate (T1.9)', () => {
  beforeEach(() => resetStore());

  it('round-trips commencementDate on a non-builtin project', () => {
    const { id } = useProjectStore.getState().createProject({
      name: 'Test Farm',
      projectType: 'regenerative_farm',
      country: 'US',
      units: 'metric',
    });

    useProjectStore
      .getState()
      .updateProject(id, { commencementDate: '2023-09-01' });

    const project = useProjectStore
      .getState()
      .projects.find((p) => p.id === id);
    expect(project?.commencementDate).toBe('2023-09-01');
  });

  it('clears commencementDate to null on a non-builtin project', () => {
    const { id } = useProjectStore.getState().createProject({
      name: 'Test Farm 2',
      projectType: 'regenerative_farm',
      country: 'US',
      units: 'metric',
    });

    useProjectStore
      .getState()
      .updateProject(id, { commencementDate: '2023-09-01' });
    useProjectStore
      .getState()
      .updateProject(id, { commencementDate: null });

    const project = useProjectStore
      .getState()
      .projects.find((p) => p.id === id);
    expect(project?.commencementDate).toBeNull();
  });

  it('round-trips commencementDate on a builtin project via allowedKeys', () => {
    // Seed a builtin project directly into state (mimic what the sample loader
    // does -- set isBuiltin: true on a minimal project object).
    const builtinId = 'builtin-test-commencement';
    useProjectStore.setState({
      projects: [
        {
          id: builtinId,
          name: 'MTC Sample',
          isBuiltin: true,
          projectType: 'regenerative_farm',
          country: 'CA',
          units: 'metric',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { projectTypeRecord: null },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      ],
      activeProjectId: null,
    });

    useProjectStore
      .getState()
      .updateProject(builtinId, { commencementDate: '2022-04-01' });

    const project = useProjectStore
      .getState()
      .projects.find((p) => p.id === builtinId);
    expect(project?.commencementDate).toBe('2022-04-01');
  });

  it('a project without commencementDate has the field absent / undefined', () => {
    const { id } = useProjectStore.getState().createProject({
      name: 'New Farm',
      projectType: 'regenerative_farm',
      country: 'US',
      units: 'metric',
    });

    const project = useProjectStore
      .getState()
      .projects.find((p) => p.id === id);
    // Field should be absent (not null, not a string -- simply not set)
    expect(project?.commencementDate).toBeUndefined();
  });
});
