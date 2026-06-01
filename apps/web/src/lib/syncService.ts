/**
 * SyncService — orchestrates backend synchronization for projectStore,
 * zoneStore, and structureStore.
 *
 * Architecture: standalone service that subscribes to Zustand store changes,
 * diffs state, fires API calls, and manages the retry queue. The stores
 * remain pure local state managers — this module is the only bridge to the
 * backend.
 *
 * Three responsibilities:
 *   A. Write-through sync (store → API on every mutation)
 *   B. Initial fetch & merge (API → store on app load)
 *   C. Online/offline resilience (queue + flush on reconnect)
 */

import { api } from './apiClient.js';
import {
  syncQueue,
  describeSyncError,
  derivePriority,
  type QueuedOperation,
  type RecordTierFields,
  type SyncStoreType,
} from './syncQueue.js';
import { pushProjectStateBlob, buildBlobEnvelope, blobLocalId } from './blobSync.js';
import { recordLocalId, buildRecordEnvelope, pushSyncedRecord } from './recordSync.js';
import {
  SYNCED_STORES,
  type SyncedStoreDescriptor,
  type SyncedRecordMeta,
} from './syncManifest.js';
import { useProjectStore, type LocalProject } from '../store/projectStore.js';
import { useZoneStore, type LandZone } from '../store/zoneStore.js';
import { usePathStore, type DesignPath } from '../store/pathStore.js';
import { useUtilityStore, type Utility } from '../store/utilityStore.js';
import { useVegetationStore, type VegetationPatch } from '../store/vegetationStore.js';
import { useSuccessionStore, type SuccessionMilestone } from '../store/successionStore.js';
import type {
  ProjectedStructure as Structure,
  SyncedRecord,
  ConflictListItem,
  ResolveConflictResult,
  ConflictResolutionChoice,
} from '@ogden/shared';
import { useBuiltEnvironmentStoreV2 } from '../store/builtEnvironmentStoreV2.js';
import {
  addStructure,
  updateStructure,
  getAllStructures,
} from '../store/builtEnvironmentSelectors.js';
import { projectToStructures } from '@ogden/shared';
import { useConnectivityStore } from '../store/connectivityStore.js';
import { toast } from '../components/Toast';
import { precacheProjectTiles } from './tilePrecache.js';
import { FLAGS, type CreateDesignFeatureInput, type DesignFeatureSummary } from '@ogden/shared';
import * as turf from '@turf/turf';
import {
  zoneToDesignFeature,
  structureToDesignFeature,
  designFeatureToZone,
  designFeatureToStructure,
  pathToDesignFeature,
  designFeatureToPath,
  utilityToDesignFeature,
  designFeatureToPoint,
} from './featureMapping.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extract [west, south, east, north] bounding box from a GeoJSON object. */
function getBboxFromGeojson(geojson: unknown): [number, number, number, number] | null {
  try {
    const parsed = typeof geojson === 'string' ? JSON.parse(geojson) : geojson;
    if (!parsed || typeof parsed !== 'object') return null;
    const box = turf.bbox(parsed as GeoJSON.GeoJSON);
    if (box.length >= 4 && isFinite(box[0]) && isFinite(box[1]) && isFinite(box[2]) && isFinite(box[3])) {
      return [box[0], box[1], box[2], box[3]];
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Internal state ──────────────────────────────────────────────────────────

/** Guard flag: true while the sync service is writing to stores (prevents
 *  recursive subscription triggers). */
let isSyncing = false;

/** Allow external modules (e.g., wsService) to set the sync guard. */
export function setSyncGuard(value: boolean) { isSyncing = value; }

/**
 * In-flight project-create dedup. Keyed by local project id. Guarantees that the
 * store subscription, the boot catch-up, and any explicit `syncProjectNow` caller
 * can never fire two concurrent `POST /projects` for the same local project (the
 * double-create race). A second caller awaits the same promise.
 */
const inFlightProjectSync = new Map<string, Promise<void>>();

/** Subscription unsubscribe functions */
let unsubscribers: (() => void)[] = [];

/** Heartbeat timer for periodic queue flush */
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

const HEARTBEAT_INTERVAL_MS = 30_000;

// ─── A. Write-through sync (store subscribers) ───────────────────────────────

function diffArrayById<T extends { id: string }>(
  curr: T[],
  prev: T[],
): { added: T[]; removed: T[]; updated: T[] } {
  const prevMap = new Map(prev.map((item) => [item.id, item]));
  const currMap = new Map(curr.map((item) => [item.id, item]));

  const added: T[] = [];
  const updated: T[] = [];
  const removed: T[] = [];

  for (const item of curr) {
    const prevItem = prevMap.get(item.id);
    if (!prevItem) {
      added.push(item);
    } else if ((item as unknown as { updatedAt: string }).updatedAt !== (prevItem as unknown as { updatedAt: string }).updatedAt) {
      updated.push(item);
    }
  }

  for (const item of prev) {
    if (!currMap.has(item.id)) {
      removed.push(item);
    }
  }

  return { added, removed, updated };
}

function getProjectServerId(projectLocalId: string): string | undefined {
  const project = useProjectStore.getState().projects.find((p) => p.id === projectLocalId);
  return project?.serverId;
}

/** The currently-active project (the one whose Act surface is open). */
function getActiveProject(): LocalProject | undefined {
  const st = useProjectStore.getState();
  return st.projects.find((p) => p.id === st.activeProjectId);
}

/**
 * ADR 7 Phase 4 — list every open (escalated) per-record conflict for the
 * active project, for the dedicated Conflicts panel. Side-effect: reconciles
 * the Connectivity badge (`conflictedStores`) to exactly the stores that still
 * have an open conflict, so resolving the last one clears the badge.
 */
export async function listRecordConflicts(): Promise<ConflictListItem[]> {
  const active = getActiveProject();
  const serverId = active?.serverId;
  if (!serverId) return [];
  const { data } = await api.actRecords.listConflicts(serverId);
  useConnectivityStore.getState().setConflictedStores(data.map((c) => c.storeKey));
  return data;
}

/**
 * ADR 7 Phase 4 — resolve one escalated conflict by the steward's
 * Keep-mine/Keep-server choice, then converge local state. We re-hydrate the
 * affected store from the server (the authoritative post-resolution state) via
 * the existing tested apply path — keep_mine adopts the reinstated local copy at
 * its new rev, keep_server adopts the server copy — then refresh the badge.
 */
export async function resolveRecordConflict(
  item: ConflictListItem,
  choice: ConflictResolutionChoice,
): Promise<ResolveConflictResult> {
  const active = getActiveProject();
  const serverId = active?.serverId;
  if (!active || !serverId) {
    throw new Error('[SYNC] resolveRecordConflict: no active project with a serverId');
  }
  const { data } = await api.actRecords.resolveConflict(serverId, item.syncLogId, { choice });
  const desc = SYNCED_STORES.find((d) => d.storeKey === data.storeKey);
  // Converge via the existing tested apply path. `active` is a full LocalProject
  // (narrowed non-undefined above), exactly what hydrateActRecords consumes at
  // its other call site — no synthesized partial.
  if (desc) await hydrateActRecords(active, [desc]);
  await listRecordConflicts();
  return data;
}

function subscribeToProjects() {
  let prevProjects = useProjectStore.getState().projects;

  return useProjectStore.subscribe((state) => {
    if (isSyncing) return;
    const curr = state.projects;
    const prevById = new Map(prevProjects.map((p) => [p.id, p]));
    const { added, removed, updated } = diffArrayById(curr, prevProjects);
    prevProjects = curr;

    for (const project of added) {
      // Route through the canonical path so the serverId short-circuit + the
      // in-flight lock dedup against any explicit syncProjectNow caller (wizard
      // "Create", Portfolio "Sync now") — removes the double-create race.
      void syncProjectNow(project.id);
    }
    for (const project of updated) {
      syncProjectUpdate(project);
      // Boundary lives on a dedicated PostGIS endpoint (recomputes
      // acreage/centroid + re-enqueues the Tier-1 pipeline), so only
      // push it when it actually changed — not on every name/notes edit.
      const prev = prevById.get(project.id);
      const boundaryChanged =
        JSON.stringify(prev?.parcelBoundaryGeojson ?? null) !==
        JSON.stringify(project.parcelBoundaryGeojson ?? null);
      if (boundaryChanged) syncProjectBoundary(project);
    }
    for (const project of removed) {
      syncProjectDelete(project);
    }
  });
}

function subscribeToZones() {
  let prevZones = useZoneStore.getState().zones;

  return useZoneStore.subscribe((state) => {
    if (isSyncing) return;
    const curr = state.zones;
    const { added, removed, updated } = diffArrayById(curr, prevZones);
    prevZones = curr;

    for (const zone of added) {
      syncZoneCreate(zone);
    }
    for (const zone of updated) {
      syncZoneUpdate(zone);
    }
    for (const zone of removed) {
      syncZoneDelete(zone);
    }
  });
}

function subscribeToStructures() {
  let prevStructures: Structure[] = getAllStructures();

  return useBuiltEnvironmentStoreV2.subscribe((state) => {
    if (isSyncing) return;
    const curr: Structure[] = projectToStructures(state.entities);
    const { added, removed, updated } = diffArrayById(curr, prevStructures);
    prevStructures = curr;

    for (const structure of added) {
      syncStructureCreate(structure);
    }
    for (const structure of updated) {
      syncStructureUpdate(structure);
    }
    for (const structure of removed) {
      syncStructureDelete(structure);
    }
  });
}

function subscribeToPaths() {
  let prevPaths = usePathStore.getState().paths;

  return usePathStore.subscribe((state) => {
    if (isSyncing) return;
    const curr = state.paths;
    const { added, removed, updated } = diffArrayById(curr, prevPaths);
    prevPaths = curr;

    for (const p of added) syncPathCreate(p);
    for (const p of updated) syncPathUpdate(p);
    for (const p of removed) syncPathDelete(p);
  });
}

function subscribeToUtilities() {
  let prevUtilities = useUtilityStore.getState().utilities;

  return useUtilityStore.subscribe((state) => {
    if (isSyncing) return;
    const curr = state.utilities;
    const { added, removed, updated } = diffArrayById(curr, prevUtilities);
    prevUtilities = curr;

    for (const u of added) syncUtilityCreate(u);
    for (const u of updated) syncUtilityUpdate(u);
    for (const u of removed) syncUtilityDelete(u);
  });
}

// ─── Sync handlers (project) ─────────────────────────────────────────────────

/**
 * Write the server-recomputed acreage back into the local store after a
 * boundary push. Without this, `projectStore.acreage` only ever refreshes on
 * a full `initialSync` (app load), so Site Profile keeps showing the area of
 * an earlier/partial draw long after the steward has redrawn the parcel.
 * Guarded by `isSyncing` so the write does not re-enqueue a sync op.
 */
export function applyServerAcreage(
  localProjectId: string,
  resp: { acreage?: number | null } | undefined,
): void {
  const acreage = resp?.acreage;
  // Reject non-positive server acreage: a 0 is the signature of the backend
  // FeatureCollection bug and must never clobber the canonical client-side
  // geodesic acreage.
  if (typeof acreage !== 'number' || !Number.isFinite(acreage) || acreage <= 0) return;
  const wasSyncing = isSyncing;
  isSyncing = true;
  useProjectStore.getState().updateProject(localProjectId, { acreage });
  isSyncing = wasSyncing;
}

async function syncProjectCreate(project: LocalProject, rethrow = false) {
  // Idempotent at entry: a project that already carries a serverId is synced —
  // never POST a second row for it.
  if (project.serverId) return;
  // Dedup concurrent creates for the same local project. If one is already in
  // flight, await it instead of starting a second POST.
  const inFlight = inFlightProjectSync.get(project.id);
  if (inFlight) {
    if (rethrow) {
      await inFlight; // surface any rejection to the explicit caller
    } else {
      try { await inFlight; } catch { /* the owning call handles queue/logging */ }
    }
    return;
  }
  const run = syncProjectCreateInner(project, rethrow);
  inFlightProjectSync.set(project.id, run);
  try {
    await run;
  } finally {
    inFlightProjectSync.delete(project.id);
  }
}

/**
 * Canonical, idempotent, awaitable project→server sync. The single entry point
 * for explicitly pushing a local project to the backend (wizard "Create", the
 * Portfolio "Sync now" action, boot catch-up). Resolves a structured result
 * rather than throwing so callers can surface a toast without a try/catch.
 *
 * Guards:
 *  - project not found        → { ok: false }
 *  - builtin (system-owned)   → { ok: false, error: 'builtin' }  (never POST a sample)
 *  - already synced (serverId)→ { ok: true, serverId }            (short-circuit)
 *
 * Concurrency is deduped via `inFlightProjectSync` inside `syncProjectCreate`,
 * so a subscription-driven create and an explicit call can't double-POST.
 */
export async function syncProjectNow(
  localId: string,
): Promise<{ ok: boolean; serverId?: string; error?: unknown }> {
  const project = useProjectStore.getState().projects.find((p) => p.id === localId);
  if (!project) return { ok: false, error: 'not-found' };
  if (project.isBuiltin) return { ok: false, error: 'builtin' };
  if (project.serverId) return { ok: true, serverId: project.serverId };

  try {
    await syncProjectCreate(project, /* rethrow */ true);
    // Read the freshly-stamped serverId back from the store (write-through above).
    const synced = useProjectStore.getState().projects.find((p) => p.id === localId);
    return synced?.serverId
      ? { ok: true, serverId: synced.serverId }
      : { ok: false, error: 'no-server-id' };
  } catch (error) {
    return { ok: false, error };
  }
}

async function syncProjectCreateInner(project: LocalProject, rethrow: boolean) {
  try {
    // Workspace: callers that need to land the project in a specific org (the
    // New Project page's workspace picker) stash the chosen orgId on
    // `metadata.orgId` BEFORE createProject, so whichever path POSTs first (the
    // store subscription's auto-sync or an explicit syncProjectNow) carries the
    // same workspace — no race over which create wins. Omitted → server default org.
    const orgId =
      typeof project.metadata?.orgId === 'string' ? (project.metadata.orgId as string) : undefined;
    const { data } = await api.projects.create({
      name: project.name,
      description: project.description ?? undefined,
      projectType: project.projectType as Parameters<typeof api.projects.create>[0]['projectType'],
      country: project.country as 'US' | 'CA' | 'INTL',
      provinceState: project.provinceState ?? undefined,
      address: project.address ?? undefined,
      parcelId: project.parcelId ?? undefined,
      units: project.units,
      ...(orgId ? { orgId } : {}),
    });

    // Write serverId back (guarded)
    isSyncing = true;
    useProjectStore.getState().updateProject(project.id, { serverId: data.id });
    isSyncing = false;

    // If project has a boundary, also sync it
    if (project.parcelBoundaryGeojson) {
      try {
        const { data: bdy } = await api.projects.setBoundary(
          data.id,
          project.parcelBoundaryGeojson,
        );
        applyServerAcreage(project.id, bdy);
      } catch (err) {
        console.warn('[SYNC] Failed to sync project boundary:', err);
      }
    }

    // If project has notes, sync them too
    const noteFields: Record<string, unknown> = {};
    if (project.ownerNotes) noteFields.ownerNotes = project.ownerNotes;
    if (project.zoningNotes) noteFields.zoningNotes = project.zoningNotes;
    if (project.accessNotes) noteFields.accessNotes = project.accessNotes;
    if (project.waterRightsNotes) noteFields.waterRightsNotes = project.waterRightsNotes;
    if (Object.keys(noteFields).length > 0) {
      try {
        await api.projects.update(data.id, noteFields);
      } catch (err) {
        console.warn('[SYNC] Failed to sync project notes:', err);
      }
    }
  } catch (err) {
    console.warn('[SYNC] Project create failed, queuing: ' + describeSyncError(err), err);
    if (rethrow) throw err;
    await syncQueue.enqueue({
      storeType: 'project',
      action: 'create',
      localId: project.id,
      payload: project,
    });
  }
}

async function syncProjectUpdate(project: LocalProject, rethrow = false) {
  if (!project.serverId) return; // Not yet synced — create will handle it

  try {
    await api.projects.update(project.serverId, {
      name: project.name,
      description: project.description ?? undefined,
      address: project.address ?? undefined,
      parcelId: project.parcelId ?? undefined,
      ownerNotes: project.ownerNotes ?? undefined,
      zoningNotes: project.zoningNotes ?? undefined,
      accessNotes: project.accessNotes ?? undefined,
      waterRightsNotes: project.waterRightsNotes ?? undefined,
    });
  } catch (err) {
    console.warn('[SYNC] Project update failed, queuing:', err);
    if (rethrow) throw err;
    await syncQueue.enqueue({
      storeType: 'project',
      action: 'update',
      localId: project.id,
      payload: project,
    });
  }
}

async function syncProjectBoundary(project: LocalProject, rethrow = false) {
  if (!project.serverId) return; // Not yet synced — create will handle it
  if (!project.parcelBoundaryGeojson) return; // Nothing to push (cleared locally only)

  try {
    const { data: bdy } = await api.projects.setBoundary(
      project.serverId,
      project.parcelBoundaryGeojson,
    );
    applyServerAcreage(project.id, bdy);
  } catch (err) {
    console.warn('[SYNC] Project boundary update failed, queuing:', err);
    if (rethrow) throw err;
    await syncQueue.enqueue({
      storeType: 'project',
      action: 'update',
      localId: project.id,
      payload: project,
    });
  }
}

async function syncProjectDelete(project: LocalProject) {
  if (!project.serverId) {
    // Never synced — just clear any pending queue ops
    await syncQueue.dequeueByLocalId(project.id);
    return;
  }

  try {
    await api.projects.delete(project.serverId);
    await syncQueue.dequeueByLocalId(project.id);
  } catch (err) {
    console.warn('[SYNC] Project delete failed, queuing:', err);
    await syncQueue.enqueue({
      storeType: 'project',
      action: 'delete',
      localId: project.id,
      payload: { serverId: project.serverId },
    });
  }
}

// ─── Sync handlers (zone) ────────────────────────────────────────────────────

async function syncZoneCreate(zone: LandZone, rethrow = false) {
  const projectServerId = getProjectServerId(zone.projectId);
  if (!projectServerId) return; // Project not yet synced

  try {
    const input = zoneToDesignFeature(zone, projectServerId);
    const { data } = await api.designFeatures.create(projectServerId, input);

    isSyncing = true;
    useZoneStore.getState().updateZone(zone.id, { serverId: data.id });
    isSyncing = false;
  } catch (err) {
    console.warn('[SYNC] Zone create failed, queuing:', err);
    if (rethrow) throw err;
    await syncQueue.enqueue({
      storeType: 'zone',
      action: 'create',
      localId: zone.id,
      payload: zone,
    });
  }
}

async function syncZoneUpdate(zone: LandZone, rethrow = false) {
  if (!zone.serverId) return;

  try {
    const projectServerId = getProjectServerId(zone.projectId);
    if (!projectServerId) return;
    const input = zoneToDesignFeature(zone, projectServerId);
    await api.designFeatures.update(zone.serverId, {
      subtype: input.subtype,
      geometry: input.geometry,
      label: input.label,
      properties: input.properties,
      style: input.style,
    });
  } catch (err) {
    console.warn('[SYNC] Zone update failed, queuing:', err);
    if (rethrow) throw err;
    await syncQueue.enqueue({
      storeType: 'zone',
      action: 'update',
      localId: zone.id,
      payload: zone,
    });
  }
}

async function syncZoneDelete(zone: LandZone) {
  if (!zone.serverId) {
    await syncQueue.dequeueByLocalId(zone.id);
    return;
  }

  try {
    await api.designFeatures.delete(zone.serverId);
    await syncQueue.dequeueByLocalId(zone.id);
  } catch (err) {
    console.warn('[SYNC] Zone delete failed, queuing:', err);
    await syncQueue.enqueue({
      storeType: 'zone',
      action: 'delete',
      localId: zone.id,
      payload: { serverId: zone.serverId },
    });
  }
}

// ─── Sync handlers (structure) ───────────────────────────────────────────────

async function syncStructureCreate(structure: Structure, rethrow = false) {
  const projectServerId = getProjectServerId(structure.projectId);
  if (!projectServerId) return;

  try {
    const input = structureToDesignFeature(structure, projectServerId);
    const { data } = await api.designFeatures.create(projectServerId, input);

    isSyncing = true;
    updateStructure(structure.id, { serverId: data.id });
    isSyncing = false;
  } catch (err) {
    console.warn('[SYNC] Structure create failed, queuing:', err);
    if (rethrow) throw err;
    await syncQueue.enqueue({
      storeType: 'structure',
      action: 'create',
      localId: structure.id,
      payload: structure,
    });
  }
}

async function syncStructureUpdate(structure: Structure, rethrow = false) {
  if (!structure.serverId) return;

  try {
    const projectServerId = getProjectServerId(structure.projectId);
    if (!projectServerId) return;
    const input = structureToDesignFeature(structure, projectServerId);
    await api.designFeatures.update(structure.serverId, {
      subtype: input.subtype,
      geometry: input.geometry,
      label: input.label,
      properties: input.properties,
      phaseTag: input.phaseTag,
    });
  } catch (err) {
    console.warn('[SYNC] Structure update failed, queuing:', err);
    if (rethrow) throw err;
    await syncQueue.enqueue({
      storeType: 'structure',
      action: 'update',
      localId: structure.id,
      payload: structure,
    });
  }
}

async function syncStructureDelete(structure: Structure) {
  if (!structure.serverId) {
    await syncQueue.dequeueByLocalId(structure.id);
    return;
  }

  try {
    await api.designFeatures.delete(structure.serverId);
    await syncQueue.dequeueByLocalId(structure.id);
  } catch (err) {
    console.warn('[SYNC] Structure delete failed, queuing:', err);
    await syncQueue.enqueue({
      storeType: 'structure',
      action: 'delete',
      localId: structure.id,
      payload: { serverId: structure.serverId },
    });
  }
}

// ─── Sync handlers (path) ────────────────────────────────────────────────────

async function syncPathCreate(p: DesignPath, rethrow = false) {
  const projectServerId = getProjectServerId(p.projectId);
  if (!projectServerId) return;

  try {
    const input = pathToDesignFeature(p, projectServerId);
    const { data } = await api.designFeatures.create(projectServerId, input);

    isSyncing = true;
    usePathStore.getState().updatePath(p.id, { serverId: data.id });
    isSyncing = false;
  } catch (err) {
    console.warn('[SYNC] Path create failed, queuing:', err);
    if (rethrow) throw err;
    await syncQueue.enqueue({ storeType: 'path', action: 'create', localId: p.id, payload: p });
  }
}

async function syncPathUpdate(p: DesignPath, rethrow = false) {
  if (!p.serverId) return;

  try {
    const projectServerId = getProjectServerId(p.projectId);
    if (!projectServerId) return;
    const input = pathToDesignFeature(p, projectServerId);
    await api.designFeatures.update(p.serverId, {
      subtype: input.subtype,
      geometry: input.geometry,
      label: input.label,
      properties: input.properties,
      phaseTag: input.phaseTag,
      style: input.style,
    });
  } catch (err) {
    console.warn('[SYNC] Path update failed, queuing:', err);
    if (rethrow) throw err;
    await syncQueue.enqueue({ storeType: 'path', action: 'update', localId: p.id, payload: p });
  }
}

async function syncPathDelete(p: DesignPath) {
  if (!p.serverId) {
    await syncQueue.dequeueByLocalId(p.id);
    return;
  }

  try {
    await api.designFeatures.delete(p.serverId);
    await syncQueue.dequeueByLocalId(p.id);
  } catch (err) {
    console.warn('[SYNC] Path delete failed, queuing:', err);
    await syncQueue.enqueue({ storeType: 'path', action: 'delete', localId: p.id, payload: { serverId: p.serverId } });
  }
}

// ─── Sync handlers (utility / point) ─────────────────────────────────────────

async function syncUtilityCreate(u: Utility, rethrow = false) {
  const projectServerId = getProjectServerId(u.projectId);
  if (!projectServerId) return;

  try {
    const input = utilityToDesignFeature(u, projectServerId);
    const { data } = await api.designFeatures.create(projectServerId, input);

    isSyncing = true;
    useUtilityStore.getState().updateUtility(u.id, { serverId: data.id });
    isSyncing = false;
  } catch (err) {
    console.warn('[SYNC] Utility create failed, queuing:', err);
    if (rethrow) throw err;
    await syncQueue.enqueue({ storeType: 'point', action: 'create', localId: u.id, payload: u });
  }
}

async function syncUtilityUpdate(u: Utility, rethrow = false) {
  if (!u.serverId) return;

  try {
    const projectServerId = getProjectServerId(u.projectId);
    if (!projectServerId) return;
    const input = utilityToDesignFeature(u, projectServerId);
    await api.designFeatures.update(u.serverId, {
      subtype: input.subtype,
      geometry: input.geometry,
      label: input.label,
      properties: input.properties,
      phaseTag: input.phaseTag,
      style: input.style,
    });
  } catch (err) {
    console.warn('[SYNC] Utility update failed, queuing:', err);
    if (rethrow) throw err;
    await syncQueue.enqueue({ storeType: 'point', action: 'update', localId: u.id, payload: u });
  }
}

async function syncUtilityDelete(u: Utility) {
  if (!u.serverId) {
    await syncQueue.dequeueByLocalId(u.id);
    return;
  }

  try {
    await api.designFeatures.delete(u.serverId);
    await syncQueue.dequeueByLocalId(u.id);
  } catch (err) {
    console.warn('[SYNC] Utility delete failed, queuing:', err);
    await syncQueue.enqueue({ storeType: 'point', action: 'delete', localId: u.id, payload: { serverId: u.serverId } });
  }
}

// ─── Sync handlers (typed-table: vegetation + succession) ────────────────────

/**
 * Content diff for typed-table records. Unlike zones/structures these have
 * no serverId roundtrip and no `updatedAt` on the local record (the id is
 * client-supplied and stable from creation, machinery_items-style), so an
 * "update" is a JSON content change rather than a timestamp delta.
 */
function diffArrayByContent<T extends { id: string }>(
  curr: T[],
  prev: T[],
): { added: T[]; updated: T[]; removed: T[] } {
  const prevMap = new Map(prev.map((i) => [i.id, i]));
  const currMap = new Map(curr.map((i) => [i.id, i]));
  const added: T[] = [];
  const updated: T[] = [];
  const removed: T[] = [];
  for (const it of curr) {
    const p = prevMap.get(it.id);
    if (!p) added.push(it);
    else if (JSON.stringify(p) !== JSON.stringify(it)) updated.push(it);
  }
  for (const it of prev) if (!currMap.has(it.id)) removed.push(it);
  return { added, updated, removed };
}

interface TypedRecord {
  id: string;
  projectId: string;
}

interface TypedTableSpec<T extends TypedRecord> {
  storeType: 'vegetation' | 'succession';
  create: (projectServerId: string, body: T) => Promise<unknown>;
  update: (id: string, body: T) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
}

async function typedCreate<T extends TypedRecord>(
  spec: TypedTableSpec<T>,
  rec: T,
  rethrow = false,
) {
  const projectServerId = getProjectServerId(rec.projectId);
  if (!projectServerId) return; // project not synced yet — initialSync pushes it
  try {
    await spec.create(projectServerId, rec);
  } catch (err) {
    console.warn(`[SYNC] ${spec.storeType} create failed, queuing:`, err);
    if (rethrow) throw err;
    await syncQueue.enqueue({
      storeType: spec.storeType,
      action: 'create',
      localId: rec.id,
      payload: rec,
    });
  }
}

async function typedUpdate<T extends TypedRecord>(
  spec: TypedTableSpec<T>,
  rec: T,
  rethrow = false,
) {
  if (!getProjectServerId(rec.projectId)) return;
  try {
    await spec.update(rec.id, rec);
  } catch (err) {
    console.warn(`[SYNC] ${spec.storeType} update failed, queuing:`, err);
    if (rethrow) throw err;
    await syncQueue.enqueue({
      storeType: spec.storeType,
      action: 'update',
      localId: rec.id,
      payload: rec,
    });
  }
}

async function typedDelete<T extends TypedRecord>(spec: TypedTableSpec<T>, rec: T) {
  try {
    await spec.remove(rec.id);
    await syncQueue.dequeueByLocalId(rec.id);
  } catch (err) {
    console.warn(`[SYNC] ${spec.storeType} delete failed, queuing:`, err);
    await syncQueue.enqueue({
      storeType: spec.storeType,
      action: 'delete',
      localId: rec.id,
      payload: { id: rec.id },
    });
  }
}

const vegetationSpec: TypedTableSpec<VegetationPatch> = {
  storeType: 'vegetation',
  create: (pid, body) => api.vegetation.create(pid, body as never),
  update: (id, body) => api.vegetation.update(id, body as never),
  remove: (id) => api.vegetation.delete(id),
};

const successionSpec: TypedTableSpec<SuccessionMilestone> = {
  storeType: 'succession',
  create: (pid, body) => api.succession.create(pid, body as never),
  update: (id, body) => api.succession.update(id, body as never),
  remove: (id) => api.succession.delete(id),
};

export const syncVegetationCreate = (r: VegetationPatch) => typedCreate(vegetationSpec, r);
export const syncVegetationUpdate = (r: VegetationPatch) => typedUpdate(vegetationSpec, r);
export const syncVegetationDelete = (r: VegetationPatch) => typedDelete(vegetationSpec, r);
export const syncSuccessionCreate = (r: SuccessionMilestone) => typedCreate(successionSpec, r);
export const syncSuccessionUpdate = (r: SuccessionMilestone) => typedUpdate(successionSpec, r);
export const syncSuccessionDelete = (r: SuccessionMilestone) => typedDelete(successionSpec, r);

function subscribeToVegetation() {
  let prev = useVegetationStore.getState().patches;
  return useVegetationStore.subscribe((state) => {
    if (isSyncing) return;
    const curr = state.patches;
    const { added, updated, removed } = diffArrayByContent(curr, prev);
    prev = curr;
    for (const r of added) void syncVegetationCreate(r);
    for (const r of updated) void syncVegetationUpdate(r);
    for (const r of removed) void syncVegetationDelete(r);
  });
}

function subscribeToSuccession() {
  let prev = useSuccessionStore.getState().milestones;
  return useSuccessionStore.subscribe((state) => {
    if (isSyncing) return;
    const curr = state.milestones;
    const { added, updated, removed } = diffArrayByContent(curr, prev);
    prev = curr;
    for (const r of added) void syncSuccessionCreate(r);
    for (const r of updated) void syncSuccessionUpdate(r);
    for (const r of removed) void syncSuccessionDelete(r);
  });
}

// ─── B. Initial fetch & merge ────────────────────────────────────────────────

async function initialSync(): Promise<void> {
  isSyncing = true;

  try {
    // 1. Fetch server projects
    const { data: serverProjects } = await api.projects.list();
    const localProjects = useProjectStore.getState().projects;

    // Build lookup by serverId
    const localByServerId = new Map<string, LocalProject>();
    for (const lp of localProjects) {
      if (lp.serverId) localByServerId.set(lp.serverId, lp);
    }

    // 2. Merge server projects into local store
    for (const sp of serverProjects) {
      const existing = localByServerId.get(sp.id);
      if (existing) {
        // Server wins — update local with server data. We write through
        // `setState` directly (rather than `updateProject`) because
        // builtin sample projects are gated read-only in the store, and
        // we still want server-driven refreshes to land for them.
        useProjectStore.setState((state) => ({
          projects: state.projects.map((p) =>
            p.id === existing.id
              ? {
                  ...p,
                  name: sp.name,
                  description: sp.description,
                  status: sp.status,
                  projectType: sp.projectType,
                  country: sp.country,
                  provinceState: sp.provinceState,
                  address: sp.address,
                  parcelId: sp.parcelId,
                  acreage: sp.acreage,
                  dataCompletenessScore: sp.dataCompletenessScore,
                  hasParcelBoundary: sp.hasParcelBoundary,
                  isBuiltin: sp.isBuiltin,
                  serverId: sp.id,
                  updatedAt: new Date().toISOString(),
                }
              : p,
          ),
        }));
      } else {
        // New from server — create local entry
        const now = new Date().toISOString();
        const newLocal: LocalProject = {
          id: crypto.randomUUID(),
          name: sp.name,
          description: sp.description,
          status: sp.status,
          projectType: sp.projectType,
          country: sp.country,
          provinceState: sp.provinceState,
          conservationAuthId: sp.conservationAuthId,
          address: sp.address,
          parcelId: sp.parcelId,
          acreage: sp.acreage,
          dataCompletenessScore: sp.dataCompletenessScore,
          hasParcelBoundary: sp.hasParcelBoundary,
          createdAt: sp.createdAt,
          updatedAt: sp.updatedAt,
          parcelBoundaryGeojson: null,
          ownerNotes: null,
          zoningNotes: null,
          accessNotes: null,
          waterRightsNotes: null,
          visionStatement: null,
          units: 'metric',
          attachments: [],
          isBuiltin: sp.isBuiltin,
          serverId: sp.id,
        };
        useProjectStore.setState((state) => ({
          projects: [...state.projects, newLocal],
        }));
      }
    }

    // 3. Push unsynced local projects to server
    const unsyncedProjects = useProjectStore.getState().projects.filter((p) => !p.serverId);
    for (const lp of unsyncedProjects) {
      try {
        const { data } = await api.projects.create({
          name: lp.name,
          description: lp.description ?? undefined,
          projectType: lp.projectType as Parameters<typeof api.projects.create>[0]['projectType'],
          country: lp.country as 'US' | 'CA' | 'INTL',
          provinceState: lp.provinceState ?? undefined,
          address: lp.address ?? undefined,
          parcelId: lp.parcelId ?? undefined,
          units: lp.units,
        });
        useProjectStore.getState().updateProject(lp.id, { serverId: data.id });
      } catch (err) {
        console.warn(`[SYNC] Failed to push local project "${lp.name}" to server:`, err);
      }
    }

    // 4. Sync zones and structures for each project with a serverId
    const allProjects = useProjectStore.getState().projects;
    for (const project of allProjects) {
      if (!project.serverId) continue;
      await mergeDesignFeatures(project);
      // P4: restore the full versioned-blob design surface. Still inside
      // isSyncing=true so applyForProject mutations do not bounce back
      // out through subscribeVersionedBlobs as fresh pushes.
      if (FLAGS.SYNC_STATE_BLOBS) {
        await hydrateProjectStateBlobs(project);
        await hydrateTypedTables(project);
        await hydrateActRecords(project);
      }
    }
  } catch (err) {
    console.error('[SYNC] Initial sync failed:', err);
  } finally {
    isSyncing = false;
  }
}

async function mergeDesignFeatures(project: LocalProject): Promise<void> {
  if (!project.serverId) return;

  try {
    // Fetch zones from server
    const { data: serverZones } = await api.designFeatures.list(project.serverId, 'zone');
    const localZones = useZoneStore.getState().zones.filter((z) => z.projectId === project.id);
    const localZoneByServerId = new Map(localZones.filter((z) => z.serverId).map((z) => [z.serverId!, z]));

    // Merge server zones → local
    for (const sz of serverZones) {
      const existing = localZoneByServerId.get(sz.id);
      if (existing) {
        // Server wins
        const merged = designFeatureToZone(sz, project.id);
        useZoneStore.getState().updateZone(existing.id, { ...merged, id: existing.id });
      } else {
        // New from server
        const newZone = designFeatureToZone(sz, project.id);
        useZoneStore.getState().addZone(newZone);
      }
    }

    // Push unsynced local zones to server
    const unsyncedZones = useZoneStore.getState().zones.filter(
      (z) => z.projectId === project.id && !z.serverId,
    );
    for (const zone of unsyncedZones) {
      try {
        const input = zoneToDesignFeature(zone, project.serverId);
        const { data } = await api.designFeatures.create(project.serverId, input);
        useZoneStore.getState().updateZone(zone.id, { serverId: data.id });
      } catch (err) {
        console.warn(`[SYNC] Failed to push zone "${zone.name}":`, err);
      }
    }

    // Fetch structures from server
    const { data: serverStructures } = await api.designFeatures.list(project.serverId, 'structure');
    const localStructures = getAllStructures().filter((s) => s.projectId === project.id);
    const localStructureByServerId = new Map(localStructures.filter((s) => s.serverId).map((s) => [s.serverId!, s]));

    // Merge server structures → local
    for (const ss of serverStructures) {
      const existing = localStructureByServerId.get(ss.id);
      if (existing) {
        const merged = designFeatureToStructure(ss, project.id);
        updateStructure(existing.id, { ...merged, id: existing.id });
      } else {
        const newStructure = designFeatureToStructure(ss, project.id);
        addStructure(newStructure);
      }
    }

    // Push unsynced local structures to server
    const unsyncedStructures = getAllStructures().filter(
      (s) => s.projectId === project.id && !s.serverId,
    );
    for (const structure of unsyncedStructures) {
      try {
        const input = structureToDesignFeature(structure, project.serverId);
        const { data } = await api.designFeatures.create(project.serverId, input);
        updateStructure(structure.id, { serverId: data.id });
      } catch (err) {
        console.warn(`[SYNC] Failed to push structure "${structure.name}":`, err);
      }
    }

    // Fetch paths from server (typed-promotion 2026-05-22)
    const { data: serverPaths } = await api.designFeatures.list(project.serverId, 'path');
    const localPaths = usePathStore.getState().paths.filter((p) => p.projectId === project.id);
    const localPathByServerId = new Map(localPaths.filter((p) => p.serverId).map((p) => [p.serverId!, p]));

    for (const sp of serverPaths) {
      const existing = localPathByServerId.get(sp.id);
      if (existing) {
        const merged = designFeatureToPath(sp, project.id);
        usePathStore.getState().updatePath(existing.id, { ...merged, id: existing.id });
      } else {
        usePathStore.getState().addPath(designFeatureToPath(sp, project.id));
      }
    }

    const unsyncedPaths = usePathStore.getState().paths.filter(
      (p) => p.projectId === project.id && !p.serverId,
    );
    for (const p of unsyncedPaths) {
      try {
        const input = pathToDesignFeature(p, project.serverId);
        const { data } = await api.designFeatures.create(project.serverId, input);
        usePathStore.getState().updatePath(p.id, { serverId: data.id });
      } catch (err) {
        console.warn(`[SYNC] Failed to push path "${p.name}":`, err);
      }
    }

    // Fetch utilities from server (typed-promotion 2026-05-22)
    const { data: serverUtilities } = await api.designFeatures.list(project.serverId, 'point');
    const localUtilities = useUtilityStore.getState().utilities.filter((u) => u.projectId === project.id);
    const localUtilityByServerId = new Map(localUtilities.filter((u) => u.serverId).map((u) => [u.serverId!, u]));

    for (const su of serverUtilities) {
      const existing = localUtilityByServerId.get(su.id);
      if (existing) {
        const merged = designFeatureToPoint(su, project.id);
        useUtilityStore.getState().updateUtility(existing.id, { ...merged, id: existing.id });
      } else {
        useUtilityStore.getState().addUtility(designFeatureToPoint(su, project.id));
      }
    }

    const unsyncedUtilities = useUtilityStore.getState().utilities.filter(
      (u) => u.projectId === project.id && !u.serverId,
    );
    for (const u of unsyncedUtilities) {
      try {
        const input = utilityToDesignFeature(u, project.serverId);
        const { data } = await api.designFeatures.create(project.serverId, input);
        useUtilityStore.getState().updateUtility(u.id, { serverId: data.id });
      } catch (err) {
        console.warn(`[SYNC] Failed to push utility "${u.name}":`, err);
      }
    }
  } catch (err) {
    console.warn(`[SYNC] Failed to merge design features for project "${project.name}":`, err);
  }
}

// ─── C. Online/offline resilience ────────────────────────────────────────────

/** Queued payload for one `versioned-blob` store slice (P2.5). */
export interface StateBlobOpPayload {
  projectLocalId: string;
  storeKey: string;
  schemaVersion: number;
  baseRev: number;
  payload: unknown;
}

/**
 * Surface a store-level sync conflict: badge it in the Connectivity panel and
 * warn the user at most once per newly-conflicted store. The local copy is
 * NEVER clobbered back — the reconcile is the user's (Phase 4 owns the
 * Keep-mine/Keep-server resolution UI). Shared by the blob and typed-record
 * flush paths so both surface identically; extracted in Phase 3 when the typed
 * path grew a quiet `auto_resolved` branch that must NOT call this.
 */
function surfaceStoreConflict(storeKey: string): void {
  const conn = useConnectivityStore.getState();
  if (!conn.conflictedStores.includes(storeKey)) {
    conn.addConflictedStore(storeKey);
    toast.warning(
      `A change to "${storeKey}" conflicts with a newer version on ` +
        `the server. Your local copy is kept — review it in Connectivity.`,
    );
  }
}

/**
 * Push one queued `state-blob` slice through the generic versioned-blob
 * transport. The project's serverId is resolved at flush time (not enqueue
 * time) so an op queued before the project synced still lands once it has.
 *
 * Conflict contract: a `409` is surfaced, never clobbered and never retried
 * forever. Phase 2 is push-only shadow — the visible conflict surface (toast
 * + Connectivity badge + reconcile) is Phase 4; here we log and stop.
 */
export async function executeStateBlobOp(op: QueuedOperation): Promise<void> {
  const p = op.payload as StateBlobOpPayload;
  const serverId = getProjectServerId(p.projectLocalId);
  if (!serverId) {
    // Throw so the op stays queued and retries once the project gets a
    // serverId — do not silently drop the slice.
    throw new Error(
      `[SYNC] state-blob "${p.storeKey}": project ${p.projectLocalId} has no serverId yet`,
    );
  }
  const envelope = buildBlobEnvelope(p.schemaVersion, p.baseRev, p.payload);
  const result = await pushProjectStateBlob(serverId, p.storeKey, envelope);
  const key = blobLocalId(p.storeKey, p.projectLocalId);
  if (result.status === 'ok') {
    // Persist the bumped rev as the next push's baseRev so repeated edits
    // don't all collide on rev 0 → permanent 409.
    blobBaseRev.set(key, result.rev);
    return;
  }
  // 409: adopt the authoritative rev so we stop infinitely re-pushing a
  // stale base. The local slice is NOT silently clobbered back — Phase 4
  // owns the visible reconcile (toast + Connectivity badge); here we log.
  if (typeof result.serverRev === 'number') blobBaseRev.set(key, result.serverRev);
  // P4.4 — surface the conflict instead of swallowing it: badge it in the
  // Connectivity panel and warn the user once per newly-conflicted store.
  // The local slice is NOT clobbered back; the reconcile is the user's. The
  // blob transport carries no §6 resolution (it is whole-store, not per
  // record), so it always surfaces.
  surfaceStoreConflict(p.storeKey);
  console.warn(
    `[SYNC] state-blob "${p.storeKey}" rejected as stale (server rev ` +
      `${result.serverRev}); surfaced as conflict (no clobber)`,
  );
}

/**
 * Queued payload for ONE `typed-record` (one Act record). The tier hints are
 * flattened (not a nested `meta`) so the queued op stays plain JSON; the
 * envelope is rebuilt from them at flush time.
 */
export interface TypedRecordOpPayload {
  projectLocalId: string;
  storeKey: string;
  recordId: string;
  schemaVersion: number;
  baseRev: number;
  payload: unknown;
  observedAt: string | null;
  sourceType: string | null;
  cycleId: string | null;
  taskType: string | null;
}

/**
 * Push one queued `typed-record` op through the per-record Act transport — the
 * per-record analogue of executeStateBlobOp. Same serverId-resolved-at-flush
 * rule and the SAME never-clobber 409 contract, but keyed by (storeKey,
 * project, recordId) so each record tracks its own baseRev and a stale write
 * conflicts independently. Conflict surfacing stays at storeKey granularity
 * (the Connectivity badge is per-store today); Phase 4 refines to per-record.
 */
export async function executeTypedRecordOp(op: QueuedOperation): Promise<void> {
  const p = op.payload as TypedRecordOpPayload;
  const serverId = getProjectServerId(p.projectLocalId);
  if (!serverId) {
    // Throw so the op stays queued and retries once the project gets a
    // serverId — never silently drop a record.
    throw new Error(
      `[SYNC] typed-record "${p.storeKey}/${p.recordId}": project ` +
        `${p.projectLocalId} has no serverId yet`,
    );
  }
  const envelope = buildRecordEnvelope(p.schemaVersion, p.baseRev, p.payload, {
    observedAt: p.observedAt,
    sourceType: p.sourceType,
    cycleId: p.cycleId,
    taskType: p.taskType,
  });
  const result = await pushSyncedRecord(serverId, p.storeKey, p.recordId, envelope);
  const key = recordLocalId(p.storeKey, p.projectLocalId, p.recordId);
  if (result.status === 'ok') {
    // Persist the bumped rev so repeated edits to this record don't all
    // collide on rev 0 → permanent 409.
    recordBaseRev.set(key, result.rev);
    return;
  }
  // 409: adopt the authoritative rev so we stop infinitely re-pushing a stale
  // base. The local record is NEVER clobbered back here regardless of how the
  // server resolved the conflict.
  if (typeof result.serverRev === 'number') recordBaseRev.set(key, result.serverRev);
  // §6 resolution (Phase 3). The server decided — keyed on observed_at under
  // ratified LWW — whether this conflict was settled non-destructively:
  //  - `auto_resolved`: the server copy is provably newer (server observed_at
  //    >= local) and the loser is preserved in sync_log. Adopt the rev and
  //    stay QUIET — no badge, no toast. We deliberately do NOT apply the server
  //    payload here: doing so in the flush path would re-enter the store
  //    subscriber and risk a push loop. Convergence to the server copy happens
  //    on the next hydration (hydrateActRecords); Phase 4 owns immediate adopt.
  //  - `escalated` (or any unknown/legacy value): safety could not be proven
  //    (local strictly newer, or a timestamp missing). Surface it for a steward
  //    Keep-mine/Keep-server decision. This is the default, so a 409 from an
  //    older server or a bare test mock keeps the Phase 1 never-clobber surface.
  if (result.resolution === 'auto_resolved') {
    console.debug(
      `[SYNC] typed-record "${p.storeKey}/${p.recordId}" auto-resolved by ` +
        `the server (server rev ${result.serverRev} newer by observed_at; ` +
        `sync_log ${result.syncLogId ?? 'n/a'}); local kept, surface suppressed`,
    );
    return;
  }
  surfaceStoreConflict(p.storeKey);
  console.warn(
    `[SYNC] typed-record "${p.storeKey}/${p.recordId}" escalated as stale ` +
      `(server rev ${result.serverRev}; sync_log ${result.syncLogId ?? 'n/a'}); ` +
      `surfaced as conflict (no clobber)`,
  );
}

/**
 * Last server `rev` we know for a (storeKey, project) blob, used as the next
 * push's `baseRev`. In-memory only for the Phase 2 push-only shadow;
 * Phase 4's conflict surface owns durable rev/conflict bookkeeping.
 */
const blobBaseRev = new Map<string, number>();

function getBlobBaseRev(storeKey: string, projectLocalId: string): number {
  return blobBaseRev.get(blobLocalId(storeKey, projectLocalId)) ?? 0;
}

/** Test seam: read the in-memory adopted base rev. */
export function getBlobBaseRevForTest(
  storeKey: string,
  projectLocalId: string,
): number {
  return getBlobBaseRev(storeKey, projectLocalId);
}

/**
 * Last server `rev` we know for a (storeKey, project, recordId) typed record,
 * used as the next push's `baseRev`. Per-record analogue of `blobBaseRev`;
 * in-memory only for Phase 1 (Phase 3's durable sync_log owns persistent
 * rev/conflict bookkeeping).
 */
const recordBaseRev = new Map<string, number>();

function getRecordBaseRev(
  storeKey: string,
  projectLocalId: string,
  recordId: string,
): number {
  return recordBaseRev.get(recordLocalId(storeKey, projectLocalId, recordId)) ?? 0;
}

/** Test seam: read the in-memory adopted per-record base rev. */
export function getRecordBaseRevForTest(
  storeKey: string,
  projectLocalId: string,
  recordId: string,
): number {
  return getRecordBaseRev(storeKey, projectLocalId, recordId);
}

/** Shown at most once per session, not once per skewed store. */
let blobVersionSkewWarned = false;

/**
 * Local ids of records/stores that have a pending un-synced queue op of the
 * given transport type. The hydrate paths use this as the §6 init-clobber
 * guard (the residual gap ADR 12 handed to Phase 3): a local edit the server
 * has not yet seen must NOT be overwritten by the server copy on hydrate.
 *
 * For `typed-record` the localId is `recordLocalId(storeKey, project, record)`;
 * for `state-blob` it is `blobLocalId(storeKey, project)`. Degrades to an empty
 * set if the queue is unreadable (e.g. no IndexedDB in a unit-test env) — the
 * caller then hydrates exactly as it did before this guard existed.
 */
async function pendingLocalIds(
  storeType: SyncStoreType,
): Promise<Set<string>> {
  try {
    const ops = await syncQueue.getAll();
    return new Set(
      ops.filter((op) => op.storeType === storeType).map((op) => op.localId),
    );
  } catch (err) {
    console.warn(
      `[SYNC] could not read the sync queue for the init-clobber guard ` +
        `(hydrating "${storeType}" without it):`,
      err,
    );
    return new Set<string>();
  }
}

/**
 * P4 — read side of the generic versioned-blob transport: pull every
 * server blob for `project` and write it back into its store (the half
 * that makes device B actually restore; P0-1's other half).
 *
 * Runs INSIDE `initialSync`'s `isSyncing = true` window so `applyForProject`
 * mutations do not bounce back out through `subscribeVersionedBlobs`.
 * `descriptors` is injectable for tests; production passes `SYNCED_STORES`.
 *
 * Guards:
 *  - version-skew (P4.2): a blob whose `schemaVersion` exceeds this client's
 *    descriptor version is SKIPPED — never downcast through a stale
 *    `migrate`, and the stale local slice is deliberately NOT pushed back.
 *    A single "update Atlas" toast is shown per session.
 *  - temporal (P4.3): after applying a `temporal()` store, its undo history
 *    is cleared so the restore is not a user-undoable frame.
 */
export async function hydrateProjectStateBlobs(
  project: LocalProject,
  descriptors: SyncedStoreDescriptor[] = SYNCED_STORES,
): Promise<void> {
  if (!project.serverId) return;
  let rows: Array<{
    storeKey: string;
    payload: unknown;
    schemaVersion: number;
    rev: number;
  }>;
  try {
    const res = await api.projectState.list(project.serverId);
    rows = (res.data ?? []) as never;
  } catch (err) {
    console.warn(
      `[SYNC] blob hydrate list failed for "${project.name}":`,
      err,
    );
    return;
  }
  const descByKey = new Map(
    descriptors
      .filter((d) => d.classification === 'versioned-blob')
      .map((d) => [d.storeKey, d] as const),
  );
  // §6 init-clobber guard: a blob store with a pending un-synced push holds a
  // local edit the server has not seen — do not overwrite it on hydrate.
  const pendingBlobIds = await pendingLocalIds('state-blob');
  for (const row of rows) {
    const d = descByKey.get(row.storeKey);
    if (!d || !d.store || !d.applyForProject) continue;
    if (pendingBlobIds.has(blobLocalId(row.storeKey, project.id))) {
      console.warn(
        `[SYNC] blob "${row.storeKey}" has a pending un-synced local edit; ` +
          `skipped server hydrate to avoid clobbering it (its queued push will ` +
          `reconcile, or surface a conflict if the server is ahead)`,
      );
      continue;
    }
    const localVersion = d.schemaVersion ?? 1;
    if (row.schemaVersion > localVersion) {
      if (!blobVersionSkewWarned) {
        blobVersionSkewWarned = true;
        toast.warning(
          'Some synced data was saved by a newer version of Atlas. ' +
            'Update Atlas to restore it.',
        );
      }
      console.warn(
        `[SYNC] blob "${row.storeKey}" schemaVersion ${row.schemaVersion} ` +
          `> local ${localVersion}; skipped (version-skew guard)`,
      );
      continue;
    }
    try {
      const handle = d.store as unknown as {
        getState: () => unknown;
        setState: (p: unknown) => void;
        temporal?: { getState: () => { clear: () => void } };
      };
      d.applyForProject(handle, project.id, row.payload);
      blobBaseRev.set(blobLocalId(row.storeKey, project.id), row.rev);
      if (d.usesTemporal) handle.temporal?.getState().clear();
    } catch (err) {
      console.warn(
        `[SYNC] blob "${row.storeKey}" hydrate apply failed:`,
        err,
      );
    }
  }
}

/**
 * Device-B restore for the typed-table class (vegetation + succession).
 * Mirrors `mergeDesignFeatures`, NOT the blob path: server-wins per id,
 * local-only records for this project are pushed up so an offline-created
 * record is never lost. Runs inside `initialSync`'s `isSyncing` window.
 */
export async function hydrateTypedTables(
  project: LocalProject,
): Promise<void> {
  if (!project.serverId) return;
  const serverId = project.serverId;

  try {
    const { data } = await api.vegetation.list(serverId);
    const serverRecs = (data ?? []) as unknown as VegetationPatch[];
    const seen = new Set<string>();
    const veg = useVegetationStore.getState();
    for (const rec of serverRecs) {
      seen.add(rec.id);
      if (veg.patches.some((p) => p.id === rec.id)) veg.updatePatch(rec.id, rec);
      else veg.addPatch(rec);
    }
    const localOnly = useVegetationStore
      .getState()
      .patches.filter((p) => p.projectId === project.id && !seen.has(p.id));
    for (const rec of localOnly) await syncVegetationCreate(rec);
  } catch (err) {
    console.warn(`[SYNC] vegetation hydrate failed for "${project.name}":`, err);
  }

  try {
    const { data } = await api.succession.list(serverId);
    const serverRecs = (data ?? []) as unknown as SuccessionMilestone[];
    const seen = new Set<string>();
    const succ = useSuccessionStore.getState();
    for (const rec of serverRecs) {
      seen.add(rec.id);
      if (succ.milestones.some((m) => m.id === rec.id))
        succ.updateMilestone(rec.id, rec);
      else succ.addMilestone(rec);
    }
    const localOnly = useSuccessionStore
      .getState()
      .milestones.filter((m) => m.projectId === project.id && !seen.has(m.id));
    for (const rec of localOnly) await syncSuccessionCreate(rec);
  } catch (err) {
    console.warn(`[SYNC] succession hydrate failed for "${project.name}":`, err);
  }
}

/**
 * Device-B restore for the `typed-record` class (the 4 Act stores). Pulls
 * every server record for each typed-record store and upserts it into the live
 * store via `applyRecordForProject`, recording each record's server `rev` as
 * the next push's baseRev. Per-record analogue of `hydrateProjectStateBlobs`,
 * with the same version-skew guard (a record saved by a newer client is
 * skipped, never downcast). Runs INSIDE `initialSync`'s `isSyncing` window so
 * the writes do not bounce back out through `subscribeTypedRecords`.
 *
 * Upsert-only: Phase 1 has no per-record delete on the wire, so a record
 * deleted on another device is reconciled in a later phase, never silently
 * dropped here. `descriptors` is injectable for tests; production passes
 * `SYNCED_STORES`.
 */
export async function hydrateActRecords(
  project: LocalProject,
  descriptors: SyncedStoreDescriptor[] = SYNCED_STORES,
): Promise<void> {
  if (!project.serverId) return;
  const serverId = project.serverId;
  const recordStores = descriptors.filter(
    (d) => d.classification === 'typed-record',
  );
  // §6 init-clobber guard: records with a pending un-synced push are local
  // edits the server has not seen — skip-apply them so hydrate never silently
  // overwrites un-synced work (the residual gap ADR 12 handed to Phase 3).
  const pendingRecordIds = await pendingLocalIds('typed-record');
  for (const d of recordStores) {
    if (!d.store || !d.applyRecordForProject) continue;
    const localVersion = d.schemaVersion ?? 1;
    let rows: SyncedRecord[];
    try {
      const res = await api.actRecords.list(serverId, d.storeKey);
      rows = (res.data ?? []) as SyncedRecord[];
    } catch (err) {
      console.warn(
        `[SYNC] typed-record hydrate list failed for "${d.storeKey}" / "${project.name}":`,
        err,
      );
      continue;
    }
    const handle = d.store as unknown as {
      getState: () => unknown;
      setState: (p: unknown) => void;
    };
    for (const row of rows) {
      if (pendingRecordIds.has(recordLocalId(d.storeKey, project.id, row.recordId))) {
        console.warn(
          `[SYNC] typed-record "${d.storeKey}/${row.recordId}" has a pending ` +
            `un-synced local edit; skipped server hydrate to avoid clobbering ` +
            `it (its queued push will reconcile, or surface a conflict if the ` +
            `server is ahead)`,
        );
        continue;
      }
      if (row.schemaVersion > localVersion) {
        if (!blobVersionSkewWarned) {
          blobVersionSkewWarned = true;
          toast.warning(
            'Some synced data was saved by a newer version of Atlas. ' +
              'Update Atlas to restore it.',
          );
        }
        console.warn(
          `[SYNC] typed-record "${d.storeKey}/${row.recordId}" schemaVersion ` +
            `${row.schemaVersion} > local ${localVersion}; skipped (version-skew guard)`,
        );
        continue;
      }
      try {
        d.applyRecordForProject(handle, project.id, row.recordId, row.payload);
        recordBaseRev.set(
          recordLocalId(d.storeKey, project.id, row.recordId),
          row.rev,
        );
      } catch (err) {
        console.warn(
          `[SYNC] typed-record "${d.storeKey}/${row.recordId}" hydrate apply failed:`,
          err,
        );
      }
    }
  }
}

/**
 * Enqueue one `versioned-blob` store's active-project slice. Resolves the
 * active project at enqueue time; skips silently when there is no active
 * project or it has no serverId yet (a later store edit re-enqueues once the
 * project-create path has bootstrapped the serverId). The op itself resolves
 * serverId again at flush time, so a race here only delays, never drops.
 */
const warnedNoServerId = new Set<string>();

export async function enqueueVersionedBlob(
  desc: SyncedStoreDescriptor,
): Promise<void> {
  if (!desc.store || !desc.selectForProject) return;
  const activeId = useProjectStore.getState().activeProjectId;
  if (!activeId) return;
  // No serverId means this project has never been pushed (builtin/demo fixtures
  // like `mtc` are also viewer-only by RBAC and won't accept blob writes). Skip
  // silently in prod; in dev, surface it once per project so a tester editing a
  // serverId-less project isn't left wondering why nothing syncs — exercise sync
  // with a created/owned project instead.
  if (!getProjectServerId(activeId)) {
    if (import.meta.env.DEV && !warnedNoServerId.has(activeId)) {
      warnedNoServerId.add(activeId);
      console.info(
        `[SYNC] Skipping versioned-blob push for project "${activeId}": no serverId yet ` +
          `(builtin/demo projects are viewer-only). Create/own a project to exercise blob sync.`,
      );
    }
    return;
  }
  const payload: StateBlobOpPayload = {
    projectLocalId: activeId,
    storeKey: desc.storeKey,
    schemaVersion: desc.schemaVersion ?? 1,
    baseRev: getBlobBaseRev(desc.storeKey, activeId),
    payload: desc.selectForProject(desc.store.getState(), activeId),
  };
  await syncQueue.enqueue({
    storeType: 'state-blob',
    action: 'update',
    localId: blobLocalId(desc.storeKey, activeId),
    payload,
  });
}

const BLOB_DEBOUNCE_MS = 800;

/**
 * Generic write-through for every `versioned-blob` manifest store: on any
 * change, debounce ~800ms then enqueue the active-project slice. One timer
 * per store so a burst of edits collapses to a single push. Returns an
 * unsubscribe that also clears pending timers.
 */
function subscribeVersionedBlobs(): () => void {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const unsubs: (() => void)[] = [];
  for (const desc of SYNCED_STORES) {
    if (
      desc.classification !== 'versioned-blob' ||
      !desc.store ||
      !desc.selectForProject
    ) {
      continue;
    }
    const d = desc;
    const store = desc.store;
    unsubs.push(
      store.subscribe(() => {
        if (isSyncing) return;
        const existing = timers.get(d.storeKey);
        if (existing) clearTimeout(existing);
        timers.set(
          d.storeKey,
          setTimeout(() => {
            timers.delete(d.storeKey);
            void enqueueVersionedBlob(d).catch((err) =>
              console.warn(
                `[SYNC] state-blob "${d.storeKey}" enqueue failed:`,
                err,
              ),
            );
          }, BLOB_DEBOUNCE_MS),
        );
      }),
    );
  }
  return () => {
    for (const t of timers.values()) clearTimeout(t);
    for (const u of unsubs) u();
  };
}

/**
 * Per-(storeKey) snapshot of the ACTIVE project's records, as recordId → JSON,
 * so a store change can be diffed down to exactly the records that changed.
 * Tagged with the projectId it was taken for: when the active project switches,
 * the snapshot is reseeded (NOT diffed) so switching projects never re-pushes
 * the whole newly-active project as "changes".
 */
interface TypedRecordSnapshot {
  projectId: string;
  recs: Map<string, string>;
}
const typedRecordSnapshots = new Map<string, TypedRecordSnapshot>();

/**
 * Enqueue ONE typed record's active-project op. Per-record analogue of
 * enqueueVersionedBlob: resolves the active project + serverId at enqueue time
 * (skips silently — once, in dev — when the project has no serverId, exactly
 * like the blob path), reads the per-record baseRev, and coalesces in the queue
 * under the 3-part recordLocalId so each record pushes independently.
 */
export async function enqueueTypedRecord(
  desc: SyncedStoreDescriptor,
  recordId: string,
  record: unknown,
  meta?: SyncedRecordMeta,
): Promise<void> {
  const activeId = useProjectStore.getState().activeProjectId;
  if (!activeId) return;
  if (!getProjectServerId(activeId)) {
    if (import.meta.env.DEV && !warnedNoServerId.has(activeId)) {
      warnedNoServerId.add(activeId);
      console.info(
        `[SYNC] Skipping typed-record push for project "${activeId}": no serverId yet ` +
          `(builtin/demo projects are viewer-only). Create/own a project to exercise sync.`,
      );
    }
    return;
  }
  const payload: TypedRecordOpPayload = {
    projectLocalId: activeId,
    storeKey: desc.storeKey,
    recordId,
    schemaVersion: desc.schemaVersion ?? 1,
    baseRev: getRecordBaseRev(desc.storeKey, activeId, recordId),
    payload: record,
    observedAt: meta?.observedAt ?? null,
    sourceType: meta?.sourceType ?? null,
    cycleId: meta?.cycleId ?? null,
    taskType: meta?.taskType ?? null,
  };
  await syncQueue.enqueue({
    storeType: 'typed-record',
    action: 'update',
    localId: recordLocalId(desc.storeKey, activeId, recordId),
    payload,
    // 5-tier drain priority (ADR 12), derived from the record's own fields —
    // divergenceFlag/taskType/cycleId are native on the FieldAction, so the tier
    // is read directly here (SyncedRecordMeta does not carry divergenceFlag).
    priority: derivePriority(record as RecordTierFields),
  });
}

/**
 * Diff one typed-record store's active-project records against the last
 * snapshot and enqueue an update op per added/changed record. Upsert-only:
 * removed records are not pushed in Phase 1 (no per-record delete on the wire).
 * On first run for a store, or when the active project changed, the snapshot is
 * reseeded WITHOUT enqueuing so a project switch never floods the queue.
 */
async function flushTypedRecordStore(desc: SyncedStoreDescriptor): Promise<void> {
  if (!desc.store || !desc.selectRecordsForProject) return;
  const activeId = useProjectStore.getState().activeProjectId;
  if (!activeId) return;
  const entries = desc.selectRecordsForProject(desc.store.getState(), activeId);
  const currJson = new Map<string, string>();
  const currMeta = new Map<string, { record: unknown; meta?: SyncedRecordMeta }>();
  for (const e of entries) {
    currJson.set(e.recordId, JSON.stringify(e.record));
    currMeta.set(e.recordId, { record: e.record, meta: e.meta });
  }
  const prev = typedRecordSnapshots.get(desc.storeKey);
  if (!prev || prev.projectId !== activeId) {
    // First run for this store, or active project changed → (re)seed the diff
    // baseline; do not treat the existing records as fresh changes.
    typedRecordSnapshots.set(desc.storeKey, { projectId: activeId, recs: currJson });
    return;
  }
  for (const [recordId, json] of currJson) {
    if (prev.recs.get(recordId) === json) continue;
    const entry = currMeta.get(recordId);
    if (entry) await enqueueTypedRecord(desc, recordId, entry.record, entry.meta);
  }
  typedRecordSnapshots.set(desc.storeKey, { projectId: activeId, recs: currJson });
}

/**
 * Reseed every typed-record snapshot to the current store contents WITHOUT
 * enqueuing — called once after initialSync's hydrate so freshly-restored
 * records are the diff baseline, not re-pushed as changes on the first later
 * edit. (Such a push would be correct — it carries the hydrated baseRev — but
 * needless; this keeps the first post-hydrate edit a single-record push.)
 */
function reseedTypedRecordSnapshots(): void {
  const activeId = useProjectStore.getState().activeProjectId;
  if (!activeId) return;
  for (const desc of SYNCED_STORES) {
    if (
      desc.classification !== 'typed-record' ||
      !desc.store ||
      !desc.selectRecordsForProject
    ) {
      continue;
    }
    const entries = desc.selectRecordsForProject(desc.store.getState(), activeId);
    const recs = new Map<string, string>();
    for (const e of entries) recs.set(e.recordId, JSON.stringify(e.record));
    typedRecordSnapshots.set(desc.storeKey, { projectId: activeId, recs });
  }
}

/**
 * Generic write-through for every `typed-record` manifest store (the 4 Act
 * stores): on any change, debounce ~800ms then diff the active project's
 * records and enqueue one op per changed record. Per-record analogue of
 * subscribeVersionedBlobs. Seeds the snapshot eagerly at subscribe time so
 * records already present (persisted from a prior session) are the diff
 * baseline, not re-pushed on the first edit. Returns an unsubscribe that clears
 * pending timers.
 */
function subscribeTypedRecords(): () => void {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const unsubs: (() => void)[] = [];
  for (const desc of SYNCED_STORES) {
    if (
      desc.classification !== 'typed-record' ||
      !desc.store ||
      !desc.selectRecordsForProject
    ) {
      continue;
    }
    const d = desc;
    const store = desc.store;
    // Seed the baseline now so records present at subscribe time are not diffed
    // as fresh changes on the first post-subscribe edit.
    void flushTypedRecordStore(d).catch(() => {});
    unsubs.push(
      store.subscribe(() => {
        if (isSyncing) return;
        const existing = timers.get(d.storeKey);
        if (existing) clearTimeout(existing);
        timers.set(
          d.storeKey,
          setTimeout(() => {
            timers.delete(d.storeKey);
            void flushTypedRecordStore(d).catch((err) =>
              console.warn(
                `[SYNC] typed-record "${d.storeKey}" enqueue failed:`,
                err,
              ),
            );
          }, BLOB_DEBOUNCE_MS),
        );
      }),
    );
  }
  return () => {
    for (const t of timers.values()) clearTimeout(t);
    for (const u of unsubs) u();
  };
}

/**
 * Called when the queue gives up on an op after MAX_RETRIES. The op is already
 * dropped from the queue by this point; this surfaces the give-up so a
 * permanently-failing write is visible to the steward (Connectivity badge +
 * one toast per distinct op) rather than vanishing silently. This is the
 * circuit-breaker's payoff: failures now count, back off, and surface.
 */
export function handleExhaustedOp(op: QueuedOperation): void {
  console.error(
    `[SYNC] Giving up on op after repeated failures: ${op.id}`,
    op.lastError,
  );
  const conn = useConnectivityStore.getState();
  if (!conn.droppedStores.includes(op.id)) {
    conn.addDroppedStore(op.id);
    toast.error(
      `A change (${op.storeType} ${op.action}) could not be saved to the ` +
        `server after several retries. It is kept on this device — see ` +
        `Connectivity.`,
    );
  }
}

export async function executeQueuedOp(op: QueuedOperation): Promise<void> {
  const payload = op.payload as Record<string, unknown>;

  switch (op.storeType) {
    case 'project': {
      if (op.action === 'create') {
        const project = payload as unknown as LocalProject;
        await syncProjectCreate(project, true);
      } else if (op.action === 'update') {
        const project = payload as unknown as LocalProject;
        await syncProjectUpdate(project, true);
      } else if (op.action === 'delete') {
        const serverId = payload.serverId as string;
        if (serverId) await api.projects.delete(serverId);
      }
      break;
    }
    case 'zone': {
      if (op.action === 'create') {
        const zone = payload as unknown as LandZone;
        await syncZoneCreate(zone, true);
      } else if (op.action === 'update') {
        const zone = payload as unknown as LandZone;
        await syncZoneUpdate(zone, true);
      } else if (op.action === 'delete') {
        const serverId = payload.serverId as string;
        if (serverId) await api.designFeatures.delete(serverId);
      }
      break;
    }
    case 'structure': {
      if (op.action === 'create') {
        const structure = payload as unknown as Structure;
        await syncStructureCreate(structure, true);
      } else if (op.action === 'update') {
        const structure = payload as unknown as Structure;
        await syncStructureUpdate(structure, true);
      } else if (op.action === 'delete') {
        const serverId = payload.serverId as string;
        if (serverId) await api.designFeatures.delete(serverId);
      }
      break;
    }
    case 'path': {
      if (op.action === 'create') {
        await syncPathCreate(payload as unknown as DesignPath, true);
      } else if (op.action === 'update') {
        await syncPathUpdate(payload as unknown as DesignPath, true);
      } else if (op.action === 'delete') {
        const serverId = payload.serverId as string;
        if (serverId) await api.designFeatures.delete(serverId);
      }
      break;
    }
    case 'point': {
      if (op.action === 'create') {
        await syncUtilityCreate(payload as unknown as Utility, true);
      } else if (op.action === 'update') {
        await syncUtilityUpdate(payload as unknown as Utility, true);
      } else if (op.action === 'delete') {
        const serverId = payload.serverId as string;
        if (serverId) await api.designFeatures.delete(serverId);
      }
      break;
    }
    case 'vegetation': {
      if (op.action === 'create') {
        await typedCreate(vegetationSpec, payload as unknown as VegetationPatch, true);
      } else if (op.action === 'update') {
        await typedUpdate(vegetationSpec, payload as unknown as VegetationPatch, true);
      } else if (op.action === 'delete') {
        const id = (payload as { id: string }).id;
        if (id) await api.vegetation.delete(id);
      }
      break;
    }
    case 'succession': {
      if (op.action === 'create') {
        await typedCreate(successionSpec, payload as unknown as SuccessionMilestone, true);
      } else if (op.action === 'update') {
        await typedUpdate(successionSpec, payload as unknown as SuccessionMilestone, true);
      } else if (op.action === 'delete') {
        const id = (payload as { id: string }).id;
        if (id) await api.succession.delete(id);
      }
      break;
    }
    case 'state-blob': {
      await executeStateBlobOp(op);
      break;
    }
    case 'typed-record': {
      await executeTypedRecordOp(op);
      break;
    }
    case 'comment': {
      if (op.action === 'create') {
        const { projectId, input, authorName, localId } = payload as {
          projectId: string;
          input: { text: string; location?: [number, number]; featureId?: string; featureType?: string };
          authorName: string;
          localId: string;
        };
        const { data } = await api.comments.create(projectId, input);
        if (data) {
          // Update local comment with serverId
          const { useCommentStore } = await import('../store/commentStore.js');
          useCommentStore.getState().updateComment(localId, { serverId: data.id });
        }
      }
      break;
    }
    case 'proof_photo_upload': {
      // Drain a queued field-action proof photo. Read the blob back from
      // IndexedDB, POST it to the stub upload endpoint, then swap the
      // proof item's local `idb://` URI for the canonical `storage://`
      // URI returned by the server and flip its `fileSyncStatus` to
      // `'uploaded'`. The blob stays in IDB until the field action itself
      // is removed (so a future replay can re-upload without re-capture).
      const { projectId, actionId, slotId, proofItemId, fileName, fileMime } = payload as {
        projectId: string;
        actionId: string;
        slotId: string;
        proofItemId: string;
        fileName: string;
        fileMime: string;
      };
      const { proofPhotoStore } = await import('./proofPhotoStore.js');
      const blob = await proofPhotoStore.getBlob(actionId, slotId);
      if (!blob) {
        // Local blob gone (cache eviction, manual clear, etc.) — drop the
        // op rather than retry forever. The proof item keeps its
        // `idb://` URI so the slot still shows captured; the steward can
        // re-attach to recover.
        console.warn(
          `[SYNC] proof_photo_upload: no local blob for ${actionId}:${slotId}; dropping op.`,
        );
        return;
      }
      // The route's auth chain (`resolveProjectRole` → `requireRole`) looks
      // up the project by its server id, so we must POST against `serverId`
      // — not the local UUID enqueued with the op. If the prior
      // `project_create` op hasn't drained yet, `serverId` is missing;
      // throw so the queue retries with backoff once the upstream op
      // populates it (FIFO ordering means create normally drains first,
      // but a transient failure of create can invert the order — the
      // retry contract handles either path).
      const project = useProjectStore
        .getState()
        .projects.find((p) => p.id === projectId);
      if (!project?.serverId) {
        throw new Error(
          `proof_photo_upload: project ${projectId} has no serverId yet; deferring.`,
        );
      }
      const { data } = await api.proofPhoto.upload(project.serverId, {
        actionId,
        slotId,
        blob,
        fileName,
        fileMime,
      });
      if (!data?.assetUri) return;
      const { useFieldActionStore } = await import('../store/fieldActionStore.js');
      const store = useFieldActionStore.getState();
      const action = store.getById(projectId, actionId);
      if (!action) return;
      const nextProofItems = action.proofItems.map((p) =>
        p.id === proofItemId
          ? { ...p, fileUri: data.assetUri, fileSyncStatus: 'uploaded' as const }
          : p,
      );
      store.updateFieldAction(projectId, actionId, { proofItems: nextProofItems });
      break;
    }
  }
}

async function onOnline() {
  console.info('[SYNC] Network restored, flushing queue...');
  const conn = useConnectivityStore.getState();
  const count = await syncQueue.getPendingCount();
  if (count === 0) return;

  conn.setSyncStatus('syncing');
  conn.setPendingChanges(count);
  try {
    await syncQueue.flush(executeQueuedOp, handleExhaustedOp);
    const remaining = await syncQueue.getPendingCount();
    conn.setPendingChanges(remaining);
    conn.setLastSyncedAt(new Date().toISOString());
    conn.setSyncStatus('idle');
  } catch (err) {
    console.warn('[SYNC] Queue flush failed:', err);
    conn.setSyncStatus('error');
  }
}

function startHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(async () => {
    if (document.visibilityState !== 'visible') return;
    const count = await syncQueue.getPendingCount();
    const conn = useConnectivityStore.getState();
    conn.setPendingChanges(count);
    if (count > 0 && navigator.onLine) {
      syncQueue.flush(executeQueuedOp, handleExhaustedOp).catch((err) => {
        console.warn('[SYNC] Heartbeat flush failed:', err);
      });
    }
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const syncService = {
  /**
   * Start the sync service: subscribe to store changes, run initial fetch
   * and merge, and begin online/offline monitoring.
   */
  async start(): Promise<void> {
    // Prevent double-start
    if (unsubscribers.length > 0) return;

    console.info('[SYNC] Starting sync service...');

    // Collapse any runaway/legacy queue to one op per entity before anything
    // can flush it. A queue that grew unbounded (random-id append + re-enqueue
    // on every failure) would otherwise be loaded whole on the first flush and
    // OOM the renderer. Cursor-based + idempotent — a healthy queue is a no-op.
    try {
      const { before, after } = await syncQueue.reconcile();
      if (before !== after) {
        console.info(`[SYNC] Reconciled sync queue: ${before} → ${after} ops`);
      }
    } catch (err) {
      console.warn('[SYNC] Queue reconcile failed:', err);
    }

    // Subscribe to store changes for write-through sync
    unsubscribers.push(subscribeToProjects());
    unsubscribers.push(subscribeToZones());
    unsubscribers.push(subscribeToStructures());
    unsubscribers.push(subscribeToPaths());
    unsubscribers.push(subscribeToUtilities());

    // Generic versioned-blob write-through for the remaining ~62
    // project-scoped stores. Disabled by default — Phase 2 is a push-only
    // shadow; hydration + conflict surface land in Phase 4.
    if (FLAGS.SYNC_STATE_BLOBS) {
      unsubscribers.push(subscribeVersionedBlobs());
      unsubscribers.push(subscribeTypedRecords());
      unsubscribers.push(subscribeToVegetation());
      unsubscribers.push(subscribeToSuccession());
    }

    // Online/offline listeners
    window.addEventListener('online', onOnline);

    // Start periodic heartbeat
    startHeartbeat();

    // Run initial sync
    await initialSync();

    // After hydrate, reseed typed-record snapshots so the first later edit
    // diffs against the restored set (a single-record push) instead of
    // re-pushing every hydrated record. No-op when record sync is disabled.
    if (FLAGS.SYNC_STATE_BLOBS) reseedTypedRecordSnapshots();

    // Report sync completion to connectivity store
    const conn = useConnectivityStore.getState();
    conn.setLastSyncedAt(new Date().toISOString());

    // Pre-cache map tiles for the active project's bounding box (fire-and-forget)
    if (FLAGS.OFFLINE_MODE) {
      try {
        const activeId = useProjectStore.getState().activeProjectId;
        const project = activeId
          ? useProjectStore.getState().projects.find((p) => p.id === activeId)
          : null;
        if (project?.parcelBoundaryGeojson) {
          const bbox = getBboxFromGeojson(project.parcelBoundaryGeojson);
          if (bbox) {
            precacheProjectTiles(bbox).catch((err) =>
              console.warn('[SYNC] Tile precache failed:', err),
            );
          }
        }
      } catch (err) {
        console.warn('[SYNC] Tile precache setup failed:', err);
      }
    }

    // Flush any queued operations from previous sessions
    const count = await syncQueue.getPendingCount();
    conn.setPendingChanges(count);
    if (count > 0 && navigator.onLine) {
      conn.setSyncStatus('syncing');
      syncQueue.flush(executeQueuedOp, handleExhaustedOp)
        .then(async () => {
          const remaining = await syncQueue.getPendingCount();
          conn.setPendingChanges(remaining);
          conn.setLastSyncedAt(new Date().toISOString());
          conn.setSyncStatus('idle');
        })
        .catch((err) => {
          console.warn('[SYNC] Initial queue flush failed:', err);
          conn.setSyncStatus('error');
        });
    }

    console.info('[SYNC] Sync service started.');
  },

  /**
   * Stop the sync service: unsubscribe from stores, remove listeners,
   * and clear timers.
   */
  stop(): void {
    for (const unsub of unsubscribers) {
      unsub();
    }
    unsubscribers = [];
    window.removeEventListener('online', onOnline);
    stopHeartbeat();
    isSyncing = false;
    console.info('[SYNC] Sync service stopped.');
  },

  /** Get the number of pending operations in the retry queue. */
  async getPendingCount(): Promise<number> {
    return syncQueue.getPendingCount();
  },
};
