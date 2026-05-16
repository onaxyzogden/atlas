/**
 * runAutoDesign — top-level orchestrator for the Observe-driven
 * whole-site generator. Pure: inputs → outputs, no store writes (the
 * store-commit step lands in Phase 3+).
 *
 * Chain:
 *   1. runSequencingEngine  → selected interventions + phases + tasks
 *   2. per selected intervention with zoneAffinity + geometryTemplate:
 *        allocateZones → stampGeometry → DraftShape[]
 *   3. scheduleTasksToCalendar(phases, tasks, startDate)  (existing)
 *
 * Determinism: a seeded RNG threads `projectId + generationId`. Same
 * Observe state + goal tree + start date ⇒ identical drafts + tasks.
 *
 * Spec: wiki/decisions/2026-05-14-auto-design-pipeline.md.
 */

import type { GoalTree, SiteProfile } from '../../data/goalCompassTypes.js';
import type { BuildPhase } from '../../../../store/phaseStore.js';
import {
  runSequencingEngine,
  type SequencingResult,
} from '../goalCompass/sequencingEngine.js';
import {
  scheduleTasksToCalendar,
  type ScheduledTaskOutput,
} from '../goalCompass/scheduleTasksToCalendar.js';
import { allocateZones } from './zoneAllocator.js';
import { stampGeometry } from './stampGeometry.js';
import { seedRng } from './rng.js';
import {
  computeRegenerationForcing,
  applyAssignmentGate,
  type ForcedRegenerationZone,
} from './regenerationForcing.js';
import {
  computeMaintenanceSchedule,
  type MaintenanceScheduleResult,
} from '../maintenanceSchedule.js';
import {
  EMPTY_TERRAIN,
  type AllocatorZone,
  type DraftShape,
  type TerrainView,
} from './types.js';

export interface AutoDesignInput {
  projectId: string;
  generationId: string;
  goalTree: GoalTree;
  siteProfile: SiteProfile;
  zones: AllocatorZone[];
  terrain?: TerrainView;
  startDate?: string | null;
  /**
   * Barren/compacted zones the steward has explicitly acknowledged for
   * regeneration. Acknowledged zones still receive the mandatory pathway
   * but are released from the assignment gate (productive interventions
   * may also be placed there). Spec §3.2.1.
   */
  acknowledgedRegenerationZoneIds?: string[];
}

export interface AutoDesignResult {
  generationId: string;
  drafts: DraftShape[];
  scheduledTasks: ScheduledTaskOutput[];
  sequencing: SequencingResult;
  /** Interventions selected + zone-affine but which emitted no geometry
   *  (e.g. contour template with no terrain). UI surfaces these. */
  emptyGeometryInterventionIds: string[];
  /** Mandatory regeneration pathways for Barren/Compacted zones (§3.2.1).
   *  Always present; empty when no degraded zones were observed. */
  regenerationPathways: ForcedRegenerationZone[];
  /** Recurring operational-maintenance rollup (§4.3.3). Phase/tasks are
   *  null/empty when no selected intervention carries upkeep metadata. */
  maintenance: MaintenanceScheduleResult;
  /**
   * Every generated phase the consumer must persist via
   * `replaceGoalCompassRows`: the goal-driven phases plus the synthetic
   * regeneration (§3.2.1) and maintenance (§4.3.3) phases. `scheduledTasks`
   * are keyed to these; persisting only a subset silently drops the
   * synthetic-phase tasks.
   */
  generatedPhases: BuildPhase[];
}

export function runAutoDesign(input: AutoDesignInput): AutoDesignResult {
  const {
    projectId,
    generationId,
    goalTree,
    siteProfile,
    zones,
    terrain = EMPTY_TERRAIN,
    startDate,
    acknowledgedRegenerationZoneIds = [],
  } = input;

  const rng = seedRng(projectId + generationId);
  const sequencing = runSequencingEngine(goalTree, siteProfile, projectId);

  // §3.2.1 system obligation: force a regeneration pathway onto every
  // Barren/Compacted zone, independent of the goal tree, and withhold
  // those zones from productive allocation until acknowledged.
  const forcing = computeRegenerationForcing(
    projectId,
    zones,
    siteProfile.soilCompaction.value,
    acknowledgedRegenerationZoneIds,
  );
  const allocatableZones = applyAssignmentGate(zones, forcing.barrenZoneIds);

  const drafts: DraftShape[] = [];
  const emptyGeometryInterventionIds: string[] = [];

  // Distinguish regeneration zones visually on the map (§4.3.1): one
  // fill-polygon draft per forced zone.
  for (const fz of forcing.forcedZones) {
    const zone = zones.find((z) => z.id === fz.zoneId);
    if (!zone) continue;
    drafts.push({
      id: `gd-${generationId}-regeneration-${fz.zoneId}`,
      generationId,
      interventionId: 'regeneration-pathway',
      zoneId: fz.zoneId,
      template: 'fill-polygon',
      geometry: zone.geometry as GeoJSON.Polygon,
      areaM2: zone.areaM2,
    });
  }

  for (const sel of sequencing.selected) {
    const { intervention, acresAllocated } = sel;
    if (!intervention.zoneAffinity || !intervention.geometryTemplate) continue;

    const allocations = allocateZones(intervention, allocatableZones, acresAllocated);
    if (!allocations.length) {
      emptyGeometryInterventionIds.push(intervention.id);
      continue;
    }

    const zoneById = new Map(zones.map((z) => [z.id, z]));
    let emitted = 0;
    for (const alloc of allocations) {
      const zone = zoneById.get(alloc.zoneId);
      if (!zone) continue;
      const geoms = stampGeometry(
        intervention.geometryTemplate,
        zone.geometry,
        alloc.areaM2,
        terrain,
      );
      geoms.forEach((geometry, idx) => {
        drafts.push({
          id: `gd-${generationId}-${intervention.id}-${alloc.zoneId}-${idx}-${rng.int(0, 1_000_000)}`,
          generationId,
          interventionId: intervention.id,
          zoneId: alloc.zoneId,
          template: intervention.geometryTemplate!,
          geometry,
          areaM2: alloc.areaM2 / Math.max(geoms.length, 1),
        });
        emitted += 1;
      });
    }
    if (emitted === 0) emptyGeometryInterventionIds.push(intervention.id);
  }

  // §4.3.3 recurring upkeep: additive synthetic phase woven at the same
  // orchestrator seam as regeneration forcing. Reads maintenance metadata
  // off the selected interventions + recurring regeneration methods.
  const maintenance = computeMaintenanceSchedule(
    projectId,
    sequencing.selected.map((s) => s.intervention),
    forcing.forcedZones,
  );

  const phasesForSchedule = [
    ...(forcing.generatedPhase ? [forcing.generatedPhase] : []),
    ...sequencing.generatedPhases,
    ...(maintenance.generatedPhase ? [maintenance.generatedPhase] : []),
  ];
  const tasksForSchedule = [
    ...forcing.generatedTasks,
    ...sequencing.generatedTasks,
    ...maintenance.generatedTasks,
  ];

  const scheduledTasks = scheduleTasksToCalendar(
    phasesForSchedule,
    tasksForSchedule,
    startDate,
  );

  return {
    generationId,
    drafts,
    scheduledTasks,
    sequencing,
    emptyGeometryInterventionIds,
    regenerationPathways: forcing.forcedZones,
    maintenance,
    generatedPhases: phasesForSchedule,
  };
}
