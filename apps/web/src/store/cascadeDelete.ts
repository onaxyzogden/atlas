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
import { useSoilSampleStore } from './soilSampleStore.js';
import { useUtilityStore } from './utilityStore.js';
import { useVersionStore } from './versionStore.js';

export function cascadeDeleteProject(projectId: string): void {
  const errors: Array<{ store: string; error: unknown }> = [];

  const safeDelete = (store: string, fn: () => void) => {
    try { fn(); } catch (err) { errors.push({ store, error: err }); }
  };

  safeDelete('zones', () => useZoneStore.setState((s) => ({
    zones: s.zones.filter((z) => z.projectId !== projectId),
  })));

  safeDelete('structures', () => useStructureStore.setState((s) => ({
    structures: s.structures.filter((st) => st.projectId !== projectId),
  })));

  safeDelete('comments', () => useCommentStore.setState((s) => ({
    comments: s.comments.filter((c) => c.projectId !== projectId),
  })));

  safeDelete('crops', () => useCropStore.setState((s) => ({
    cropAreas: s.cropAreas.filter((c) => c.projectId !== projectId),
  })));

  safeDelete('fieldwork', () => useFieldworkStore.setState((s) => ({
    entries: s.entries.filter((e) => e.projectId !== projectId),
    walkRoutes: s.walkRoutes.filter((r) => r.projectId !== projectId),
    punchList: s.punchList.filter((p) => p.projectId !== projectId),
  })));

  safeDelete('livestock', () => useLivestockStore.setState((s) => ({
    paddocks: s.paddocks.filter((p) => p.projectId !== projectId),
  })));

  safeDelete('paths', () => usePathStore.setState((s) => ({
    paths: s.paths.filter((p) => p.projectId !== projectId),
  })));

  safeDelete('phases', () => usePhaseStore.setState((s) => ({
    phases: s.phases.filter((p) => p.projectId !== projectId),
  })));

  safeDelete('portal', () => usePortalStore.getState().deleteConfig(projectId));

  safeDelete('scenarios', () => useScenarioStore.setState((s) => ({
    scenarios: s.scenarios.filter((sc) => sc.projectId !== projectId),
  })));

  safeDelete('soilSamples', () => useSoilSampleStore.setState((s) => ({
    samples: s.samples.filter((sm) => sm.projectId !== projectId),
  })));

  safeDelete('utilities', () => useUtilityStore.setState((s) => ({
    utilities: s.utilities.filter((u) => u.projectId !== projectId),
  })));

  safeDelete('versions', () => useVersionStore.setState((s) => ({
    snapshots: s.snapshots.filter((sn) => sn.projectId !== projectId),
  })));

  if (errors.length > 0) {
    console.warn('[OGDEN] Cascade delete partial failures:', errors);
  }

  // IndexedDB geospatial blobs (fire-and-forget — non-blocking)
  geodataCache.remove(`boundary:${projectId}`).catch((err) => {
    console.warn('[OGDEN] Failed to remove boundary cache:', err);
  });
  geodataCache.removeByPrefix(`attachment:${projectId}:`).catch((err) => {
    console.warn('[OGDEN] Failed to remove attachment cache:', err);
  });
}
