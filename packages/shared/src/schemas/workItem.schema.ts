/**
 * WorkItem — the canonical operating-loop spine (Sub-project D0).
 *
 * One model for ALL planned/schedulable work. It supersedes five legacy
 * planned-work stores by being their union superset:
 *   - phaseStore                 PhaseTask              (source: 'goal-compass')
 *   - fieldTaskStore             FieldTask              (source: 'field-task')
 *   - maintenanceStore           MaintenanceTask        (source: 'maintenance')
 *   - scheduledLivestockMoveStore ScheduledLivestockMove(source: 'scheduled-livestock-move')
 *   - nurseryStore               PropagationBatch       (source: 'nursery-batch')
 *   - manual steward-authored rows                      (source: 'manual')
 *
 * The append-only actual-event logs (harvest / livestock-move /
 * maintenance / succession / nursery-transfer) are NOT migrated — each log
 * entry instead carries an optional `workItemId` pointing back at the
 * WorkItem it proves complete (execution history). D0 stores the edge only.
 *
 * Net-new spine dimensions over the legacy models: a real status lifecycle,
 * dependency edges (`dependsOn`, stored not computed — D1 owns critical
 * path), assignment, and an actual-vs-scheduled date split.
 *
 * Client-first: no DB migration. The store rides the existing
 * `versioned-blob` / `projectId-tagged` sync class (mirrors `ogden-phases`).
 *
 * `.passthrough()` so an unforeseen legacy field survives migration,
 * mirroring the A-series registry discipline.
 */

import { z } from 'zod';
import { CostRangeSchema } from './costRange.schema.js';

/** Which legacy planned-work surface a WorkItem originated from. */
export const WorkItemSource = z.enum([
  'goal-compass',
  'field-task',
  'maintenance',
  'scheduled-livestock-move',
  'nursery-batch',
  'cover-crop',
  'rotation-sequence',
  'habitat-feature',
  'tree-planting',
  'manual',
]);
export type WorkItemSource = z.infer<typeof WorkItemSource>;

/** Net-new lifecycle. Legacy boolean `done` collapses into `done`/`todo`. */
export const WorkItemStatus = z.enum([
  'todo',
  'in-progress',
  'blocked',
  'done',
  'cancelled',
]);
export type WorkItemStatus = z.infer<typeof WorkItemStatus>;

/**
 * Union of `MaintenanceTask.cadence` (daily|weekly|monthly|quarterly|
 * annual) and Goal-Compass `MaintenanceFrequency` (monthly|quarterly|
 * annual|biennial|every-3-years).
 */
export const WorkItemRecurrence = z.enum([
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'annual',
  'biennial',
  'every-3-years',
]);
export type WorkItemRecurrence = z.infer<typeof WorkItemRecurrence>;

/** Carries `FieldTask.category`. */
export const WorkItemCategory = z.enum([
  'ops',
  'weather',
  'regulation',
  'team',
  'education',
]);
export type WorkItemCategory = z.infer<typeof WorkItemCategory>;

/** Carries `FieldTask.priority`. */
export const WorkItemPriority = z.enum(['low', 'normal', 'high']);
export type WorkItemPriority = z.infer<typeof WorkItemPriority>;

/** Carries `ScheduledLivestockMove.direction` (lossless). */
export const WorkItemMoveDirection = z.enum([
  'move_in',
  'move_out',
  'rotate_through',
]);
export type WorkItemMoveDirection = z.infer<typeof WorkItemMoveDirection>;

/** Yeomans Scale-of-Permanence layer (mirrors phaseStore `DesignLayer`). */
export const WorkItemDesignLayer = z.enum([
  'earthworks',
  'water',
  'vegetation',
  'structures',
]);
export type WorkItemDesignLayer = z.infer<typeof WorkItemDesignLayer>;

const ProjectRoleEnum = z.enum(['owner', 'designer', 'reviewer', 'viewer']);

/**
 * Lossless carry of one procurement material line (Goal Compass). Mirrors
 * the legacy `MaterialLine` exactly (no `.passthrough()`: the concrete
 * legacy shape is these four fields, and the top-level WorkItem
 * `.passthrough()` already protects against unforeseen fields).
 */
export const MaterialLineSchema = z.object({
  label: z.string(),
  quantityPerAcre: z.number().optional(),
  unit: z.string(),
  notes: z.string().optional(),
});
export type MaterialLine = z.infer<typeof MaterialLineSchema>;

/**
 * Spatial linkage for moves/transfers. Carries scheduled-livestock-move
 * from/to paddock-or-structure refs and the nursery destination zone. Free
 * `kind` so we don't couple to any specific store.
 */
const WorkItemTargetSchema = z
  .object({
    kind: z.string(),
    fromId: z.string().optional(),
    toId: z.string().optional(),
  })
  .passthrough();

export const WorkItemSchema = z
  .object({
    // --- identity / provenance ---
    id: z.string().min(1),
    projectId: z.string().min(1),
    source: WorkItemSource,
    /**
     * Goal Compass owns `source:'goal-compass' && !overridden` rows and may
     * regenerate them. `overridden:true` (steward edited) and
     * `source:'manual'` rows survive regeneration untouched. Replaces
     * phaseStore's `status:'generated'|'overridden'`.
     */
    overridden: z.boolean(),
    generatedFromInterventionId: z.string().optional(),
    /** Composite `<species>:<cropAreaId>:<year>` (planting calendar). */
    generatedFromPlantingCalendar: z.string().optional(),
    /** Composite `<cropAreaId>__<windowIndex>` (cover-crop plan). */
    generatedFromCoverCropWindow: z.string().optional(),
    /**
     * Composite `<cellGroup>__<paddockId>__<sequenceOrder>__<cycleIndex>`
     * (rotation-sequence plan, B3 spine-push). Identifies the projected
     * livestock-move emitted by `computeMoveCalendar`.
     */
    generatedFromRotationMove: z.string().optional(),
    /**
     * DesignElement id of the habitat-category feature this row was seeded
     * from (owl-box / raptor-perch / nest-box / brush-pile / snag /
     * insectary-strip / wetland-edge). Used by `habitatFeatureSpineSync`
     * to keep one WorkItem per placed habitat element, idempotent on
     * re-runs. `.optional()` + the top-level `.passthrough()` ⇒ no DB
     * migration (A-series additive covenant).
     */
    generatedFromHabitatElement: z.string().optional(),
    /**
     * DesignElement id of the vegetation-category tree this row was
     * seeded from (oak-tree / pine-tree / apple-tree / shrub). Used by
     * `treePlantingSpineSync` (Slice 8-A of the 2026-05-21 habitat-feature
     * unification) to keep one "Plant <kind>" WorkItem per placed tree
     * element, idempotent on re-runs. Also the target id for
     * `habitatFeatureSpineSync` D1 predecessor projection
     * (`habitatMetadata.hostTreeFeatureId` → `dependsOnAuto`).
     * `.optional()` + the top-level `.passthrough()` ⇒ no DB migration
     * (A-series additive covenant).
     */
    generatedFromTreeElement: z.string().optional(),
    goalCriterionId: z.string().optional(),
    catalogVersion: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),

    // --- classification ---
    title: z.string(),
    category: WorkItemCategory.optional(),
    designLayer: WorkItemDesignLayer.optional(),
    season: z.enum(['winter', 'spring', 'summer', 'fall']).optional(),

    // --- phase / feature linkage ---
    phaseId: z.string().nullable(),
    /** Maintenance `linkedFeatureId` / nursery `destinationZoneId`. */
    linkedFeatureId: z.string().optional(),
    target: WorkItemTargetSchema.optional(),

    // --- net-new lifecycle ---
    status: WorkItemStatus,
    doneAt: z.string().nullable().optional(),

    // --- net-new dependency edges (D0 stores; D1 computes) ---
    /** Manual / steward-authored edges (survive Goal-Compass regeneration). */
    dependsOn: z.array(z.string()).default([]),
    /**
     * Goal-Compass-seeded edges (provenance-separated, D1). Regenerated with
     * goal-compass rows; `dependsOn` (manual) is never touched by seeding.
     * Effective dependency DAG = `dependsOn ∪ dependsOnAuto ∪ inverse(precedesAuto)`.
     * `.default([])` + the top-level `.passthrough()` ⇒ existing persisted
     * rows hydrate clean — no DB migration (A-series additive covenant).
     */
    dependsOnAuto: z.array(z.string()).default([]),
    /**
     * B5.2.x.c — denormalized inverse dependency edges. An id in
     * `X.precedesAuto` means *X must complete before that id starts*.
     * Equivalently, that id treats `X` as a predecessor in the effective
     * DAG. Single-writer-spine discipline forbids cross-source mutation, so
     * "terminate cover-crop before cash-crop" is stored on the cover-crop
     * row (which the cover-crop sync owns) rather than mutating the
     * cash-crop's `dependsOnAuto` (which goal-compass sync owns). D1
     * traversal unions these inverses into each item's predecessor set —
     * see `buildEffectiveGraph` in `workItemGraph.ts`. `.default([])` ⇒ no
     * DB migration.
     */
    precedesAuto: z.array(z.string()).default([]),

    // --- net-new assignment ---
    assigneeId: z.string().optional(),
    who: z.string().optional(),
    roleAccess: z.array(ProjectRoleEnum).optional(),

    // --- scheduling: net-new actual vs scheduled ---
    scheduledStart: z.string().nullable().optional(),
    scheduledEnd: z.string().nullable().optional(),
    actualStart: z.string().nullable().optional(),
    actualEnd: z.string().nullable().optional(),

    // --- recurrence (preserves useEventAggregator forward projection) ---
    isRecurring: z.boolean().optional(),
    recurrenceFrequency: WorkItemRecurrence.optional(),

    // --- estimates carried verbatim for D3 ---
    laborHrs: z.number().optional(),
    costUSD: z.number().optional(),
    /**
     * Goal-Compass-seeded planned-cost band (provenance-separated, D3
     * Approach B — mirrors `materialsAuto` / `equipmentRequiredAuto`).
     * Regenerated with goal-compass rows; the manual point estimate
     * `costUSD` is never touched by seeding. Effective planned cost =
     * manual `costUSD` (a point promoted to a degenerate band) when
     * present, else `costRangeAuto`. `.optional()` + the top-level
     * `.passthrough()` ⇒ existing persisted rows hydrate clean — no DB
     * migration (A-series additive covenant). Covenant (D3, binding):
     * strictly project cost/budget tracking — no financing/capital
     * /investor semantics (Sub-project C, Scholar-gated).
     */
    costRangeAuto: CostRangeSchema.optional(),
    materials: z.array(MaterialLineSchema).optional(),
    /**
     * Goal-Compass-seeded materials (provenance-separated, D2 Approach B —
     * mirrors `dependsOnAuto`). Regenerated with goal-compass rows; manual
     * `materials` is never touched by seeding. Effective BOM = `materials`
     * (manual wins on label+unit) merged with `materialsAuto`. `.default([])`
     * + the top-level `.passthrough()` ⇒ existing persisted rows hydrate
     * clean — no DB migration (A-series additive covenant).
     */
    materialsAuto: z.array(MaterialLineSchema).default([]),
    requiredPersonnel: z
      .object({ skillLevel: z.string().optional(), minCount: z.number() })
      .passthrough()
      .optional(),
    equipmentRequired: z.array(z.string()).optional(),
    /**
     * Goal-Compass-seeded equipment ids (provenance-separated, D2 Approach
     * B). Effective equipment = `equipmentRequired ∪ equipmentRequiredAuto`.
     * `.default([])` + `.passthrough()` ⇒ no DB migration.
     */
    equipmentRequiredAuto: z.array(z.string()).default([]),

    // --- domain payload (lossless carry) ---
    priority: WorkItemPriority.optional(),
    quantity: z.number().optional(),
    unit: z.string().optional(),
    propagationMethod: z.enum(['seed', 'cutting', 'division', 'graft']).optional(),
    growthStage: z
      .enum(['seed', 'germinating', 'seedling', 'juvenile', 'ready_to_plant'])
      .optional(),
    /** Carries `PropagationBatch.seedSaving` (lossless). */
    seedSaving: z.boolean().optional(),
    species: z.string().optional(),
    direction: WorkItemMoveDirection.optional(),
    headCount: z.number().nullable().optional(),
    /** [lng, lat] for location-tied field tasks. */
    location: z.tuple([z.number(), z.number()]).optional(),
    notes: z.string().optional(),
  })
  .passthrough();

export type WorkItem = z.infer<typeof WorkItemSchema>;
