/**
 * Cascade-delete all project-scoped data across stores when a project is removed.
 *
 * Called from projectStore.deleteProject() to prevent orphaned records.
 */

import { geodataCache } from '../lib/geodataCache.js';
import { useZoneStore } from './zoneStore.js';
import {
  getStructuresForProject,
  removeStructure,
} from './builtEnvironmentSelectors.js';
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
import { useSiteDataStore } from './siteDataStore.js';
import { usePlanStratumProgressStore } from './planStratumStore.js';
import { useActTaskStore } from './olos/actTaskStore.js';
import { useProofRecordStore } from './olos/proofRecordStore.js';
import { useVerificationRecordStore } from './olos/verificationRecordStore.js';
import { useEscalationRecordStore } from './olos/escalationRecordStore.js';
import { useStewardshipRoutineStore } from './olos/stewardshipRoutineStore.js';
import { useObservationRecordStore } from './olos/observationRecordStore.js';
import { usePlanDecisionRecordStore } from './olos/planDecisionRecordStore.js';
import { useActHandoffPackageStore } from './olos/actHandoffPackageStore.js';
import { useChecklistProgressStore } from './olos/checklistProgressStore.js';

export function cascadeDeleteProject(projectId: string): void {
  const errors: Array<{ store: string; error: unknown }> = [];

  const safeDelete = (store: string, fn: () => void) => {
    try { fn(); } catch (err) { errors.push({ store, error: err }); }
  };

  safeDelete('zones', () => useZoneStore.setState((s) => ({
    zones: s.zones.filter((z) => z.projectId !== projectId),
  })));

  safeDelete('structures', () => {
    getStructuresForProject(projectId).forEach((s) => removeStructure(s.id));
  });

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

  // ── OLOS Act/Plan/Observe stores (keyed `byProject[projectId]`) ────────────
  // These were previously orphaned on hard-delete: each is a project-keyed map,
  // so clearing is a single key drop. (Server rows already cascade via the
  // project FK; this purges the local persisted cache.)
  safeDelete('olos:actTasks', () => useActTaskStore.setState((s) => {
    const { [projectId]: _drop, ...byProject } = s.byProject;
    return { byProject };
  }));

  safeDelete('olos:proofs', () => useProofRecordStore.setState((s) => {
    const { [projectId]: _drop, ...byProject } = s.byProject;
    return { byProject };
  }));

  safeDelete('olos:verifications', () => useVerificationRecordStore.setState((s) => {
    const { [projectId]: _drop, ...byProject } = s.byProject;
    return { byProject };
  }));

  safeDelete('olos:escalations', () => useEscalationRecordStore.setState((s) => {
    const { [projectId]: _drop, ...byProject } = s.byProject;
    return { byProject };
  }));

  safeDelete('olos:routines', () => useStewardshipRoutineStore.setState((s) => {
    const { [projectId]: _drop, ...byProject } = s.byProject;
    return { byProject };
  }));

  safeDelete('olos:observations', () => useObservationRecordStore.setState((s) => {
    const { [projectId]: _drop, ...byProject } = s.byProject;
    return { byProject };
  }));

  safeDelete('olos:planDecisions', () => usePlanDecisionRecordStore.setState((s) => {
    const { [projectId]: _drop, ...byProject } = s.byProject;
    return { byProject };
  }));

  safeDelete('olos:handoffPackages', () => useActHandoffPackageStore.setState((s) => {
    const { [projectId]: _drop, ...byProject } = s.byProject;
    return { byProject };
  }));

  safeDelete('olos:checklistProgress', () => useChecklistProgressStore.setState((s) => {
    const { [projectId]: _drop, ...byProject } = s.byProject;
    return { byProject };
  }));

  // planStratumStore keeps FOUR project-keyed maps — drop the key from each.
  safeDelete('planStratumProgress', () => usePlanStratumProgressStore.setState((s) => {
    const { [projectId]: _b, ...byProject } = s.byProject;
    const { [projectId]: _c, ...celebratedByProject } = s.celebratedByProject;
    const { [projectId]: _d, ...deferredByProject } = s.deferredByProject;
    const { [projectId]: _v, ...valuesByProject } = s.valuesByProject;
    return { byProject, celebratedByProject, deferredByProject, valuesByProject };
  }));

  // siteDataStore exposes its own project-level clear.
  safeDelete('siteData', () => useSiteDataStore.getState().clearProject(projectId));

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
