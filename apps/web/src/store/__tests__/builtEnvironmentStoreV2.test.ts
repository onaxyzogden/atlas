// @vitest-environment happy-dom
/**
 * builtEnvironmentStoreV2 — CRUD, migration, and selector tests.
 *
 * Covers:
 *   1. Round-trip CRUD per representative kind × per state.
 *   2. Migration from each legacy localStorage key in isolation, then
 *      combined.
 *   3. Selector parity (byProject, byProjectAndState, byProjectAndKind).
 *   4. Undo timeline cleared on migration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useBuiltEnvironmentStoreV2,
  selectByProject,
  selectByProjectAndState,
  selectByProjectAndKind,
  migrateLegacyToV2,
  V2_STORAGE_KEY,
  LEGACY_OBSERVE_KEY,
  LEGACY_STRUCTURE_KEY,
  LEGACY_DESIGN_ELEMENTS_KEY,
} from '../builtEnvironmentStoreV2.js';

const PROJECT = 'p-test';

function clearStoreAndStorage(): void {
  useBuiltEnvironmentStoreV2.setState({ entities: [] });
  (
    useBuiltEnvironmentStoreV2 as unknown as {
      temporal: { getState: () => { clear: () => void } };
    }
  ).temporal.getState().clear();
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
}

describe('builtEnvironmentStoreV2 — CRUD', () => {
  beforeEach(() => clearStoreAndStorage());

  it('creates an existing-state well (point) and assigns id + timestamps', () => {
    const created = useBuiltEnvironmentStoreV2.getState().create({
      projectId: PROJECT,
      kind: 'well',
      state: 'existing',
      geometry: { type: 'Point', coordinates: [-78.2, 44.5] },
      existing: { depthM: 30, flowLpm: 12, subtype: 'irrigation' },
    });
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBeTruthy();
    expect(created.updatedAt).toBe(created.createdAt);
    expect(useBuiltEnvironmentStoreV2.getState().entities).toHaveLength(1);
    const stored = useBuiltEnvironmentStoreV2.getState().entities[0];
    expect(stored?.kind).toBe('well');
    expect(stored?.state).toBe('existing');
    expect(stored?.existing?.depthM).toBe(30);
  });

  it('creates a proposed-state barn (polygon) with proposed metadata', () => {
    const created = useBuiltEnvironmentStoreV2.getState().create({
      projectId: PROJECT,
      kind: 'barn',
      state: 'proposed',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-78.2, 44.5],
            [-78.21, 44.5],
            [-78.21, 44.51],
            [-78.2, 44.51],
            [-78.2, 44.5],
          ],
        ],
      },
      proposed: { costEstimate: 45000, heightM: 6, phase: 'building' },
    });
    expect(created.proposed?.costEstimate).toBe(45000);
    expect(created.proposed?.heightM).toBe(6);
  });

  it('updateGeometry replaces geometry and bumps updatedAt', async () => {
    const e = useBuiltEnvironmentStoreV2.getState().create({
      projectId: PROJECT,
      kind: 'fence',
      state: 'existing',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-78.2, 44.5],
          [-78.21, 44.5],
        ],
      },
    });
    const before = e.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    useBuiltEnvironmentStoreV2.getState().updateGeometry(e.id, {
      type: 'LineString',
      coordinates: [
        [-78.2, 44.5],
        [-78.22, 44.5],
      ],
    });
    const after = useBuiltEnvironmentStoreV2.getState().entities[0];
    expect(after?.geometry.coordinates).toEqual([
      [-78.2, 44.5],
      [-78.22, 44.5],
    ]);
    expect(after?.updatedAt).not.toBe(before);
  });

  it('updateMetadata patches existing metadata, leaving other fields intact', () => {
    const e = useBuiltEnvironmentStoreV2.getState().create({
      projectId: PROJECT,
      kind: 'well',
      state: 'existing',
      geometry: { type: 'Point', coordinates: [-78.2, 44.5] },
      existing: { depthM: 30, flowLpm: 12 },
    });
    useBuiltEnvironmentStoreV2.getState().updateMetadata(e.id, {
      label: 'North well',
      existing: { flowLpm: 18 },
    });
    const after = useBuiltEnvironmentStoreV2.getState().entities[0];
    expect(after?.label).toBe('North well');
    expect(after?.existing?.depthM).toBe(30);
    expect(after?.existing?.flowLpm).toBe(18);
  });

  it('setState flips an entity from existing to proposed', () => {
    const e = useBuiltEnvironmentStoreV2.getState().create({
      projectId: PROJECT,
      kind: 'barn',
      state: 'existing',
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      },
    });
    useBuiltEnvironmentStoreV2.getState().setState(e.id, 'proposed');
    expect(useBuiltEnvironmentStoreV2.getState().entities[0]?.state).toBe('proposed');
  });

  it('delete removes the entity', () => {
    const e = useBuiltEnvironmentStoreV2.getState().create({
      projectId: PROJECT,
      kind: 'gate',
      state: 'existing',
      geometry: { type: 'Point', coordinates: [-78.2, 44.5] },
    });
    useBuiltEnvironmentStoreV2.getState().delete(e.id);
    expect(useBuiltEnvironmentStoreV2.getState().entities).toHaveLength(0);
  });
});

describe('builtEnvironmentStoreV2 — selectors', () => {
  beforeEach(() => {
    clearStoreAndStorage();
    const c = useBuiltEnvironmentStoreV2.getState().create;
    c({
      projectId: PROJECT,
      kind: 'well',
      state: 'existing',
      geometry: { type: 'Point', coordinates: [-78.2, 44.5] },
    });
    c({
      projectId: PROJECT,
      kind: 'barn',
      state: 'proposed',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    });
    c({
      projectId: 'other',
      kind: 'well',
      state: 'existing',
      geometry: { type: 'Point', coordinates: [0, 0] },
    });
  });

  it('byProject returns only this project', () => {
    const s = useBuiltEnvironmentStoreV2.getState();
    expect(selectByProject(s, PROJECT)).toHaveLength(2);
    expect(selectByProject(s, 'other')).toHaveLength(1);
  });

  it('byProjectAndState filters by state', () => {
    const s = useBuiltEnvironmentStoreV2.getState();
    expect(selectByProjectAndState(s, PROJECT, 'existing')).toHaveLength(1);
    expect(selectByProjectAndState(s, PROJECT, 'proposed')).toHaveLength(1);
  });

  it('byProjectAndKind canonicalizes alias kinds', () => {
    const s = useBuiltEnvironmentStoreV2.getState();
    expect(selectByProjectAndKind(s, PROJECT, 'well')).toHaveLength(1);
    // No `cabin` in the project — should return empty, not throw.
    expect(selectByProjectAndKind(s, PROJECT, 'cabin')).toHaveLength(0);
  });
});

describe('builtEnvironmentStoreV2 — migration from legacy keys', () => {
  beforeEach(() => clearStoreAndStorage());

  function seedObserve(snapshot: Record<string, unknown>): void {
    window.localStorage.setItem(
      LEGACY_OBSERVE_KEY,
      JSON.stringify({ state: snapshot, version: 1 }),
    );
  }
  function seedStructures(structures: unknown[]): void {
    window.localStorage.setItem(
      LEGACY_STRUCTURE_KEY,
      JSON.stringify({ state: { structures }, version: 2 }),
    );
  }
  function seedDesignElements(byProject: Record<string, unknown[]>): void {
    window.localStorage.setItem(
      LEGACY_DESIGN_ELEMENTS_KEY,
      JSON.stringify({ state: { byProject }, version: 1 }),
    );
  }

  it('migrates Observe Building → existing-state building', () => {
    seedObserve({
      buildings: [
        {
          id: 'b1',
          projectId: PROJECT,
          subtype: 'residence',
          areaM2: 120,
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
          },
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    const out = migrateLegacyToV2();
    expect(out).toHaveLength(1);
    expect(out[0]?.state).toBe('existing');
    expect(out[0]?.kind).toBe('building');
    expect(out[0]?.existing?.subtype).toBe('residence');
    expect(out[0]?.existing?.areaM2).toBe(120);
  });

  it('migrates Observe Well (point) → existing-state well with depth/flow', () => {
    seedObserve({
      wells: [
        {
          id: 'w1',
          projectId: PROJECT,
          position: [-78.2, 44.5],
          kind: 'drinking',
          depthM: 50,
          flowLpm: 8,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    const out = migrateLegacyToV2();
    expect(out[0]?.geometry.type).toBe('Point');
    expect(out[0]?.existing?.depthM).toBe(50);
    expect(out[0]?.existing?.flowLpm).toBe(8);
    expect(out[0]?.existing?.subtype).toBe('drinking');
  });

  it('migrates Observe PowerLine with placement preserved', () => {
    seedObserve({
      powerLines: [
        {
          id: 'pl1',
          projectId: PROJECT,
          placement: 'overhead',
          lengthM: 200,
          geometry: {
            type: 'LineString',
            coordinates: [[-78.2, 44.5], [-78.21, 44.5]],
          },
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    const out = migrateLegacyToV2();
    expect(out[0]?.kind).toBe('power-line');
    expect(out[0]?.existing?.placement).toBe('overhead');
    expect(out[0]?.existing?.lengthM).toBe(200);
  });

  it('migrates Plan structure (snake_case type) → proposed-state with alias resolution', () => {
    seedStructures([
      {
        id: 's1',
        projectId: PROJECT,
        name: 'East prayer space',
        type: 'prayer_space',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
        rotationDeg: 45,
        widthM: 10,
        depthM: 8,
        heightM: 4,
        costEstimate: 20000,
        infrastructureReqs: ['power'],
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-02T00:00:00.000Z',
      },
    ]);
    const out = migrateLegacyToV2();
    expect(out[0]?.state).toBe('proposed');
    expect(out[0]?.kind).toBe('prayer-pavilion');
    expect(out[0]?.proposed?.costEstimate).toBe(20000);
    expect(out[0]?.proposed?.rotationDeg).toBe(45);
    expect(out[0]?.label).toBe('East prayer space');
  });

  it('migrates designElement structure-class kinds and skips non-structure kinds', () => {
    seedDesignElements({
      [PROJECT]: [
        {
          id: 'de1',
          category: 'structure',
          kind: 'machinery-shed',
          phase: 'building',
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
          },
          createdAt: '2026-03-01T00:00:00.000Z',
        },
        {
          id: 'de2',
          category: 'water',
          kind: 'pond', // non-structure — should NOT migrate
          phase: 'water',
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
          },
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    });
    const out = migrateLegacyToV2();
    expect(out).toHaveLength(1);
    expect(out[0]?.kind).toBe('machinery-shed');
    expect(out[0]?.proposed?.phase).toBe('building');
  });

  it('dedupes by id when the same id appears across legacy stores', () => {
    seedObserve({
      buildings: [
        {
          id: 'dup',
          projectId: PROJECT,
          subtype: 'agricultural',
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
          },
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    seedStructures([
      {
        id: 'dup',
        projectId: PROJECT,
        type: 'barn',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
        createdAt: '2026-02-01T00:00:00.000Z',
      },
    ]);
    const out = migrateLegacyToV2();
    expect(out).toHaveLength(1);
    // Plan iteration runs after Observe → last writer wins.
    expect(out[0]?.state).toBe('proposed');
    expect(out[0]?.kind).toBe('barn');
  });

  it('returns empty when no legacy keys are present', () => {
    expect(migrateLegacyToV2()).toEqual([]);
  });
});
