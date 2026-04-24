/**
 * Cascade-clone all design-intent data scoped to a project across stores.
 *
 * Called from projectStore.duplicateProject() to deep-copy the structures,
 * zones, paths, utilities, crops, paddocks, and phases that make up a
 * project's design — so the new project can be edited as a variant
 * without touching the original.
 *
 * Intentionally excluded (project-specific runtime state, not design intent):
 *   - comments / collaboration discussion
 *   - fieldwork entries / walk routes / punch list
 *   - portal config (public-facing publish settings)
 *   - scenarios (re-derived per project)
 *   - versions (snapshot history of original)
 *   - regeneration events (observation log)
 *
 * Spec: §1 "Duplicate project from template" (featureManifest.ts).
 */

import { useZoneStore, type LandZone } from './zoneStore.js';
import { useStructureStore, type Structure } from './structureStore.js';
import { useCropStore, type CropArea } from './cropStore.js';
import { useLivestockStore, type Paddock } from './livestockStore.js';
import { usePathStore, type DesignPath } from './pathStore.js';
import { usePhaseStore, type BuildPhase } from './phaseStore.js';
import { useUtilityStore, type Utility } from './utilityStore.js';

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Clone every design-intent entity scoped to `sourceProjectId` and re-attach
 * the copies to `targetProjectId`. Each clone gets a fresh id, fresh
 * timestamps, and `serverId` is dropped (the new project hasn't been synced).
 *
 * Operates synchronously across all stores. Errors in one store are logged
 * but do not abort the rest of the clone (best-effort, matches
 * cascadeDeleteProject's contract).
 */
export function cascadeCloneProject(sourceProjectId: string, targetProjectId: string): void {
  const errors: Array<{ store: string; error: unknown }> = [];
  const now = new Date().toISOString();

  const safeClone = (store: string, fn: () => void) => {
    try { fn(); } catch (err) { errors.push({ store, error: err }); }
  };

  safeClone('zones', () => {
    const sourceZones = useZoneStore.getState().zones.filter((z) => z.projectId === sourceProjectId);
    const cloned: LandZone[] = sourceZones.map((z) => {
      const { serverId: _serverId, ...rest } = z;
      return {
        ...rest,
        id: newId(),
        projectId: targetProjectId,
        createdAt: now,
        updatedAt: now,
      };
    });
    if (cloned.length > 0) {
      useZoneStore.setState((s) => ({ zones: [...s.zones, ...cloned] }));
    }
  });

  safeClone('structures', () => {
    const sourceStructures = useStructureStore.getState().structures.filter((st) => st.projectId === sourceProjectId);
    const cloned: Structure[] = sourceStructures.map((st) => {
      const { serverId: _serverId, ...rest } = st;
      return {
        ...rest,
        id: newId(),
        projectId: targetProjectId,
        createdAt: now,
        updatedAt: now,
      };
    });
    if (cloned.length > 0) {
      useStructureStore.setState((s) => ({ structures: [...s.structures, ...cloned] }));
    }
  });

  safeClone('crops', () => {
    const source = useCropStore.getState().cropAreas.filter((c) => c.projectId === sourceProjectId);
    const cloned: CropArea[] = source.map((c) => ({
      ...c,
      id: newId(),
      projectId: targetProjectId,
      createdAt: now,
      updatedAt: now,
    }));
    if (cloned.length > 0) {
      useCropStore.setState((s) => ({ cropAreas: [...s.cropAreas, ...cloned] }));
    }
  });

  safeClone('livestock', () => {
    const source = useLivestockStore.getState().paddocks.filter((p) => p.projectId === sourceProjectId);
    const cloned: Paddock[] = source.map((p) => ({
      ...p,
      id: newId(),
      projectId: targetProjectId,
      createdAt: now,
      updatedAt: now,
    }));
    if (cloned.length > 0) {
      useLivestockStore.setState((s) => ({ paddocks: [...s.paddocks, ...cloned] }));
    }
  });

  safeClone('paths', () => {
    const source = usePathStore.getState().paths.filter((p) => p.projectId === sourceProjectId);
    const cloned: DesignPath[] = source.map((p) => ({
      ...p,
      id: newId(),
      projectId: targetProjectId,
      createdAt: now,
      updatedAt: now,
    }));
    if (cloned.length > 0) {
      usePathStore.setState((s) => ({ paths: [...s.paths, ...cloned] }));
    }
  });

  safeClone('phases', () => {
    const source = usePhaseStore.getState().phases.filter((p) => p.projectId === sourceProjectId);
    const cloned: BuildPhase[] = source.map((p) => ({
      ...p,
      id: newId(),
      projectId: targetProjectId,
    }));
    if (cloned.length > 0) {
      usePhaseStore.setState((s) => ({ phases: [...s.phases, ...cloned] }));
    }
  });

  safeClone('utilities', () => {
    const source = useUtilityStore.getState().utilities.filter((u) => u.projectId === sourceProjectId);
    const cloned: Utility[] = source.map((u) => ({
      ...u,
      id: newId(),
      projectId: targetProjectId,
      createdAt: now,
      updatedAt: now,
    }));
    if (cloned.length > 0) {
      useUtilityStore.setState((s) => ({ utilities: [...s.utilities, ...cloned] }));
    }
  });

  if (errors.length > 0) {
    console.warn('[OGDEN] Cascade clone partial failures:', errors);
  }
}
