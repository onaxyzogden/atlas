/**
 * builtEnvironmentSelectors — V2-direct read paths for the legacy V1 slices.
 *
 * Phase 6.B of the Built Environment unification (ADR
 * `wiki/decisions/2026-05-10-atlas-built-environment-unification.md`).
 *
 * Until now, consumers reading Observe / Plan BE data subscribed to the
 * V1 facades (`useBuiltEnvironmentStore`, `useStructureStore`,
 * `useDesignElementsStore`) which internally re-projected from V2 on
 * every update. That pattern works but the facade files are the last
 * thing standing between us and deleting ~1.5k lines of V1 shape code.
 *
 * This module exposes the same V1-shape projections directly from V2.
 * Consumers migrate file-by-file off the facades; once every reader is
 * migrated, the three V1 facades + their tests can be deleted in one
 * sweep.
 *
 * Two flavours per slice:
 *   - `getXxxForProject(projectId)`     — non-React, one-shot read via
 *                                          `useBuiltEnvironmentStoreV2.getState()`.
 *                                          Use inside pure helpers, event
 *                                          handlers, or anywhere a
 *                                          subscription is not needed.
 *   - `useXxxForProject(projectId)`     — React hook, subscribes to the
 *                                          V2 `entities` array and
 *                                          re-projects via `useMemo` keyed
 *                                          on the entities reference +
 *                                          projectId, so the result
 *                                          identity is stable when nothing
 *                                          changed.
 *
 * The projection functions themselves live in `@ogden/shared`
 * (`builtEnvironmentProjection.ts`) — this file is just the React+Zustand
 * surface. Projections are pure and already cover state+kind filtering;
 * we filter by projectId here.
 */

import { useMemo } from 'react';
import {
  projectToBuildings,
  projectToWells,
  projectToSeptics,
  projectToPowerLines,
  projectToBuriedUtilities,
  projectToFences,
  projectToGates,
  projectToExistingDriveways,
  projectToDesignElementsByProject,
  projectToStructures,
  canonicalizeKind,
  type ProjectedBuilding,
  type ProjectedWell,
  type ProjectedSeptic,
  type ProjectedPowerLine,
  type ProjectedBuriedUtility,
  type ProjectedFence,
  type ProjectedGate,
  type ProjectedExistingDriveway,
  type ProjectedStructure,
  type BuiltEnvironmentEntity,
  type CreateBuiltEnvironmentInput,
  type ProposedMetadata,
  type StructureType,
} from '@ogden/shared';
import { useBuiltEnvironmentStoreV2 } from './builtEnvironmentStoreV2.js';
import { type DesignElement } from './designElementsStore.js';
import { useLandDesignStore } from './landDesignStore.js';
import type { ProjectedStructure as Structure } from '@ogden/shared';
import type { DesignCategory } from '../v3/plan/canvas/elementCatalog.js';
import type { PhaseKey, PlanView } from '../v3/plan/types.js';

// ─────────────────────────────────────────────────────────────────────────
// Non-React, one-shot readers
// ─────────────────────────────────────────────────────────────────────────

export function getBuildingsForProject(projectId: string): ProjectedBuilding[] {
  return projectToBuildings(
    useBuiltEnvironmentStoreV2.getState().entities,
  ).filter((b) => b.projectId === projectId);
}

export function getWellsForProject(projectId: string): ProjectedWell[] {
  return projectToWells(useBuiltEnvironmentStoreV2.getState().entities).filter(
    (w) => w.projectId === projectId,
  );
}

export function getSepticsForProject(projectId: string): ProjectedSeptic[] {
  return projectToSeptics(useBuiltEnvironmentStoreV2.getState().entities).filter(
    (s) => s.projectId === projectId,
  );
}

export function getPowerLinesForProject(projectId: string): ProjectedPowerLine[] {
  return projectToPowerLines(
    useBuiltEnvironmentStoreV2.getState().entities,
  ).filter((p) => p.projectId === projectId);
}

export function getBuriedUtilitiesForProject(
  projectId: string,
): ProjectedBuriedUtility[] {
  return projectToBuriedUtilities(
    useBuiltEnvironmentStoreV2.getState().entities,
  ).filter((u) => u.projectId === projectId);
}

export function getFencesForProject(projectId: string): ProjectedFence[] {
  return projectToFences(useBuiltEnvironmentStoreV2.getState().entities).filter(
    (f) => f.projectId === projectId,
  );
}

export function getGatesForProject(projectId: string): ProjectedGate[] {
  return projectToGates(useBuiltEnvironmentStoreV2.getState().entities).filter(
    (g) => g.projectId === projectId,
  );
}

export function getExistingDrivewaysForProject(
  projectId: string,
): ProjectedExistingDriveway[] {
  return projectToExistingDriveways(
    useBuiltEnvironmentStoreV2.getState().entities,
  ).filter((d) => d.projectId === projectId);
}

// ─────────────────────────────────────────────────────────────────────────
// React hooks — subscribe + project + memoize
// ─────────────────────────────────────────────────────────────────────────

export function useBuildingsForProject(projectId: string): ProjectedBuilding[] {
  const entities = useBuiltEnvironmentStoreV2((s) => s.entities);
  return useMemo(
    () => projectToBuildings(entities).filter((b) => b.projectId === projectId),
    [entities, projectId],
  );
}

export function useWellsForProject(projectId: string): ProjectedWell[] {
  const entities = useBuiltEnvironmentStoreV2((s) => s.entities);
  return useMemo(
    () => projectToWells(entities).filter((w) => w.projectId === projectId),
    [entities, projectId],
  );
}

export function useSepticsForProject(projectId: string): ProjectedSeptic[] {
  const entities = useBuiltEnvironmentStoreV2((s) => s.entities);
  return useMemo(
    () => projectToSeptics(entities).filter((s) => s.projectId === projectId),
    [entities, projectId],
  );
}

export function usePowerLinesForProject(projectId: string): ProjectedPowerLine[] {
  const entities = useBuiltEnvironmentStoreV2((s) => s.entities);
  return useMemo(
    () => projectToPowerLines(entities).filter((p) => p.projectId === projectId),
    [entities, projectId],
  );
}

export function useBuriedUtilitiesForProject(
  projectId: string,
): ProjectedBuriedUtility[] {
  const entities = useBuiltEnvironmentStoreV2((s) => s.entities);
  return useMemo(
    () =>
      projectToBuriedUtilities(entities).filter((u) => u.projectId === projectId),
    [entities, projectId],
  );
}

export function useFencesForProject(projectId: string): ProjectedFence[] {
  const entities = useBuiltEnvironmentStoreV2((s) => s.entities);
  return useMemo(
    () => projectToFences(entities).filter((f) => f.projectId === projectId),
    [entities, projectId],
  );
}

export function useGatesForProject(projectId: string): ProjectedGate[] {
  const entities = useBuiltEnvironmentStoreV2((s) => s.entities);
  return useMemo(
    () => projectToGates(entities).filter((g) => g.projectId === projectId),
    [entities, projectId],
  );
}

export function useExistingDrivewaysForProject(
  projectId: string,
): ProjectedExistingDriveway[] {
  const entities = useBuiltEnvironmentStoreV2((s) => s.entities);
  return useMemo(
    () =>
      projectToExistingDriveways(entities).filter(
        (d) => d.projectId === projectId,
      ),
    [entities, projectId],
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 6.B — Structure + DesignElement project-filtered selectors
//
// Structure (since 2026-05-12 ProjectedStructure narrowing): reads direct
// from V2 via `projectToStructures`. `Structure` is now an alias for
// `ProjectedStructure` and `ProjectedStructure.type` is narrowed to
// `StructureType`, so consumers get the same type safety they had through
// the V1 facade without the facade's projection subscribe-dance.
//
// DesignElement (since 2026-05-12 landDesignStore extraction): merges V2
// structure-class entities (projected here via `projectToDesignElementsByProject`)
// with non-structure entries sourced directly from `useLandDesignStore`.
// No longer routes through the V1 `useDesignElementsStore` facade — that
// facade was deleted on the same date.
// ─────────────────────────────────────────────────────────────────────────

const EMPTY_DESIGN_ELEMENTS: DesignElement[] = [];
const EMPTY_STRUCTURES: Structure[] = [];

export function getStructuresForProject(projectId: string): Structure[] {
  const entities = useBuiltEnvironmentStoreV2.getState().entities;
  const projected = projectToStructures(entities).filter(
    (s) => s.projectId === projectId,
  );
  return projected.length === 0 ? EMPTY_STRUCTURES : projected;
}

export function useStructuresForProject(projectId: string): Structure[] {
  const entities = useBuiltEnvironmentStoreV2((s) => s.entities);
  return useMemo(() => {
    const projected = projectToStructures(entities).filter(
      (s) => s.projectId === projectId,
    );
    return projected.length === 0 ? EMPTY_STRUCTURES : projected;
  }, [entities, projectId]);
}

/** Read every structure across all projects. Non-React; one-shot. Used by
 *  call sites that need to iterate / filter by something other than
 *  projectId (e.g. by id, by kind, by bounding-box intersection). */
export function getAllStructures(): Structure[] {
  const entities = useBuiltEnvironmentStoreV2.getState().entities;
  const projected = projectToStructures(entities);
  return projected.length === 0 ? EMPTY_STRUCTURES : projected;
}

/** Subscribe to every structure across all projects. React hook. Use only
 *  when a project-filtered read is genuinely not possible — otherwise
 *  prefer `useStructuresForProject(projectId)` for narrower re-render
 *  scope. */
export function useAllStructures(): Structure[] {
  const entities = useBuiltEnvironmentStoreV2((s) => s.entities);
  return useMemo(() => {
    const projected = projectToStructures(entities);
    return projected.length === 0 ? EMPTY_STRUCTURES : projected;
  }, [entities]);
}

/** Locate a structure by id across every project (ids are globally unique
 *  within V2). Non-React; one-shot. */
export function findStructureGlobal(
  id: string,
): { projectId: string; structure: Structure } | null {
  const entities = useBuiltEnvironmentStoreV2.getState().entities;
  const entity = entities.find((e) => e.id === id);
  if (!entity) return null;
  const projected = projectToStructures([entity])[0];
  if (!projected) return null;
  return { projectId: entity.projectId, structure: projected };
}

// ─────────────────────────────────────────────────────────────────────────
// Structure writers — replicate the V1 facade's add/update/delete routing
// so consumer call sites can migrate off `useStructureStore`. Same V1 → V2
// kind translation logic as `structureStore.ts` (snake_case StructureType
// → kebab-case V2 kind via `canonicalizeKind`).
// ─────────────────────────────────────────────────────────────────────────

function structureTypeToV2Kind(t: StructureType): string {
  return canonicalizeKind(t) ?? canonicalizeKind(t.replace(/_/g, '-')) ?? t;
}

function buildProposedFromStructure(s: Partial<Structure>): ProposedMetadata {
  const m: ProposedMetadata = {};
  if (typeof s.rotationDeg === 'number') m.rotationDeg = s.rotationDeg;
  if (typeof s.widthM === 'number') m.widthM = s.widthM;
  if (typeof s.depthM === 'number') m.depthM = s.depthM;
  if (typeof s.heightM === 'number') m.heightM = s.heightM;
  if (typeof s.storiesCount === 'number') m.storiesCount = s.storiesCount;
  if (typeof s.costEstimate === 'number') m.costEstimate = s.costEstimate;
  if (typeof s.laborHoursEstimate === 'number') {
    m.laborHoursEstimate = s.laborHoursEstimate;
  }
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

/** Add a proposed structure to V2. Mirrors the V1 facade's `addStructure`. */
export function addStructure(structure: Structure): void {
  const v2 = useBuiltEnvironmentStoreV2.getState();
  const proposed = buildProposedFromStructure(structure);
  const input: Parameters<typeof v2.create>[0] = {
    projectId: structure.projectId,
    kind: structureTypeToV2Kind(structure.type),
    state: 'proposed',
    geometry: structure.geometry,
    proposed,
  };
  if (structure.name !== undefined) input.label = structure.name;
  if (structure.notes !== undefined) input.notes = structure.notes;
  const created = v2.create(input);
  if (structure.serverId !== undefined) {
    v2.updateMetadata(created.id, { serverId: structure.serverId });
  }
}

/** Patch a proposed structure in V2. Mirrors the V1 facade's
 *  `updateStructure` (metadata + optional geometry). */
export function updateStructure(
  id: string,
  updates: Partial<Structure>,
): void {
  const v2 = useBuiltEnvironmentStoreV2.getState();
  const update: Parameters<typeof v2.updateMetadata>[1] = {};
  if (updates.name !== undefined) update.label = updates.name;
  if (updates.notes !== undefined) update.notes = updates.notes;
  if (updates.serverId !== undefined) update.serverId = updates.serverId;
  const proposed = buildProposedFromStructure(updates);
  if (Object.keys(proposed).length > 0) update.proposed = proposed;
  v2.updateMetadata(id, update);
  if (updates.geometry) v2.updateGeometry(id, updates.geometry);
}

/** Delete a proposed structure from V2. */
export function removeStructure(id: string): void {
  useBuiltEnvironmentStoreV2.getState().delete(id);
}

// Re-export `ProjectedStructure` so consumers migrating off the V1 facade
// can pick up the canonical type from a single import path.
export type { ProjectedStructure };

/** Project V2 structure-class entities to DesignElement shape for a single
 *  project. Mirrors the projection the V1 facade does internally. */
function projectV2StructureDesignElements(
  entities: BuiltEnvironmentEntity[],
  projectId: string,
): DesignElement[] {
  const byProject = projectToDesignElementsByProject(entities);
  const list = byProject[projectId];
  if (!list || list.length === 0) return [];
  return list.map((p) => ({
    id: p.id,
    category: 'structure' as DesignCategory,
    kind: p.kind,
    geometry: p.geometry,
    phase: (p.phase as PhaseKey) ?? ('building' as PhaseKey),
    label: p.label,
    createdAt: p.createdAt,
    view: 'current' as PlanView,
  }));
}

export function getDesignElementsForProject(projectId: string): DesignElement[] {
  const entities = useBuiltEnvironmentStoreV2.getState().entities;
  const v2 = projectV2StructureDesignElements(entities, projectId);
  const land = useLandDesignStore.getState().byProject[projectId] ?? [];
  if (v2.length === 0) return land;
  if (land.length === 0) return v2;
  return [...land, ...v2];
}

export function useDesignElementsForProject(
  projectId: string,
): DesignElement[] {
  const entities = useBuiltEnvironmentStoreV2((s) => s.entities);
  const land = useLandDesignStore(
    (s) => s.byProject[projectId] ?? EMPTY_DESIGN_ELEMENTS,
  );
  return useMemo(() => {
    const v2 = projectV2StructureDesignElements(entities, projectId);
    if (v2.length === 0) return land;
    if (land.length === 0) return v2;
    return [...land, ...v2];
  }, [entities, land, projectId]);
}

// ─────────────────────────────────────────────────────────────────────────
// DesignElement writers — replicate the V1 facade's add/remove/update
// routing logic so consumer call sites can migrate off
// `useDesignElementsStore`. Structure-class kinds route to V2; everything
// else routes to `useLandDesignStore`. Same behavior the V1 facade
// implements internally — extracted here so the facade can retire.
// ─────────────────────────────────────────────────────────────────────────

const STRUCTURE_CLASS_KINDS: ReadonlySet<string> = new Set([
  'yurt',
  'greenhouse',
  'barn',
  'shed',
  'machinery-shed',
  'fuel-station',
  'equipment-yard',
  'water-tank',
  'parking',
  'prayer-pavilion',
  'fire-circle',
  'compost',
]);

function isStructureClassKind(kind: string): boolean {
  const canonical = canonicalizeKind(kind) ?? kind;
  return STRUCTURE_CLASS_KINDS.has(canonical);
}

/** Add a design element. Structure-class kinds go to V2 as a `proposed`
 *  entity; everything else goes to `useLandDesignStore`. */
export function addDesignElement(
  projectId: string,
  el: DesignElement,
): void {
  if (isStructureClassKind(el.kind)) {
    const proposed: ProposedMetadata = {};
    if (typeof el.phase === 'string') proposed.phase = el.phase;
    const canonical = canonicalizeKind(el.kind) ?? el.kind;
    useBuiltEnvironmentStoreV2.getState().create({
      projectId,
      kind: canonical,
      state: 'proposed',
      geometry: el.geometry,
      label: el.label,
      proposed,
    });
    return;
  }
  useLandDesignStore.getState().add(projectId, el);
}

/** Bulk-add design elements. Splits the input by category routing
 *  (structure-class → BE V2, everything else → landDesign) and writes
 *  each store with a single `set()` so the canvas re-renders once per
 *  category instead of N times. Used by the polygon-fill stamp path
 *  in `useDesignElementDrawTool.ts`. */
export function addDesignElements(
  projectId: string,
  elements: DesignElement[],
): void {
  if (elements.length === 0) return;
  const v2Inputs: CreateBuiltEnvironmentInput[] = [];
  const landInputs: DesignElement[] = [];
  for (const el of elements) {
    if (isStructureClassKind(el.kind)) {
      const proposed: ProposedMetadata = {};
      if (typeof el.phase === 'string') proposed.phase = el.phase;
      const canonical = canonicalizeKind(el.kind) ?? el.kind;
      v2Inputs.push({
        projectId,
        kind: canonical,
        state: 'proposed',
        geometry: el.geometry,
        label: el.label,
        proposed,
      });
    } else {
      landInputs.push(el);
    }
  }
  if (v2Inputs.length > 0) {
    useBuiltEnvironmentStoreV2.getState().createMany(v2Inputs);
  }
  if (landInputs.length > 0) {
    useLandDesignStore.getState().addMany(projectId, landInputs);
  }
}

/** Remove a design element. Tries V2 first (structure-class); if the id
 *  isn't a V2 entity for this project, falls through to landDesignStore. */
export function removeDesignElement(projectId: string, id: string): void {
  const v2 = useBuiltEnvironmentStoreV2.getState();
  const inV2 = v2.entities.some(
    (e) => e.id === id && e.projectId === projectId,
  );
  if (inV2) {
    v2.delete(id);
    return;
  }
  useLandDesignStore.getState().remove(projectId, id);
}

/** Patch a design element. Structure-class kinds are owned by V2 and
 *  edited through `useBuiltEnvironmentStoreV2` directly — this writer is a
 *  no-op for those ids, matching the V1 facade's behavior. */
export function updateDesignElement(
  projectId: string,
  id: string,
  patch: Partial<Omit<DesignElement, 'id'>>,
): void {
  useLandDesignStore.getState().update(projectId, id, patch);
}

/** Locate a design element by id across every project (ids are globally
 *  unique). Searches V2 structure-class entities first, then landDesignStore.
 *  Returns `{ projectId, element } | null`. Non-React; one-shot. */
export function findDesignElementGlobal(
  id: string,
): { projectId: string; element: DesignElement } | null {
  // V2 first — covers structure-class kinds.
  const v2Entity = useBuiltEnvironmentStoreV2
    .getState()
    .entities.find((e) => e.id === id);
  if (v2Entity) {
    const projected = projectV2StructureDesignElements(
      [v2Entity],
      v2Entity.projectId,
    );
    const element = projected[0];
    if (element) return { projectId: v2Entity.projectId, element };
  }
  // landDesignStore — covers paddock / pond / swale / road / …
  const byProject = useLandDesignStore.getState().byProject;
  for (const [projectId, list] of Object.entries(byProject)) {
    const element = list.find((e) => e.id === id);
    if (element) return { projectId, element };
  }
  return null;
}
