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
}

export interface AutoDesignResult {
  generationId: string;
  drafts: DraftShape[];
  scheduledTasks: ScheduledTaskOutput[];
  sequencing: SequencingResult;
  /** Interventions selected + zone-affine but which emitted no geometry
   *  (e.g. contour template with no terrain). UI surfaces these. */
  emptyGeometryInterventionIds: string[];
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
  } = input;

  const rng = seedRng(projectId + generationId);
  const sequencing = runSequencingEngine(goalTree, siteProfile, projectId);

  const drafts: DraftShape[] = [];
  const emptyGeometryInterventionIds: string[] = [];

  for (const sel of sequencing.selected) {
    const { intervention, acresAllocated } = sel;
    if (!intervention.zoneAffinity || !intervention.geometryTemplate) continue;

    const allocations = allocateZones(intervention, zones, acresAllocated);
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

  const scheduledTasks = scheduleTasksToCalendar(
    sequencing.generatedPhases,
    sequencing.generatedTasks,
    startDate,
  );

  return {
    generationId,
    drafts,
    scheduledTasks,
    sequencing,
    emptyGeometryInterventionIds,
  };
}
