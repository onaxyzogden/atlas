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

export const PlanDecisionChecklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /**
   * Downstream tier-objective ids that this checklist item is intended to
   * feed into. Surfaced as chips in the YOUR DECISIONS section per spec.
   */
  feedsInto: z.array(z.string()).default([]),
  optional: z.boolean().default(false),
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
});
export type PlanTierObjective = z.infer<typeof PlanTierObjectiveSchema>;

/**
 * Snapshot of checklist completion for a single tier objective, keyed by
 * checklist item id. `true` means the steward has checked the item.
 */
export type PlanChecklistProgress = Readonly<Record<string, boolean>>;
