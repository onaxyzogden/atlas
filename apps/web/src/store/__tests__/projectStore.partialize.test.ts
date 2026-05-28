// @vitest-environment happy-dom
/**
 * projectStore.partialize regression: a drift-shaped project (missing
 * `attachments`) crashes the render tree on any setState, because the
 * persist middleware reruns partialize on EVERY mutation — including the
 * `setActiveProject` useEffect in V3ProjectLayout — and the unguarded
 * `p.attachments.map(...)` throws "Cannot read properties of undefined
 * (reading 'map')". Vite's refresh overlay surfaces that as "Something
 * went wrong! [Hide Error]" on Act / Plan surfaces.
 *
 * Root cause was a project seeded via raw `useProjectStore.setState(...)`
 * (devtools / test bootstrap) that skipped `attachments: []`. The fix
 * adds `?? []` guards on both `state.projects` and `p.attachments` so the
 * write side is total for any partial shape.
 *
 * These tests exercise the persist write path through setState +
 * localStorage round-trip — partialize is not exported, so we observe its
 * behaviour via what lands in `ogden-projects`.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useProjectStore } from '../projectStore';

const STORAGE_KEY = 'ogden-projects';

function readPersisted(): {
  state: { projects: Array<Record<string, unknown>>; activeProjectId: string | null };
  version: number;
} | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as ReturnType<typeof readPersisted> extends infer T
    ? T extends null
      ? never
      : T
    : never;
}

beforeEach(() => {
  localStorage.clear();
  // Reset store to a clean slate so prior tests don't bleed in.
  useProjectStore.setState({ projects: [], activeProjectId: null });
});

describe('projectStore.partialize: drift-shape guards', () => {
  it('persists a project that lacks an `attachments` key without throwing', () => {
    const drift = {
      id: 'drift-1',
      name: 'Drift Project',
      // No `attachments` key at all — mimics raw-setState seeding.
    } as never;

    expect(() => {
      useProjectStore.setState({
        projects: [drift],
        activeProjectId: 'drift-1',
      });
    }).not.toThrow();

    // Trigger one more setState to force the persist write hook again.
    expect(() => {
      useProjectStore.setState((s) => ({ ...s, activeProjectId: 'drift-1' }));
    }).not.toThrow();

    const persisted = readPersisted();
    expect(persisted).not.toBeNull();
    expect(persisted!.state.projects).toHaveLength(1);
    expect(persisted!.state.projects[0]!.id).toBe('drift-1');
    expect(persisted!.state.projects[0]!.attachments).toEqual([]);
  });

  it('tolerates state.projects being undefined entirely', () => {
    expect(() => {
      useProjectStore.setState({
        projects: undefined as never,
        activeProjectId: null,
      });
    }).not.toThrow();
    expect(() => {
      useProjectStore.setState((s) => ({ ...s, activeProjectId: null }));
    }).not.toThrow();

    const persisted = readPersisted();
    expect(persisted).not.toBeNull();
    expect(persisted!.state.projects).toEqual([]);
  });

  it('preserves a well-shaped attachments array unchanged (modulo data: null)', () => {
    const proj = {
      id: 'well-1',
      name: 'Well Project',
      attachments: [
        { id: 'a1', name: 'boundary.geojson', data: { type: 'FeatureCollection' } },
        { id: 'a2', name: 'soil.kml' },
      ],
    } as never;

    useProjectStore.setState({
      projects: [proj],
      activeProjectId: 'well-1',
    });
    // Trigger persist write.
    useProjectStore.setState((s) => ({ ...s, activeProjectId: 'well-1' }));

    const persisted = readPersisted();
    expect(persisted).not.toBeNull();
    const persistedProj = persisted!.state.projects[0]!;
    expect(persistedProj.id).toBe('well-1');
    const atts = persistedProj.attachments as Array<{
      id: string;
      data: unknown;
    }>;
    expect(atts).toHaveLength(2);
    // Geospatial blobs stripped to null (IDB carries the real data).
    expect(atts[0]!.data).toBeNull();
    expect(atts[0]!.id).toBe('a1');
    expect(atts[1]!.id).toBe('a2');
  });
});
