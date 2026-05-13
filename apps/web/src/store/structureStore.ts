/**
 * structureStore — V2-derived facade for PLAN-stage proposed structures.
 *
 * History: V1 was a single `structures: Structure[]` zundo+persist store on
 * `'ogden-structures'`. 2026-05-10 unification (ADR
 * `2026-05-10-atlas-built-environment-unification.md`) moved canonical
 * storage to `builtEnvironmentStoreV2` — a single `entities[]` array
 * discriminated by `state: 'existing' | 'proposed'`.
 *
 * This module is kept on disk as a **bridge / facade** so the legacy
 * reader/writer sites (`PlanDataLayers`, `PhasingDashboard`,
 * `useAllPlacedEntities`, `StructureFootprintLibraryCard`,
 * `PlanVertexEditHandler`, `StructureTool`) keep their V1-shape
 * subscriptions unchanged. The facade:
 *
 *   - Subscribes to V2 on first hydrate and any update.
 *   - Projects V2 entities (`state === 'proposed'`, kind in the legacy
 *     20-StructureType set) into the V1 `Structure[]` shape.
 *   - Routes every mutation (`addStructure`, `updateStructure`,
 *     `deleteStructure`) through V2's `create / updateMetadata /
 *     updateGeometry / delete`.
 *
 * Persistence + zundo temporal live on V2 only; this store is in-memory.
 * `placementMode` is local-only UI state (was never persisted in V1
 * either) and stays in this store unchanged.
 *
 * Follow-up: once a release ships clean, delete this file outright. The
 * legacy localStorage key `ogden-structures` remains read-only via V2's
 * migration shim; we do NOT write to it any more.
 */

import { create } from 'zustand';
import {
  canonicalizeKind,
  projectToStructures,
  type ProjectedStructure,
  type ProposedMetadata,
  type StructureType,
} from '@ogden/shared';
import {
  useBuiltEnvironmentStoreV2,
  type BuiltEnvironmentV2State,
} from './builtEnvironmentStoreV2.js';

// `StructureType` lives in `@ogden/shared/demand/structureDemand.ts` and
// is the canonical narrow union (20 snake_case literals). Re-exported
// from here so existing consumers that import it from this path keep
// working through the 144-site sweep.
export type { StructureType };

// `Structure` is now a structural alias for `ProjectedStructure` — the
// two interfaces are byte-identical after the 2026-05-12 narrowing of
// `ProjectedStructure.type` to `StructureType`. The facade's V1→V2
// projection helper (`projectV2ToStructures`) is deleted; readers
// consume `projectToStructures` directly.
export type Structure = ProjectedStructure;

interface StructureState {
  structures: Structure[];
  placementMode: StructureType | null;

  addStructure: (structure: Structure) => void;
  updateStructure: (id: string, updates: Partial<Structure>) => void;
  deleteStructure: (id: string) => void;
  setPlacementMode: (type: StructureType | null) => void;
}

// ─────────────────────────────────────────────────────────────────────────
// V1 ↔ V2 kind translation.
// ─────────────────────────────────────────────────────────────────────────
//
// V1 `StructureType` is snake_case (`prayer_space`, `tent_glamping`); V2
// kinds are kebab-case (`prayer-pavilion`, `tent-glamping`). The kind
// registry already aliases the snake_case forms for migration; on the
// write path we re-map V1 → kebab via the registry, and on the read path
// we use the legacy reverse map embedded in `projectToStructures`.

function structureTypeToV2Kind(t: StructureType): string {
  // Registry's canonicalizeKind handles both shapes (prayer_space →
  // prayer-pavilion via aliases, plus already-kebab kinds round-trip).
  return canonicalizeKind(t) ?? canonicalizeKind(t.replace(/_/g, '-')) ?? t;
}

// ─────────────────────────────────────────────────────────────────────────
// V1 → V2 write helpers.
// ─────────────────────────────────────────────────────────────────────────

function v2Api() {
  return useBuiltEnvironmentStoreV2.getState();
}

function buildProposedFromStructure(s: Partial<Structure>): ProposedMetadata {
  const m: ProposedMetadata = {};
  if (typeof s.rotationDeg === 'number') m.rotationDeg = s.rotationDeg;
  if (typeof s.widthM === 'number') m.widthM = s.widthM;
  if (typeof s.depthM === 'number') m.depthM = s.depthM;
  if (typeof s.heightM === 'number') m.heightM = s.heightM;
  if (typeof s.storiesCount === 'number') m.storiesCount = s.storiesCount;
  if (typeof s.costEstimate === 'number') m.costEstimate = s.costEstimate;
  if (typeof s.laborHoursEstimate === 'number') m.laborHoursEstimate = s.laborHoursEstimate;
  if (typeof s.materialTonnageEstimate === 'number') {
    m.materialTonnageEstimate = s.materialTonnageEstimate;
  }
  if (typeof s.demandWaterGalPerDay === 'number') {
    m.demandWaterGalPerDay = s.demandWaterGalPerDay;
  }
  if (typeof s.demandKwhPerDay === 'number') m.demandKwhPerDay = s.demandKwhPerDay;
  if (typeof s.occupantCount === 'number') m.occupantCount = s.occupantCount;
  if (Array.isArray(s.infrastructureReqs)) m.infrastructureReqs = s.infrastructureReqs;
  if (typeof s.isTemporary === 'boolean') m.isTemporary = s.isTemporary;
  if (Array.isArray(s.seasonalMonths)) m.seasonalMonths = s.seasonalMonths;
  if (typeof s.phase === 'string') m.phase = s.phase;
  if (typeof s.enterprise === 'string') m.enterprise = s.enterprise;
  return m;
}

// ─────────────────────────────────────────────────────────────────────────
// Facade store.
// ─────────────────────────────────────────────────────────────────────────

const initialStructures = projectToStructures(
  useBuiltEnvironmentStoreV2.getState().entities,
);

export const useStructureStore = create<StructureState>()((set) => ({
  structures: initialStructures,
  placementMode: null,

  addStructure: (structure) => {
    const proposed = buildProposedFromStructure(structure);
    const input: Parameters<BuiltEnvironmentV2State['create']>[0] = {
      projectId: structure.projectId,
      kind: structureTypeToV2Kind(structure.type),
      state: 'proposed',
      geometry: structure.geometry,
      proposed,
    };
    if (structure.name !== undefined) input.label = structure.name;
    if (structure.notes !== undefined) input.notes = structure.notes;
    // serverId is omitted from CreateBuiltEnvironmentInput by design; if
    // an explicit serverId is supplied, patch it in via updateMetadata
    // after V2 mints the canonical id.
    const created = v2Api().create(input);
    if (structure.serverId !== undefined) {
      v2Api().updateMetadata(created.id, { serverId: structure.serverId });
    }
    // Note: V1-supplied id is dropped — V2 mints its own. V1 readers
    // re-select via the facade by V2's id, so the divergence is invisible.
  },

  updateStructure: (id, updates) => {
    const update: Parameters<BuiltEnvironmentV2State['updateMetadata']>[1] = {};
    if (updates.name !== undefined) update.label = updates.name;
    if (updates.notes !== undefined) update.notes = updates.notes;
    if (updates.serverId !== undefined) update.serverId = updates.serverId;
    const proposed = buildProposedFromStructure(updates);
    if (Object.keys(proposed).length > 0) update.proposed = proposed;
    v2Api().updateMetadata(id, update);
    if (updates.geometry) v2Api().updateGeometry(id, updates.geometry);
  },

  deleteStructure: (id) => v2Api().delete(id),

  setPlacementMode: (type) => set({ placementMode: type }),
}));

// ─────────────────────────────────────────────────────────────────────────
// V2 → V1 reprojection subscription.
// ─────────────────────────────────────────────────────────────────────────

useBuiltEnvironmentStoreV2.subscribe((s, prev) => {
  if (s.entities === prev.entities) return;
  useStructureStore.setState({ structures: projectToStructures(s.entities) });
});

// Note: `subscribe` only fires when the V2 state actually changes; the
// rehydrate dance below seeds the facade with whatever V2 had on disk
// (otherwise consumers that mount before rehydrate completes would see
// an empty list).

// V2's `persist` middleware runs rehydration asynchronously; trigger it
// explicitly so the facade picks up any pre-existing entities, then
// re-project.
void Promise.resolve(useBuiltEnvironmentStoreV2.persist.rehydrate()).then(() => {
  useStructureStore.setState({
    structures: projectToStructures(useBuiltEnvironmentStoreV2.getState().entities),
  });
});
