// fieldAction.schema.ts
//
// FieldAction — the canonical Act stage execution unit per OLOS Act
// Command Center Spec v1 §2 (Field Action Object Model). One FieldAction
// belongs to one Plan tier objective; many FieldActions roll up into the
// objective's completion. The state machine in
// relationships/fieldActionStatus.ts is the authority on legal transitions.
//
// Locked decision (Phase 3 plan, "Data model"): a NEW entity rather than
// an extension of WorkItem. The two coexist — WorkItem powers the legacy
// command-centre View (carousels of generic planned work), FieldAction
// powers the new Field Action shell (View B + View A + map view). Once
// the legacy shell is retired (Phase 7), WorkItem may be unwound.
//
// `.passthrough()` for the same reason WorkItem uses it — unforeseen
// future fields survive client-side migration without a Zod refusal.

import { z } from 'zod';
import { FieldActionProofItemSchema } from './proofItem.schema.js';
import { DivergenceFlagSchema } from './divergenceFlag.schema.js';

export const FieldActionStatus = z.enum([
  'not_started',
  'in_progress',
  'submitted',
  'verified',
  'diverged',
  'blocked',
]);
export type FieldActionStatus = z.infer<typeof FieldActionStatus>;

/**
 * Routing only (spec §2.3). Never displayed in UI copy.
 *
 * OLOS Act Command Center 4-value taxonomy (ADR 2 / ADR 7 Phase 0). The
 * 5-tier offline-sync priority queue (ADR 12 -> ADR 7 Phase 2) needs the
 * `monitoring_task` discriminator (tier 4) distinct from surveys (tiers
 * 2-3) and implementation proof (tier 5); `administrative_task` is the
 * non-field bucket. Renamed + expanded from the legacy
 * ['survey', 'implementation']; persisted records are remapped in
 * fieldActionStore's v1->v2 migrate (survey -> field_survey,
 * implementation -> implementation_task).
 */
export const FieldActionTaskType = z.enum([
  'field_survey',
  'monitoring_task',
  'implementation_task',
  'administrative_task',
]);
export type FieldActionTaskType = z.infer<typeof FieldActionTaskType>;

/**
 * Cycle this action belongs to (ADR 2). Stamped at creation from the active
 * cycle, immutable thereafter. The reserved 'baseline' sentinel marks
 * pre-cycle-0 baseline surveys and sorts before all numbered cycles;
 * numbered cycles are the per-(project, domain) counter owned by
 * observeCycleStore. Diverges from Observe's pure-numeric cycleId
 * (dataPoint.schema.ts) by the baseline sentinel — justified by ADR 2's
 * baseline-survey requirement; use `compareCycleId` for any ordering.
 */
export const FieldActionCycleId = z.union([
  z.literal('baseline'),
  z.number().int().nonnegative(),
]);
export type FieldActionCycleId = z.infer<typeof FieldActionCycleId>;

/**
 * Total order on cycle ids: 'baseline' sorts before every numbered cycle
 * (baseline < 0 < 1 < 2 ...). Returns a standard Array.sort comparator value
 * (<0, 0, >0). Used by the 5-tier sync priority queue (ADR 7 Phase 2) to
 * order baseline surveys (tier 2) ahead of non-baseline surveys (tier 3).
 */
export function compareCycleId(
  a: FieldActionCycleId,
  b: FieldActionCycleId,
): number {
  if (a === b) return 0;
  if (a === 'baseline') return -1;
  if (b === 'baseline') return 1;
  return a - b;
}

/**
 * ADR 9 source-objective-type anchor (forward-declared). Which objective
 * class this action sources from — a universal domain, a primary objective,
 * or a secondary objective. Nullable and UNPOPULATED in Phase 0: ADR 9 owns
 * the population logic, the secondary-class / tension catalogue, and any
 * token refinement. Added now so the per-record sync transport (ADR 7
 * Phase 1) and the 5-tier queue (Phase 2) carry the discriminator from day
 * one rather than forcing a second migration later.
 */
export const FieldActionSourceObjectiveType = z.enum([
  'universal',
  'primary',
  'secondary',
]);
export type FieldActionSourceObjectiveType = z.infer<
  typeof FieldActionSourceObjectiveType
>;

/** Self = immediate verify on submit. Review = needs verifier action. */
export const FieldActionVerificationMode = z.enum(['self', 'review']);
export type FieldActionVerificationMode = z.infer<
  typeof FieldActionVerificationMode
>;

/**
 * GeoJSON-ish location geometry for tasks anchored on the map (e.g.
 * "Install bench terrace on contour A"). Kept loose so a Point, LineString,
 * or Polygon all round-trip; geometry shape is validated where it lands
 * (turf calls, mapbox sources) rather than here.
 */
const LocationGeometrySchema = z
  .object({
    type: z.enum(['Point', 'LineString', 'Polygon']),
    coordinates: z.unknown(),
  })
  .passthrough();

export const FieldActionSchema = z
  .object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    /** PlanStratumObjective.id the field action belongs to. */
    planObjectiveId: z.string().min(1),
    /** PlanStratum.id (denormalized for View B grouping without a join). */
    stratumId: z.string().min(1),

    title: z.string().min(1),
    description: z.string().optional(),
    taskType: FieldActionTaskType,
    /**
     * Cycle this action belongs to (ADR 2). Defaults to 0 (current cycle of
     * an un-advanced project); immutable once set. fieldActionStore's
     * onRehydrateStorage backfills pre-existing records to the project's
     * current cycle on the v1->v2 migration.
     */
    cycleId: FieldActionCycleId.default(0),
    /**
     * ADR 9 source-objective-type anchor. Null until ADR 9 populates it (see
     * FieldActionSourceObjectiveType). Present on the schema now so it rides
     * the Phase 1 typed-record wire from the start.
     */
    sourceObjectiveType: FieldActionSourceObjectiveType.nullable().default(
      null,
    ),
    status: FieldActionStatus,

    /** Resolves to a ProofSchema in constants/fieldAction/proofSchemas.ts. */
    proofSchemaId: z.string().min(1),
    proofItems: z.array(FieldActionProofItemSchema).default([]),

    verificationMode: FieldActionVerificationMode,
    /** Verifier user id once a review-mode task transitions to verified. */
    verifierUserId: z.string().optional(),
    /** Set by the verifier when returning a submission for revision. */
    verificationNote: z.string().optional(),

    assignedTo: z.array(z.string()).default([]),

    /** Set only when status is 'diverged'. Always null otherwise. */
    divergenceFlag: DivergenceFlagSchema.nullable().default(null),

    /**
     * Observe domain feed ids this action's evidence routes to once
     * verified or diverged. Spec §8.2 routes verified evidence into the
     * domain implied by `proofSchemaId` (e.g. earthworks → water-flow
     * domain feed); divergence routes into the parent objective's domain.
     * Default to empty until the Slice 3.5 routing helper fills it.
     */
    observeFeedIds: z.array(z.string()).default([]),

    locationGeometry: LocationGeometrySchema.nullable().default(null),
    /** Overlay ids the Act map should activate when this task is opened. */
    mapOverlayIds: z.array(z.string()).default([]),

    /** Free-text reason when status is 'blocked'. Cleared on unblock. */
    blockedReason: z.string().nullable().default(null),

    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    /**
     * When the underlying field observation/work actually happened — the
     * `observed_at` the Offline Sync Spec §6 conflict model keys on (ADR 7
     * Phase 3). Distinct from updatedAt (record mutation time). Optional on
     * the schema because pre-v2 persisted records predate it; fieldActionStore
     * guarantees population at creation and backfills it (= updatedAt) in the
     * v1->v2 migrate, so every live record carries it. Consumers fall back to
     * updatedAt when absent. Observe's capturedAt is the precedent.
     */
    observedAt: z.string().datetime().optional(),
    /** Set when status transitions into a terminal state ('verified' or 'diverged'). */
    doneAt: z.string().datetime().nullable().default(null),
  })
  .passthrough();
export type FieldAction = z.infer<typeof FieldActionSchema>;
