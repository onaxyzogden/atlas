// planTierObjective.schema.ts
//
// Schemas for the 7-tier Plan stage spec (OLOS Plan Navigation Spec v1).
// A PlanTier is one of seven ordered groupings (T0 Project Foundation -
// T6 Phasing & Resourcing). Each Plan Tier Objective is a thin shell that
// represents one decision unit; it may LINK to an existing legacy module
// card via `legacyCardSectionId` (no-deletion rule — see project memory
// `feedback_no_deletion`). Status flows through a 4-state machine driven
// by checklist completion + prerequisite satisfaction.

import { z } from 'zod';
import { OverlayId } from '../olos/overlay.schema.js';
import {
  ProjectTypeId,
  SecondaryClass,
} from './projectTypeTaxonomy.schema.js';

export const PlanTierId = z.enum([
  't0-project-foundation',
  't1-land-reading',
  't2-systems-reading',
  't3-foundation-decisions',
  't4-system-design',
  't5-integration-design',
  't6-phasing-resourcing',
]);
export type PlanTierId = z.infer<typeof PlanTierId>;

export const PlanTierObjectiveStatus = z.enum([
  'locked',
  'available',
  'active',
  'complete',
]);
export type PlanTierObjectiveStatus = z.infer<typeof PlanTierObjectiveStatus>;

export const PlanTierState = z.enum([
  'locked',
  'available',
  'active',
  'complete',
]);
export type PlanTierState = z.infer<typeof PlanTierState>;

export const PlanTierObjectiveOutputKind = z.enum([
  'plan-decision-record',
  'observation-record',
  'reference-doc',
]);
export type PlanTierObjectiveOutputKind = z.infer<
  typeof PlanTierObjectiveOutputKind
>;

/**
 * Which layer of the per-type objective model produced an objective (OLOS
 * Project-Type + Secondary-Layer Spec v1.2). Absent on the static skeleton
 * seed, which predates the model and is read as `universal` by consumers. Set
 * explicitly by `resolveProjectObjectives` on every objective it emits.
 */
export const PlanObjectiveSource = z.enum([
  'universal',
  'primary',
  'secondary',
]);
export type PlanObjectiveSource = z.infer<typeof PlanObjectiveSource>;

export const PlanDecisionChecklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /**
   * Downstream tier-objective ids that this checklist item is intended to
   * feed into. Surfaced as chips in the YOUR DECISIONS section per spec.
   */
  feedsInto: z.array(z.string()).default([]),
  optional: z.boolean().default(false),
  /**
   * Marks a "how-to" / methodology item (a way of working) rather than a
   * decision the steward records. Authoring Standards v1.4 distinguishes the
   * two so the UI can style methodology items differently. Optional and absent
   * on the static seed; treated as `false` when unset.
   */
  isMethodology: z.boolean().optional(),
  /**
   * When this item was injected into an existing objective by a secondary
   * layer's modifying patch, the secondary ProjectTypeId responsible — drives
   * the "Expanded by: <Type>" label. Stamped by the resolver from the parent
   * PatchRecord; unset on authored (non-injected) items.
   */
  expandedBySecondaryId: ProjectTypeId.optional(),
});
export type PlanDecisionChecklistItem = z.infer<
  typeof PlanDecisionChecklistItemSchema
>;

export const PlanTierSchema = z.object({
  id: PlanTierId,
  ordinal: z.number().int().min(0).max(6),
  title: z.string().min(1),
  summary: z.string().min(1),
});
export type PlanTier = z.infer<typeof PlanTierSchema>;

export const PlanTierObjectiveSchema = z.object({
  id: z.string().min(1),
  tierId: PlanTierId,
  title: z.string().min(1),
  focusedQuestion: z.string().min(1),
  /**
   * Other tier-objective ids that must be `complete` before this objective
   * advances out of `locked`. Cross-tier and intra-tier prereqs both
   * supported.
   */
  prerequisiteObjectiveIds: z.array(z.string()).default([]),
  defaultOverlayBundle: z.array(OverlayId).default([]),
  checklist: z.array(PlanDecisionChecklistItemSchema).default([]),
  outputKind: PlanTierObjectiveOutputKind.default('plan-decision-record'),
  /**
   * Optional pointer into the legacy MODULE_CARDS catalogue
   * (apps/web/src/v3/plan/types.ts). When set the ObjectiveDetailPanel's
   * REFERENCE section embeds the matching legacy card inline.
   */
  legacyCardSectionId: z.string().optional(),
  /**
   * Objectives sharing the same `parallelGroupId` are simultaneously
   * available with no prerequisite ordering between them. Surfaced as the
   * ParallelCallout banner.
   */
  parallelGroupId: z.string().optional(),

  // --- Per-type objective model (Project-Type + Secondary-Layer Spec v1.2) ---
  // All optional and absent on the static skeleton seed (which reads as a
  // universal-only fallback); populated by resolveProjectObjectives.
  /** Which layer emitted this objective. Unset => universal/legacy skeleton. */
  source: PlanObjectiveSource.optional(),
  /**
   * The primary or secondary ProjectTypeId that contributed this objective.
   * Unset for universal objectives.
   */
  sourceTypeId: ProjectTypeId.optional(),
  /**
   * For a secondary-sourced objective, whether it is `additive` (a new
   * objective) or `modifying` (carried for symmetry; modifying contributions
   * normally arrive as PatchRecords, not whole objectives).
   */
  secondaryClass: SecondaryClass.optional(),
  /**
   * Catalogue reference code per Authoring Standards v1.4 (e.g. "U-T0.1",
   * "HS-T3.2"). Stable id used in provenance and cross-references.
   */
  ref: z.string().optional(),
  /**
   * Plain-text completion gate for this objective (what must be true before it
   * counts as done). Secondary patches CONCATENATE onto this, never replace.
   */
  completionGate: z.string().optional(),
  /**
   * Plain-text descriptor of what this objective hands off to the Act stage on
   * completion (creation hook only this slice; the Field Actions Center that
   * consumes it is out of scope). Stored verbatim.
   */
  actHandoff: z.string().optional(),
  /**
   * Free-text note recording how a secondary layer narrowed or widened this
   * objective's scope. Surfaced alongside the "Expanded by" label.
   */
  scopeNotes: z.string().optional(),
});
export type PlanTierObjective = z.infer<typeof PlanTierObjectiveSchema>;

/**
 * A checklist item injected into an existing objective by a secondary layer's
 * modifying patch. Shape mirrors PlanDecisionChecklistItemSchema; the resolver
 * stamps `expandedBySecondaryId` from the parent PatchRecord when applying, so
 * authors need not repeat it per item. Item ids MUST be globally unique across
 * the whole resolved set (rubric: `<targetObjId>-p<secId>-<n>`) or the
 * planTierStore progress flatten collapses two items — enforced by a catalogue
 * test in Sub-slice C.
 */
export const PatchItemSchema = PlanDecisionChecklistItemSchema;
export type PatchItem = z.infer<typeof PatchItemSchema>;

/**
 * A modifying patch from a secondary layer (Project-Type + Secondary-Layer Spec
 * v1.2). It injects checklist items into an already-existing objective
 * (universal or primary) and may amend that objective's completion gate and
 * scope. The resolver applies patches AFTER additive objectives are placed; a
 * patch whose `targetObjectiveId` is absent from the resolved set is SKIPPED
 * and recorded in provenance, never thrown. Gate amendments CONCATENATE onto
 * the target's `completionGate`, never replace it.
 */
export const PatchRecordSchema = z.object({
  /**
   * The secondary ProjectTypeId this patch belongs to. Stamped onto every
   * injected item as `expandedBySecondaryId` and used for the "Expanded by"
   * label.
   */
  secondaryTypeId: ProjectTypeId,
  /** Id of the existing objective this patch injects into. */
  targetObjectiveId: z.string().min(1),
  /** Catalogue reference per Authoring Standards v1.4 (e.g. "RES>U-T0.1"). */
  ref: z.string().optional(),
  /**
   * Checklist items injected into the target objective. Ids must be globally
   * unique (see PatchItemSchema).
   */
  injectedItems: z.array(PatchItemSchema).default([]),
  /**
   * Text concatenated onto the target objective's `completionGate` (never
   * replaces it). Optional.
   */
  completionGateAmendment: z.string().optional(),
  /** Scope note recorded on the target objective when this patch applies. */
  scopeNote: z.string().optional(),
});
export type PatchRecord = z.infer<typeof PatchRecordSchema>;

/**
 * Snapshot of checklist completion for a single tier objective, keyed by
 * checklist item id. `true` means the steward has checked the item.
 */
export type PlanChecklistProgress = Readonly<Record<string, boolean>>;
