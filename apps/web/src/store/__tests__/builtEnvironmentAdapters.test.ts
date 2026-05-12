// @vitest-environment happy-dom
/**
 * builtEnvironmentAdapters — round-trip parity for the legacy store
 * facades that now project from `builtEnvironmentStoreV2`.
 *
 * What we cover:
 *   1. Observe `useBuiltEnvironmentStore` — addBuilding/Well/Septic/PowerLine
 *      /BuriedUtility/Fence/Gate/ExistingDriveway → V2 entity present;
 *      facade selector returns the matching V1 shape; remove* deletes from
 *      V2 and V1; updates patch through.
 *   2. Plan `useStructureStore` — addStructure → V2 with proposed metadata;
 *      facade returns V1 Structure[] with snake_case `type` restored;
 *      updateStructure patches; deleteStructure removes.
 *   3. KPI parity — seed multiple entities, snapshot dashboard-relevant
 *      derivations from the facade, assert byte-for-byte stability.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useBuiltEnvironmentStoreV2 } from '../builtEnvironmentStoreV2.js';
import {
  useBuiltEnvironmentStore,
  type Building,
  type Well,
  type Septic,
  type PowerLine,
  type BuriedUtility,
  type Fence,
  type Gate,
  type ExistingDriveway,
} from '../builtEnvironmentStore.js';
import { useStructureStore, type Structure } from '../structureStore.js';
import { useLandDesignStore } from '../landDesignStore.js';

const PROJECT = 'p-adapter';

function resetAll(): void {
  useBuiltEnvironmentStoreV2.setState({ entities: [] });
  (
    useBuiltEnvironmentStoreV2 as unknown as {
      temporal: { getState: () => { clear: () => void } };
    }
  ).temporal.getState().clear();
  // Drain the non-structure substore directly — V2 entities are already
  // cleared above, and landDesignStore.byProject is the only other
  // surface that holds Plan-stage design elements.
  useLandDesignStore.setState({ byProject: {} });
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
}

beforeEach(() => {
  resetAll();
});

// ─────────────────────────────────────────────────────────────────────────
// Observe facade — useBuiltEnvironmentStore
// ─────────────────────────────────────────────────────────────────────────

describe('useBuiltEnvironmentStore facade', () => {
  it('addBuilding writes a v2 building entity and surfaces it via the facade', () => {
    const b: Building = {
      id: 'b1',
      projectId: PROJECT,
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      },
      subtype: 'residence',
      label: 'Main house',
      areaM2: 120,
      createdAt: '2026-05-10T00:00:00.000Z',
    };
    useBuiltEnvironmentStore.getState().addBuilding(b);

    const v2 = useBuiltEnvironmentStoreV2.getState().entities;
    expect(v2).toHaveLength(1);
    expect(v2[0]?.kind).toBe('building');
    expect(v2[0]?.state).toBe('existing');
    expect(v2[0]?.existing?.subtype).toBe('residence');
    expect(v2[0]?.existing?.areaM2).toBe(120);

    const buildings = useBuiltEnvironmentStore.getState().buildings;
    expect(buildings).toHaveLength(1);
    expect(buildings[0]?.subtype).toBe('residence');
    expect(buildings[0]?.label).toBe('Main house');
    expect(buildings[0]?.areaM2).toBe(120);
  });

  it('addWell round-trips position + kind + depth/flow', () => {
    const w: Well = {
      id: 'w1',
      projectId: PROJECT,
      position: [-72.5, 44.3],
      kind: 'irrigation',
      depthM: 35,
      flowLpm: 22,
      createdAt: '2026-05-10T00:00:00.000Z',
    };
    useBuiltEnvironmentStore.getState().addWell(w);

    const wells = useBuiltEnvironmentStore.getState().wells;
    expect(wells).toHaveLength(1);
    expect(wells[0]?.position).toEqual([-72.5, 44.3]);
    expect(wells[0]?.kind).toBe('irrigation');
    expect(wells[0]?.depthM).toBe(35);
    expect(wells[0]?.flowLpm).toBe(22);
  });

  it('all 8 add* helpers round-trip through the facade', () => {
    const baseLine: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: [[0, 0], [1, 1]],
    };
    const basePoly: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
    };
    const t = '2026-05-10T00:00:00.000Z';
    const api = useBuiltEnvironmentStore.getState();

    api.addBuilding({ id: 'b', projectId: PROJECT, geometry: basePoly, subtype: 'outbuilding', createdAt: t });
    api.addWell({ id: 'w', projectId: PROJECT, position: [0, 0], kind: 'drinking', createdAt: t });
    api.addSeptic({ id: 's', projectId: PROJECT, geometry: basePoly, kind: 'tank', createdAt: t });
    api.addPowerLine({ id: 'p', projectId: PROJECT, geometry: baseLine, placement: 'overhead', lengthM: 50, createdAt: t });
    api.addBuriedUtility({ id: 'u', projectId: PROJECT, geometry: baseLine, kind: 'water_main', lengthM: 30, createdAt: t });
    api.addFence({ id: 'f', projectId: PROJECT, geometry: baseLine, kind: 'barbed', lengthM: 100, createdAt: t });
    api.addGate({ id: 'g', projectId: PROJECT, position: [0, 0], createdAt: t });
    api.addExistingDriveway({ id: 'd', projectId: PROJECT, geometry: baseLine, surface: 'gravel', lengthM: 80, createdAt: t });

    const s = useBuiltEnvironmentStore.getState();
    expect(s.buildings).toHaveLength(1);
    expect(s.wells).toHaveLength(1);
    expect(s.septics).toHaveLength(1);
    expect(s.powerLines).toHaveLength(1);
    expect(s.buriedUtilities).toHaveLength(1);
    expect(s.fences).toHaveLength(1);
    expect(s.gates).toHaveLength(1);
    expect(s.existingDriveways).toHaveLength(1);
    expect(useBuiltEnvironmentStoreV2.getState().entities).toHaveLength(8);
  });

  it('updateBuilding patches subtype + areaM2 in v2 metadata', () => {
    const b: Building = {
      id: 'b2',
      projectId: PROJECT,
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
      subtype: 'outbuilding',
      areaM2: 50,
      createdAt: '2026-05-10T00:00:00.000Z',
    };
    useBuiltEnvironmentStore.getState().addBuilding(b);
    const v2Id = useBuiltEnvironmentStoreV2.getState().entities[0]!.id;

    useBuiltEnvironmentStore.getState().updateBuilding(v2Id, { subtype: 'agricultural', areaM2: 80 });

    const updated = useBuiltEnvironmentStore.getState().buildings[0];
    expect(updated?.subtype).toBe('agricultural');
    expect(updated?.areaM2).toBe(80);
  });

  it('removeBuilding deletes from v2 and clears the facade slice', () => {
    const b: Building = {
      id: 'b3',
      projectId: PROJECT,
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
      subtype: 'other',
      createdAt: '2026-05-10T00:00:00.000Z',
    };
    useBuiltEnvironmentStore.getState().addBuilding(b);
    const id = useBuiltEnvironmentStoreV2.getState().entities[0]!.id;
    useBuiltEnvironmentStore.getState().removeBuilding(id);
    expect(useBuiltEnvironmentStore.getState().buildings).toHaveLength(0);
    expect(useBuiltEnvironmentStoreV2.getState().entities).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Plan facade — useStructureStore
// ─────────────────────────────────────────────────────────────────────────

describe('useStructureStore facade', () => {
  function makeStructure(over: Partial<Structure> = {}): Structure {
    return {
      id: 's1',
      projectId: PROJECT,
      name: 'Barn A',
      type: 'barn',
      center: [0, 0],
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
      },
      rotationDeg: 0,
      widthM: 10,
      depthM: 10,
      phase: 'building',
      costEstimate: 50000,
      infrastructureReqs: ['water', 'power'],
      notes: '',
      createdAt: '2026-05-10T00:00:00.000Z',
      updatedAt: '2026-05-10T00:00:00.000Z',
      ...over,
    };
  }

  it('addStructure writes a v2 entity with state=proposed', () => {
    useStructureStore.getState().addStructure(makeStructure());
    const v2 = useBuiltEnvironmentStoreV2.getState().entities;
    expect(v2).toHaveLength(1);
    expect(v2[0]?.kind).toBe('barn');
    expect(v2[0]?.state).toBe('proposed');
    expect(v2[0]?.proposed?.costEstimate).toBe(50000);
    expect(v2[0]?.proposed?.infrastructureReqs).toEqual(['water', 'power']);
  });

  it('snake_case StructureType (prayer_space) is canonicalised then restored', () => {
    useStructureStore
      .getState()
      .addStructure(makeStructure({ type: 'prayer_space', name: 'Masjid' }));
    const v2Kind = useBuiltEnvironmentStoreV2.getState().entities[0]?.kind;
    expect(v2Kind).toBe('prayer-pavilion');
    const proj = useStructureStore.getState().structures[0];
    expect(proj?.type).toBe('prayer_space');
    expect(proj?.name).toBe('Masjid');
  });

  it('updateStructure bumps proposed metadata and label', () => {
    useStructureStore.getState().addStructure(makeStructure());
    const id = useBuiltEnvironmentStoreV2.getState().entities[0]!.id;
    useStructureStore
      .getState()
      .updateStructure(id, { name: 'Barn B', costEstimate: 75000, heightM: 7 });
    const s = useStructureStore.getState().structures[0];
    expect(s?.name).toBe('Barn B');
    expect(s?.costEstimate).toBe(75000);
    expect(s?.heightM).toBe(7);
  });

  it('deleteStructure clears it from v2 and the facade', () => {
    useStructureStore.getState().addStructure(makeStructure());
    const id = useBuiltEnvironmentStoreV2.getState().entities[0]!.id;
    useStructureStore.getState().deleteStructure(id);
    expect(useStructureStore.getState().structures).toHaveLength(0);
    expect(useBuiltEnvironmentStoreV2.getState().entities).toHaveLength(0);
  });

  it('placementMode stays local-only (does not touch v2)', () => {
    useStructureStore.getState().setPlacementMode('yurt');
    expect(useStructureStore.getState().placementMode).toBe('yurt');
    expect(useBuiltEnvironmentStoreV2.getState().entities).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// KPI parity — derivation snapshot
// ─────────────────────────────────────────────────────────────────────────

describe('KPI parity — Built Environment dashboard derivations', () => {
  it('counts + total length/area derivations match across writes', () => {
    const t = '2026-05-10T00:00:00.000Z';
    const api = useBuiltEnvironmentStore.getState();

    // Two buildings with measured area; two fences with measured length.
    api.addBuilding({
      id: 'b1', projectId: PROJECT,
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
      subtype: 'residence', areaM2: 120, createdAt: t,
    });
    api.addBuilding({
      id: 'b2', projectId: PROJECT,
      geometry: { type: 'Polygon', coordinates: [[[2, 2], [3, 2], [3, 3], [2, 2]]] },
      subtype: 'outbuilding', areaM2: 60, createdAt: t,
    });
    api.addFence({
      id: 'f1', projectId: PROJECT,
      geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
      kind: 'barbed', lengthM: 100, createdAt: t,
    });
    api.addFence({
      id: 'f2', projectId: PROJECT,
      geometry: { type: 'LineString', coordinates: [[2, 0], [3, 1]] },
      kind: 'electric', lengthM: 150, createdAt: t,
    });
    api.addWell({
      id: 'w1', projectId: PROJECT, position: [0, 0], kind: 'drinking',
      depthM: 30, flowLpm: 20, createdAt: t,
    });

    const s = useBuiltEnvironmentStore.getState();
    const totalArea = s.buildings.reduce((a, b) => a + (b.areaM2 ?? 0), 0);
    const totalFenceM = s.fences.reduce((a, f) => a + (f.lengthM ?? 0), 0);
    const wellCount = s.wells.length;
    expect(totalArea).toBe(180);
    expect(totalFenceM).toBe(250);
    expect(wellCount).toBe(1);

    // Module-health formula from BuiltEnvironmentDashboard.tsx (line ~306):
    //   Math.min(100, Math.max(0, total*8 + kindsPresent*4))
    const total = s.buildings.length + s.wells.length + s.fences.length;
    const kindsPresent = [s.buildings, s.wells, s.fences].filter((l) => l.length > 0).length;
    const health = Math.min(100, Math.max(0, total * 8 + kindsPresent * 4));
    expect(health).toBe(5 * 8 + 3 * 4); // 40 + 12 = 52
  });
});
