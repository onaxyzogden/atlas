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
import { syncQueue, type QueuedOperation } from './syncQueue.js';
import { pushProjectStateBlob, buildBlobEnvelope, blobLocalId } from './blobSync.js';
import { SYNCED_STORES, type SyncedStoreDescriptor } from './syncManifest.js';
import { useProjectStore, type LocalProject } from '../store/projectStore.js';
import { useZoneStore, type LandZone } from '../store/zoneStore.js';
import { useVegetationStore, type VegetationPatch } from '../store/vegetationStore.js';
import { useSuccessionStore, type SuccessionMilestone } from '../store/successionStore.js';
import type { ProjectedStructure as Structure } from '@ogden/shared';
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

function subscribeToProjects() {
  let prevProjects = useProjectStore.getState().projects;

  return useProjectStore.subscribe((state) => {
    if (isSyncing) return;
    const curr = state.projects;
    const prevById = new Map(prevProjects.map((p) => [p.id, p]));
    const { added, removed, updated } = diffArrayById(curr, prevProjects);
    prevProjects = curr;

    for (const project of added) {
      syncProjectCreate(project);
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

async function syncProjectCreate(project: LocalProject) {
  try {
    const { data } = await api.projects.create({
      name: project.name,
      description: project.description ?? undefined,
      projectType: project.projectType as Parameters<typeof api.projects.create>[0]['projectType'],
      country: project.country as 'US' | 'CA' | 'INTL',
      provinceState: project.provinceState ?? undefined,
      address: project.address ?? undefined,
      parcelId: project.parcelId ?? undefined,
      units: project.units,
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
    console.warn('[SYNC] Project create failed, queuing:', err);
    await syncQueue.enqueue({
      storeType: 'project',
      action: 'create',
      localId: project.id,
      payload: project,
    });
  }
}

async function syncProjectUpdate(project: LocalProject) {
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
    await syncQueue.enqueue({
      storeType: 'project',
      action: 'update',
      localId: project.id,
      payload: project,
    });
  }
}

async function syncProjectBoundary(project: LocalProject) {
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

async function syncZoneCreate(zone: LandZone) {
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
    await syncQueue.enqueue({
      storeType: 'zone',
      action: 'create',
      localId: zone.id,
      payload: zone,
    });
  }
}

async function syncZoneUpdate(zone: LandZone) {
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

async function syncStructureCreate(structure: Structure) {
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
    await syncQueue.enqueue({
      storeType: 'structure',
      action: 'create',
      localId: structure.id,
      payload: structure,
    });
  }
}

async function syncStructureUpdate(structure: Structure) {
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

async function typedCreate<T extends TypedRecord>(spec: TypedTableSpec<T>, rec: T) {
  const projectServerId = getProjectServerId(rec.projectId);
  if (!projectServerId) return; // project not synced yet — initialSync pushes it
  try {
    await spec.create(projectServerId, rec);
  } catch (err) {
    console.warn(`[SYNC] ${spec.storeType} create failed, queuing:`, err);
    await syncQueue.enqueue({
      storeType: spec.storeType,
      action: 'create',
      localId: rec.id,
      payload: rec,
    });
  }
}

async function typedUpdate<T extends TypedRecord>(spec: TypedTableSpec<T>, rec: T) {
  if (!getProjectServerId(rec.projectId)) return;
  try {
    await spec.update(rec.id, rec);
  } catch (err) {
    console.warn(`[SYNC] ${spec.storeType} update failed, queuing:`, err);
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
  // The local slice is NOT clobbered back; the reconcile is the user's.
  const conn = useConnectivityStore.getState();
  if (!conn.conflictedStores.includes(p.storeKey)) {
    conn.addConflictedStore(p.storeKey);
    toast.warning(
      `A change to "${p.storeKey}" conflicts with a newer version on ` +
        `the server. Your local copy is kept — review it in Connectivity.`,
    );
  }
  console.warn(
    `[SYNC] state-blob "${p.storeKey}" rejected as stale (server rev ` +
      `${result.serverRev}); surfaced as conflict (no clobber)`,
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

/** Shown at most once per session, not once per skewed store. */
let blobVersionSkewWarned = false;

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
  for (const row of rows) {
    const d = descByKey.get(row.storeKey);
    if (!d || !d.store || !d.applyForProject) continue;
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
 * Enqueue one `versioned-blob` store's active-project slice. Resolves the
 * active project at enqueue time; skips silently when there is no active
 * project or it has no serverId yet (a later store edit re-enqueues once the
 * project-create path has bootstrapped the serverId). The op itself resolves
 * serverId again at flush time, so a race here only delays, never drops.
 */
export async function enqueueVersionedBlob(
  desc: SyncedStoreDescriptor,
): Promise<void> {
  if (!desc.store || !desc.selectForProject) return;
  const activeId = useProjectStore.getState().activeProjectId;
  if (!activeId) return;
  if (!getProjectServerId(activeId)) return;
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

async function executeQueuedOp(op: QueuedOperation): Promise<void> {
  const payload = op.payload as Record<string, unknown>;

  switch (op.storeType) {
    case 'project': {
      if (op.action === 'create') {
        const project = payload as unknown as LocalProject;
        await syncProjectCreate(project);
      } else if (op.action === 'update') {
        const project = payload as unknown as LocalProject;
        await syncProjectUpdate(project);
      } else if (op.action === 'delete') {
        const serverId = payload.serverId as string;
        if (serverId) await api.projects.delete(serverId);
      }
      break;
    }
    case 'zone': {
      if (op.action === 'create') {
        const zone = payload as unknown as LandZone;
        await syncZoneCreate(zone);
      } else if (op.action === 'update') {
        const zone = payload as unknown as LandZone;
        await syncZoneUpdate(zone);
      } else if (op.action === 'delete') {
        const serverId = payload.serverId as string;
        if (serverId) await api.designFeatures.delete(serverId);
      }
      break;
    }
    case 'structure': {
      if (op.action === 'create') {
        const structure = payload as unknown as Structure;
        await syncStructureCreate(structure);
      } else if (op.action === 'update') {
        const structure = payload as unknown as Structure;
        await syncStructureUpdate(structure);
      } else if (op.action === 'delete') {
        const serverId = payload.serverId as string;
        if (serverId) await api.designFeatures.delete(serverId);
      }
      break;
    }
    case 'vegetation': {
      if (op.action === 'create') {
        await syncVegetationCreate(payload as unknown as VegetationPatch);
      } else if (op.action === 'update') {
        await syncVegetationUpdate(payload as unknown as VegetationPatch);
      } else if (op.action === 'delete') {
        const id = (payload as { id: string }).id;
        if (id) await api.vegetation.delete(id);
      }
      break;
    }
    case 'succession': {
      if (op.action === 'create') {
        await syncSuccessionCreate(payload as unknown as SuccessionMilestone);
      } else if (op.action === 'update') {
        await syncSuccessionUpdate(payload as unknown as SuccessionMilestone);
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
    await syncQueue.flush(executeQueuedOp);
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
      syncQueue.flush(executeQueuedOp).catch((err) => {
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

    // Subscribe to store changes for write-through sync
    unsubscribers.push(subscribeToProjects());
    unsubscribers.push(subscribeToZones());
    unsubscribers.push(subscribeToStructures());

    // Generic versioned-blob write-through for the remaining ~62
    // project-scoped stores. Disabled by default — Phase 2 is a push-only
    // shadow; hydration + conflict surface land in Phase 4.
    if (FLAGS.SYNC_STATE_BLOBS) {
      unsubscribers.push(subscribeVersionedBlobs());
      unsubscribers.push(subscribeToVegetation());
      unsubscribers.push(subscribeToSuccession());
    }

    // Online/offline listeners
    window.addEventListener('online', onOnline);

    // Start periodic heartbeat
    startHeartbeat();

    // Run initial sync
    await initialSync();

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
      syncQueue.flush(executeQueuedOp)
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
