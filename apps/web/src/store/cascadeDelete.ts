/**
 * Cascade-delete all project-scoped data across stores when a project is removed.
 *
 * Called from projectStore.deleteProject() to prevent orphaned records.
 */

import { geodataCache } from '../lib/geodataCache.js';
import { useZoneStore } from './zoneStore.js';
import { useStructureStore } from './structureStore.js';
import { useCommentStore } from './commentStore.js';
import { useCropStore } from './cropStore.js';
import { useFieldworkStore } from './fieldworkStore.js';
import { useLivestockStore } from './livestockStore.js';
import { usePathStore } from './pathStore.js';
import { usePhaseStore } from './phaseStore.js';
import { usePortalStore } from './portalStore.js';
import { useScenarioStore } from './scenarioStore.js';
import { useUtilityStore } from './utilityStore.js';
import { useVersionStore } from './versionStore.js';

export function cascadeDeleteProject(projectId: string): void {
  // Zones
  useZoneStore.setState((s) => ({
    zones: s.zones.filter((z) => z.projectId !== projectId),
  }));

  // Structures
  useStructureStore.setState((s) => ({
    structures: s.structures.filter((st) => st.projectId !== projectId),
  }));

  // Comments
  useCommentStore.setState((s) => ({
    comments: s.comments.filter((c) => c.projectId !== projectId),
  }));

  // Crops
  useCropStore.setState((s) => ({
    cropAreas: s.cropAreas.filter((c) => c.projectId !== projectId),
  }));

  // Fieldwork (entries, walkRoutes, punchList)
  useFieldworkStore.setState((s) => ({
    entries: s.entries.filter((e) => e.projectId !== projectId),
    walkRoutes: s.walkRoutes.filter((r) => r.projectId !== projectId),
    punchList: s.punchList.filter((p) => p.projectId !== projectId),
  }));

  // Livestock
  useLivestockStore.setState((s) => ({
    paddocks: s.paddocks.filter((p) => p.projectId !== projectId),
  }));

  // Paths
  usePathStore.setState((s) => ({
    paths: s.paths.filter((p) => p.projectId !== projectId),
  }));

  // Phases
  usePhaseStore.setState((s) => ({
    phases: s.phases.filter((p) => p.projectId !== projectId),
  }));

  // Portal
  usePortalStore.getState().deleteConfig(projectId);

  // Scenarios
  useScenarioStore.setState((s) => ({
    scenarios: s.scenarios.filter((sc) => sc.projectId !== projectId),
  }));

  // Utilities
  useUtilityStore.setState((s) => ({
    utilities: s.utilities.filter((u) => u.projectId !== projectId),
  }));

  // Version snapshots
  useVersionStore.setState((s) => ({
    snapshots: s.snapshots.filter((sn) => sn.projectId !== projectId),
  }));

  // IndexedDB geospatial blobs (fire-and-forget — non-blocking)
  geodataCache.remove(`boundary:${projectId}`).catch(() => {});
  geodataCache.removeByPrefix(`attachment:${projectId}:`).catch(() => {});
}
