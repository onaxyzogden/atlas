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

/** Routing only (spec §2.3). Never displayed in UI copy. */
export const FieldActionTaskType = z.enum(['survey', 'implementation']);
export type FieldActionTaskType = z.infer<typeof FieldActionTaskType>;

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
    /** PlanTierObjective.id the field action belongs to. */
    planObjectiveId: z.string().min(1),
    /** PlanTier.id (denormalized for View B grouping without a join). */
    tierId: z.string().min(1),

    title: z.string().min(1),
    description: z.string().optional(),
    taskType: FieldActionTaskType,
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
    /** Set when status transitions into a terminal state ('verified' or 'diverged'). */
    doneAt: z.string().datetime().nullable().default(null),
  })
  .passthrough();
export type FieldAction = z.infer<typeof FieldActionSchema>;
