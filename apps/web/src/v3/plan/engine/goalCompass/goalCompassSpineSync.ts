/**
 * goalCompassSpineSync — the Goal-Compass / planting-calendar write seam
 * onto the canonical WorkItem spine (Sub-project D0, Phase 4).
 *
 * The legacy consumers still call `phaseStore.replaceGoalCompassRows`
 * (retained for rollback — `phase.tasks` is write-dead, not deleted). Each
 * consumer additionally calls the matching `push…ToSpine` here so the
 * spine is the read authority from Phase 5 on.
 *
 * The conversion reuses the *same* pure mappers as the one-time migration
 * (`phaseTaskToWorkItem`, `propagationBatchToWorkItem`), so a regenerated
 * row is byte-identical to a migrated one — the Goal-Compass
 * generated-vs-overridden preservation contract and the planting-calendar
 * wholesale-regen contract are guaranteed by construction, not by parallel
 * logic that could drift.
 *
 * No store import cycle: this module → workItemStore + migration (pure
 * fns); neither imports back here.
 */

import type { WorkItem } from '@ogden/shared';
import type { BuildPhase } from '../../../../store/phaseStore.js';
import type { PropagationBatch } from '../../../../store/nurseryStore.js';
import type { ScheduledTaskOutput } from './scheduleTasksToCalendar.js';
import {
  phaseTaskToWorkItem,
  propagationBatchToWorkItem,
} from '../../../../store/workItemStore.migration.js';
import { useWorkItemStore } from '../../../../store/workItemStore.js';
import { INTERVENTION_CATALOG } from '../../data/interventionCatalog.js';

/** The only catalog fields the dependency seeder needs. */
type SeedCatalogEntry = { id: string; prerequisites: string[] };

/**
 * Pure: derive Goal-Compass-seeded dependency edges from intervention
 * prerequisites. For each generated WorkItem produced by intervention `X`,
 * its `dependsOnAuto` is the set of WorkItem ids (same generation) produced
 * by `X`'s prerequisite interventions. Acyclic by construction — the
 * sequencer already topologically ordered the catalog on `prerequisites`.
 * Coarse phase-`order` fan-in is deliberately not seeded (low-signal/dense).
 */
export function seedGoalCompassDependencies(
  items: WorkItem[],
  catalog: SeedCatalogEntry[] = INTERVENTION_CATALOG,
): Map<string, string[]> {
  const prereqsByIntervention = new Map(
    catalog.map((c) => [c.id, c.prerequisites]),
  );
  const workItemIdsByIntervention = new Map<string, string[]>();
  for (const it of items) {
    const iv = it.generatedFromInterventionId;
    if (!iv) continue;
    const bucket = workItemIdsByIntervention.get(iv);
    if (bucket) bucket.push(it.id);
    else workItemIdsByIntervention.set(iv, [it.id]);
  }
  const edges = new Map<string, string[]>();
  for (const it of items) {
    const iv = it.generatedFromInterventionId;
    if (!iv) continue;
    const prereqs = prereqsByIntervention.get(iv);
    if (!prereqs || prereqs.length === 0) continue;
    const deps: string[] = [];
    for (const p of prereqs) {
      for (const depId of workItemIdsByIntervention.get(p) ?? []) {
        if (depId !== it.id) deps.push(depId);
      }
    }
    if (deps.length > 0) edges.set(it.id, deps);
  }
  return edges;
}

/**
 * Pure: the scheduled Goal-Compass task entries → goal-compass WorkItems.
 * `phaseId → projectId` is resolved from `generatedPhases` (the only place
 * the projectId is carried at generation time).
 */
export function convertScheduledTasksToWorkItems(
  generatedPhases: BuildPhase[],
  scheduled: ScheduledTaskOutput[],
): WorkItem[] {
  const projectIdByPhaseId = new Map(
    generatedPhases.map((p) => [p.id, p.projectId]),
  );
  const out: WorkItem[] = [];
  for (const { phaseId, task } of scheduled) {
    const projectId = projectIdByPhaseId.get(phaseId);
    if (!projectId) continue;
    out.push(phaseTaskToWorkItem(projectId, phaseId, task));
  }
  return out;
}

/**
 * Push a fresh Goal-Compass generation onto the spine. Preserves
 * steward-overridden + manual + every non-goal-compass row (the override
 * contract), replacing only this project's engine-owned generated rows.
 */
export function pushGoalCompassToSpine(
  projectId: string,
  generatedPhases: BuildPhase[],
  scheduled: ScheduledTaskOutput[],
): void {
  const items = convertScheduledTasksToWorkItems(generatedPhases, scheduled);
  const store = useWorkItemStore.getState();
  store.replaceGoalCompassRows(projectId, items);
  // Seed provenance-separated auto edges (D1). Mirrors the row-replacement
  // preservation contract: only this project's generated, un-overridden
  // goal-compass rows get `dependsOnAuto`; manual `dependsOn` is untouched.
  store.replaceGoalCompassDependencies(
    projectId,
    seedGoalCompassDependencies(items),
  );
}

/**
 * Push an annual-planting-calendar regeneration onto the spine. Wholesale-
 * replaces this project's `generatedFromPlantingCalendar` nursery-batch
 * rows; user-authored and Goal-Compass rows untouched.
 */
export function pushPlantingCalendarToSpine(
  projectId: string,
  batches: PropagationBatch[],
): void {
  const items = batches.map(propagationBatchToWorkItem);
  useWorkItemStore.getState().replacePlantingCalendarBatches(projectId, items);
}
