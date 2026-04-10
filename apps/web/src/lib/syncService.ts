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
import { useProjectStore, type LocalProject } from '../store/projectStore.js';
import { useZoneStore, type LandZone } from '../store/zoneStore.js';
import { useStructureStore, type Structure } from '../store/structureStore.js';
import type { CreateDesignFeatureInput, DesignFeatureSummary } from '@ogden/shared';

// ─── Internal state ──────────────────────────────────────────────────────────

/** Guard flag: true while the sync service is writing to stores (prevents
 *  recursive subscription triggers). */
let isSyncing = false;

/** Subscription unsubscribe functions */
let unsubscribers: (() => void)[] = [];

/** Heartbeat timer for periodic queue flush */
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

const HEARTBEAT_INTERVAL_MS = 30_000;

// ─── Field mapping helpers ───────────────────────────────────────────────────

function zoneToDesignFeature(zone: LandZone, projectServerId: string): CreateDesignFeatureInput {
  return {
    featureType: 'zone',
    subtype: zone.category,
    geometry: zone.geometry,
    label: zone.name,
    properties: {
      primaryUse: zone.primaryUse,
      secondaryUse: zone.secondaryUse,
      notes: zone.notes,
      areaM2: zone.areaM2,
      localId: zone.id,
      color: zone.color,
    },
    style: { color: zone.color },
    sortOrder: 0,
  };
}

function structureToDesignFeature(structure: Structure, projectServerId: string): CreateDesignFeatureInput {
  return {
    featureType: 'structure',
    subtype: structure.type,
    geometry: structure.geometry,
    label: structure.name,
    properties: {
      center: structure.center,
      rotationDeg: structure.rotationDeg,
      widthM: structure.widthM,
      depthM: structure.depthM,
      costEstimate: structure.costEstimate,
      infrastructureReqs: structure.infrastructureReqs,
      notes: structure.notes,
      localId: structure.id,
    },
    phaseTag: structure.phase || undefined,
    sortOrder: 0,
  };
}

function designFeatureToZone(df: DesignFeatureSummary, projectLocalId: string): LandZone {
  const props = df.properties as Record<string, unknown>;
  return {
    id: (props.localId as string) || crypto.randomUUID(),
    projectId: projectLocalId,
    name: df.label ?? '',
    category: (df.subtype ?? 'habitation') as LandZone['category'],
    color: (props.color as string) ?? (df.style as Record<string, unknown>)?.color as string ?? '#888888',
    primaryUse: (props.primaryUse as string) ?? '',
    secondaryUse: (props.secondaryUse as string) ?? '',
    notes: (props.notes as string) ?? '',
    geometry: df.geometry as LandZone['geometry'],
    areaM2: (props.areaM2 as number) ?? 0,
    createdAt: df.createdAt,
    updatedAt: df.updatedAt,
    serverId: df.id,
  };
}

function designFeatureToStructure(df: DesignFeatureSummary, projectLocalId: string): Structure {
  const props = df.properties as Record<string, unknown>;
  return {
    id: (props.localId as string) || crypto.randomUUID(),
    projectId: projectLocalId,
    name: df.label ?? '',
    type: (df.subtype ?? 'cabin') as Structure['type'],
    center: (props.center as [number, number]) ?? [0, 0],
    geometry: df.geometry as Structure['geometry'],
    rotationDeg: (props.rotationDeg as number) ?? 0,
    widthM: (props.widthM as number) ?? 0,
    depthM: (props.depthM as number) ?? 0,
    phase: df.phaseTag ?? '',
    costEstimate: (props.costEstimate as number | null) ?? null,
    infrastructureReqs: (props.infrastructureReqs as string[]) ?? [],
    notes: (props.notes as string) ?? '',
    createdAt: df.createdAt,
    updatedAt: df.updatedAt,
    serverId: df.id,
  };
}

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
    const { added, removed, updated } = diffArrayById(curr, prevProjects);
    prevProjects = curr;

    for (const project of added) {
      syncProjectCreate(project);
    }
    for (const project of updated) {
      syncProjectUpdate(project);
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
  let prevStructures = useStructureStore.getState().structures;

  return useStructureStore.subscribe((state) => {
    if (isSyncing) return;
    const curr = state.structures;
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

async function syncProjectCreate(project: LocalProject) {
  try {
    const { data } = await api.projects.create({
      name: project.name,
      description: project.description ?? undefined,
      projectType: project.projectType as Parameters<typeof api.projects.create>[0]['projectType'],
      country: project.country,
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
        await api.projects.setBoundary(data.id, project.parcelBoundaryGeojson);
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
    useStructureStore.getState().updateStructure(structure.id, { serverId: data.id });
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
        // Server wins — update local with server data
        useProjectStore.getState().updateProject(existing.id, {
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
          serverId: sp.id,
        });
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
          units: 'metric',
          attachments: [],
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
          country: lp.country,
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
    const localStructures = useStructureStore.getState().structures.filter((s) => s.projectId === project.id);
    const localStructureByServerId = new Map(localStructures.filter((s) => s.serverId).map((s) => [s.serverId!, s]));

    // Merge server structures → local
    for (const ss of serverStructures) {
      const existing = localStructureByServerId.get(ss.id);
      if (existing) {
        const merged = designFeatureToStructure(ss, project.id);
        useStructureStore.getState().updateStructure(existing.id, { ...merged, id: existing.id });
      } else {
        const newStructure = designFeatureToStructure(ss, project.id);
        useStructureStore.getState().addStructure(newStructure);
      }
    }

    // Push unsynced local structures to server
    const unsyncedStructures = useStructureStore.getState().structures.filter(
      (s) => s.projectId === project.id && !s.serverId,
    );
    for (const structure of unsyncedStructures) {
      try {
        const input = structureToDesignFeature(structure, project.serverId);
        const { data } = await api.designFeatures.create(project.serverId, input);
        useStructureStore.getState().updateStructure(structure.id, { serverId: data.id });
      } catch (err) {
        console.warn(`[SYNC] Failed to push structure "${structure.name}":`, err);
      }
    }
  } catch (err) {
    console.warn(`[SYNC] Failed to merge design features for project "${project.name}":`, err);
  }
}

// ─── C. Online/offline resilience ────────────────────────────────────────────

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
  }
}

function onOnline() {
  console.info('[SYNC] Network restored, flushing queue...');
  syncQueue.flush(executeQueuedOp).catch((err) => {
    console.warn('[SYNC] Queue flush failed:', err);
  });
}

function startHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(async () => {
    if (document.visibilityState !== 'visible') return;
    const count = await syncQueue.getPendingCount();
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

    // Online/offline listeners
    window.addEventListener('online', onOnline);

    // Start periodic heartbeat
    startHeartbeat();

    // Run initial sync
    await initialSync();

    // Flush any queued operations from previous sessions
    const count = await syncQueue.getPendingCount();
    if (count > 0 && navigator.onLine) {
      syncQueue.flush(executeQueuedOp).catch((err) => {
        console.warn('[SYNC] Initial queue flush failed:', err);
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
