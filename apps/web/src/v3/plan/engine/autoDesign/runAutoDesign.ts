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
import {
  turf,
  toPolygonFeature,
  intersectPolys,
  differencePolys,
  unionPolys,
  type AnyPolyFeature,
} from './geo.js';
import { parcelPolygon } from '../zoneGenerators/parcelGeometry.js';
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
  /**
   * Parcel boundary FeatureCollection. When present, paddock/bed
   * (`tile-strip`) geometry is subdivided from the region inside BOTH
   * the allocated zone and the parcel — strict containment + parcel
   * clip, applied before subdivision so equal-area cells are preserved.
   */
  parcelBoundary?: GeoJSON.FeatureCollection | null;
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
    parcelBoundary = null,
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

  // Steward-approved zones may extend past the parcel (e.g. a ring-seeded
  // zone is explicitly NOT parcel-clipped). Build the parcel polygon once
  // so paddock/bed geometry is subdivided from `zone ∩ parcel`.
  const parcel = parcelBoundary ? parcelPolygon(parcelBoundary) : null;

  const drafts: DraftShape[] = [];
  const emptyGeometryInterventionIds: string[] = [];

  // Footprint already consumed by an earlier `tile-strip` (paddock/bed)
  // intervention. stripSubdivide tiles the WHOLE input polygon regardless
  // of allocated acreage, so two co-selected paddock interventions landing
  // on the same livestock zone would otherwise stack identical grids. We
  // subtract this ledger before subdividing the next one — first-wins by
  // sequencing order, leftover cascades. Lossless union so disjoint
  // earlier claims are never forgotten.
  let claimed: AnyPolyFeature | null = null;

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

      // Paddocks/beds (`tile-strip`) must sit inside BOTH the steward-
      // approved zone and the parcel. Clip to that region BEFORE
      // subdivision so stripSubdivide's equal-area cells can't be
      // re-trimmed afterward. Other templates keep their zone input.
      let stampInput: GeoJSON.Polygon | GeoJSON.MultiPolygon = zone.geometry;
      if (intervention.geometryTemplate === 'tile-strip') {
        let region: AnyPolyFeature | null = parcel
          ? intersectPolys(
              toPolygonFeature(zone.geometry),
              toPolygonFeature(parcel.geometry),
            )
          : (turf.feature(zone.geometry) as AnyPolyFeature);
        if (!region) continue; // suitable zone lies fully outside the parcel
        // First-wins cascade: carve out footprint an earlier paddock/bed
        // intervention already claimed before subdividing this one.
        region = differencePolys(region, claimed);
        if (!region || turf.area(region) <= 1) continue; // nothing left
        stampInput = region.geometry;
      }
      const geoms = stampGeometry(
        intervention.geometryTemplate,
        stampInput,
        alloc.areaM2,
        terrain,
      );
      if (intervention.geometryTemplate === 'tile-strip') {
        for (const g of geoms) {
          if (g.type === 'Polygon') {
            claimed = unionPolys(
              claimed,
              turf.feature(g) as AnyPolyFeature,
            );
          }
        }
      }
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
