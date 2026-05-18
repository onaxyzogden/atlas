/**
 * workItemStore.migration — the one-time, idempotent legacy supersede
 * (Sub-project D0).
 *
 * Maps the five legacy planned-work stores into the canonical `WorkItem`
 * spine. Pure (reads legacy store state, returns the new spine array) — it
 * never mutates the legacy stores, so their arrays stay intact for
 * rollback. Idempotence is guarded per-source by `migratedSources`: a
 * source already in that list is skipped, so re-running maps nothing new
 * and re-import on every page load is safe.
 *
 * The legacy stores remain authoritative writers until Phase 5 re-points
 * the readers; this migration only seeds the spine.
 */

import type { WorkItem } from '@ogden/shared';
import { usePhaseStore, type PhaseTask } from './phaseStore';
import { useFieldTaskStore } from './fieldTaskStore';
import { useMaintenanceStore } from './maintenanceStore';
import { useScheduledLivestockMoveStore } from './scheduledLivestockMoveStore';
import { useNurseryStore, type PropagationBatch } from './nurseryStore';

export type WorkItemMigrationSource =
  | 'goal-compass'
  | 'field-task'
  | 'maintenance'
  | 'scheduled-livestock-move'
  | 'nursery-batch';

const ALL_SOURCES: WorkItemMigrationSource[] = [
  'goal-compass',
  'field-task',
  'maintenance',
  'scheduled-livestock-move',
  'nursery-batch',
];

const nowIso = () => new Date().toISOString();

/**
 * Pure phaseStore `PhaseTask` → WorkItem. Exported so the Goal-Compass
 * regeneration seam (`goalCompassSpineSync`) produces byte-identical
 * WorkItems to the one-time migration — the override-preservation
 * contract is then guaranteed by construction, not by parallel logic.
 *
 * Preserves phaseStore's regeneration contract: only `status:'generated'`
 * rows are engine-owned and replaceable. `'overridden'` and user-authored
 * (status undefined) rows must survive Goal-Compass regeneration → model
 * them as overridden / manual so `replaceGoalCompassRows` leaves them
 * alone.
 */
export function phaseTaskToWorkItem(
  projectId: string,
  phaseId: string,
  t: PhaseTask,
): WorkItem {
  let source: WorkItem['source'];
  let overridden: boolean;
  if (t.status === 'overridden') {
    source = 'goal-compass';
    overridden = true;
  } else if (t.status === 'generated') {
    source = 'goal-compass';
    overridden = false;
  } else {
    source = 'manual';
    overridden = true;
  }
  return {
    id: t.id,
    projectId,
    source,
    overridden,
    title: t.title,
    phaseId,
    status: t.done ? 'done' : 'todo',
    doneAt: t.doneAt ?? null,
    dependsOn: [],
    dependsOnAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
    season: t.season,
    designLayer: t.designLayer,
    scheduledStart: t.scheduledStart ?? null,
    scheduledEnd: t.scheduledEnd ?? null,
    laborHrs: t.laborHrs,
    costUSD: t.costUSD,
    materials: t.materials,
    requiredPersonnel: t.requiredPersonnel,
    equipmentRequired: t.equipmentRequired,
    generatedFromInterventionId: t.generatedFromIntervention,
    goalCriterionId: t.goalCriterionId,
    catalogVersion: t.catalogVersion,
    generatedFromPlantingCalendar: t.generatedFromPlantingCalendar,
    isRecurring: t.isMaintenanceTask,
    recurrenceFrequency: t.recurrenceFrequency,
    roleAccess: t.roleAccess,
    notes: t.notes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

/** phaseStore `BuildPhase.tasks[]` → WorkItem. */
function mapPhaseTasks(): WorkItem[] {
  const out: WorkItem[] = [];
  for (const p of usePhaseStore.getState().phases) {
    for (const t of p.tasks ?? []) {
      out.push(phaseTaskToWorkItem(p.projectId, p.id, t));
    }
  }
  return out;
}

/** fieldTaskStore `FieldTask` → WorkItem (manual ad-hoc, never regen). */
function mapFieldTasks(): WorkItem[] {
  return useFieldTaskStore.getState().tasks.map((t) => ({
    id: t.id,
    projectId: t.projectId,
    source: 'field-task',
    overridden: true,
    title: t.title,
    phaseId: null,
    status: t.status,
    doneAt: t.status === 'done' ? t.updatedAt : null,
    dependsOn: [],
    dependsOnAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
    category: t.category,
    priority: t.priority,
    location: t.location,
    scheduledStart: null,
    scheduledEnd: t.dueAt,
    notes: t.notes,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

/** maintenanceStore `MaintenanceTask` → recurring WorkItem. */
function mapMaintenance(): WorkItem[] {
  return useMaintenanceStore.getState().tasks.map((t) => ({
    id: t.id,
    projectId: t.projectId,
    source: 'maintenance',
    overridden: true,
    title: t.title,
    phaseId: null,
    status: t.lastDoneAt ? 'done' : 'todo',
    doneAt: t.lastDoneAt ?? null,
    dependsOn: [],
    dependsOnAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
    isRecurring: true,
    recurrenceFrequency: t.cadence,
    season: t.season,
    linkedFeatureId: t.linkedFeatureId,
    notes: t.notes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }));
}

/** scheduledLivestockMoveStore `ScheduledLivestockMove` → WorkItem. */
function mapScheduledLivestockMoves(): WorkItem[] {
  return useScheduledLivestockMoveStore.getState().plans.map((m) => {
    const toId = m.toPaddockId ?? m.toStructureId;
    const fromId = m.fromPaddockId ?? m.fromStructureId;
    const kind = m.toStructureId || m.fromStructureId ? 'structure' : 'paddock';
    return {
      id: m.id,
      projectId: m.projectId,
      source: 'scheduled-livestock-move',
      overridden: true,
      title: `Move ${m.species}${m.headCount != null ? ` (${m.headCount})` : ''}`,
      phaseId: null,
      status: m.fulfilledByEventId ? 'done' : 'todo',
      doneAt: null,
      dependsOn: [],
      dependsOnAuto: [],
      materialsAuto: [],
      equipmentRequiredAuto: [],
      scheduledStart: null,
      scheduledEnd: m.plannedDate,
      target: { kind, fromId, toId },
      species: m.species,
      direction: m.direction,
      headCount: m.headCount,
      who: m.who,
      notes: m.notes,
      createdAt: m.createdAt,
      updatedAt: nowIso(),
    };
  });
}

/**
 * Pure nurseryStore `PropagationBatch` → WorkItem. Exported so the
 * planting-calendar regeneration seam produces byte-identical WorkItems to
 * the one-time migration (wholesale-regen contract preserved by
 * construction). StockTransfer is NOT migrated.
 */
export function propagationBatchToWorkItem(b: PropagationBatch): WorkItem {
  return {
    id: b.id,
    projectId: b.projectId,
    source: 'nursery-batch',
    // Planting-calendar batches are engine-regenerated wholesale → not
    // overridden so `replacePlantingCalendarBatches` may replace them.
    overridden: !b.generatedFromPlantingCalendar,
    title: `Propagate ${b.quantity} ${b.species}`,
    phaseId: null,
    status: b.stage === 'ready_to_plant' ? 'done' : 'todo',
    doneAt: null,
    dependsOn: [],
    dependsOnAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
    scheduledStart: b.sowDate,
    scheduledEnd: b.expectedReadyDate,
    species: b.species,
    quantity: b.quantity,
    propagationMethod: b.method,
    growthStage: b.stage,
    seedSaving: b.seedSaving,
    linkedFeatureId: b.destinationZoneId ?? undefined,
    generatedFromPlantingCalendar: b.generatedFromPlantingCalendar,
    notes: b.notes,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

/** nurseryStore `PropagationBatch` → WorkItem. StockTransfer NOT migrated. */
function mapNurseryBatches(): WorkItem[] {
  return useNurseryStore.getState().batches.map(propagationBatchToWorkItem);
}

const MAPPERS: Record<WorkItemMigrationSource, () => WorkItem[]> = {
  'goal-compass': mapPhaseTasks,
  'field-task': mapFieldTasks,
  maintenance: mapMaintenance,
  'scheduled-livestock-move': mapScheduledLivestockMoves,
  'nursery-batch': mapNurseryBatches,
};

export interface WorkItemMigrationResult {
  items: WorkItem[];
  migratedSources: string[];
}

/**
 * Idempotent supersede. For every legacy source not yet migrated, append
 * its mapped WorkItems and record the source. Returns `null` when there is
 * nothing to do (all sources already migrated) so the caller can skip the
 * `set`. Existing spine rows are never dropped or duplicated — a source is
 * mapped at most once.
 */
export function runWorkItemMigration(
  existingItems: WorkItem[],
  migratedSources: string[],
): WorkItemMigrationResult | null {
  const pending = ALL_SOURCES.filter((s) => !migratedSources.includes(s));
  if (pending.length === 0) return null;

  const seen = new Set(existingItems.map((it) => it.id));
  const added: WorkItem[] = [];
  for (const source of pending) {
    for (const wi of MAPPERS[source]()) {
      if (seen.has(wi.id)) continue; // never duplicate an id
      seen.add(wi.id);
      added.push(wi);
    }
  }

  return {
    items: added.length ? [...existingItems, ...added] : existingItems,
    migratedSources: [...migratedSources, ...pending],
  };
}
