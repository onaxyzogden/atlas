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
  type ProjectedBuilding,
  type ProjectedWell,
  type ProjectedSeptic,
  type ProjectedPowerLine,
  type ProjectedBuriedUtility,
  type ProjectedFence,
  type ProjectedGate,
  type ProjectedExistingDriveway,
} from '@ogden/shared';
import { useBuiltEnvironmentStoreV2 } from './builtEnvironmentStoreV2.js';

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
