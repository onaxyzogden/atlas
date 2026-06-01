// planStratumObjective.schema.ts
//
// Schemas for the 7-stratum Plan stage spec (OLOS Plan Navigation Spec v1).
// A PlanStratum is one of seven ordered groupings (S1 Project Foundation -
// S7 Phasing & Resourcing). Each Plan Stratum Objective is a thin shell that
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

export const PlanStratumId = z.enum([
  's1-project-foundation',
  's2-land-reading',
  's3-systems-reading',
  's4-foundation-decisions',
  's5-system-design',
  's6-integration-design',
  's7-phasing-resourcing',
]);
export type PlanStratumId = z.infer<typeof PlanStratumId>;

export const PlanStratumObjectiveStatus = z.enum([
  'locked',
  'available',
  'active',
  'complete',
  // `deferred` is an explicit steward override (NOT derived from checklist
  // progress): the objective is shelved as the "mark as Deferred instead"
  // alternative to a blocked secondary removal (spec section 8.3). Progress is
  // preserved; the objective is hidden from active work and a deferred
  // objective is treated as NOT complete for its dependents (they stay locked).
  'deferred',
]);
export type PlanStratumObjectiveStatus = z.infer<typeof PlanStratumObjectiveStatus>;

export const PlanStratumState = z.enum([
  'locked',
  'available',
  'active',
  'complete',
]);
export type PlanStratumState = z.infer<typeof PlanStratumState>;

export const PlanStratumObjectiveOutputKind = z.enum([
  'plan-decision-record',
  'observation-record',
  'reference-doc',
]);
export type PlanStratumObjectiveOutputKind = z.infer<
  typeof PlanStratumObjectiveOutputKind
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
   * Downstream stratum-objective ids that this checklist item is intended to
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

/**
 * A Decision Group is a Plan-layer editorial grouping of an objective's
 * Act-layer checklist items into a named decision scope (Decision Groups
 * Reference v1.0; OLOS spec section 9.3-9.4). Plan surfaces the GROUPS (the
 * decisions a steward must make); the itemised checklist is the Act-layer
 * detail. Authoring rules: every objective has 1-6 groups; group membership is
 * mutually exclusive (no item in two groups); the union of all groups' itemIds
 * covers the objective's full checklist (full partition).
 *
 * Provenance (see catalogue authoring): group `label`/count/`observeFeeds` are
 * transcribed VERBATIM from the reference doc, but `itemIds` membership is
 * AUTHORED (the doc gives only per-group item counts, not explicit ids, and its
 * counts predate the 19-universal checklists) under the 2026-05-31 operator
 * override — partitioned in checklist order by the doc's labels + counts, with
 * drift-extra items assigned to the semantically-closest group.
 */
export const DecisionGroupSchema = z.object({
  /** Stable id, globally unique in a resolved set. Rubric: `<objId>-dg<n>`. */
  id: z.string().min(1),
  /** Human label, verbatim from the reference doc. */
  label: z.string().min(1),
  /**
   * Checklist item ids belonging to this group. Authored (see schema note); at
   * least one per group; mutually exclusive across the objective's groups.
   */
  itemIds: z.array(z.string().min(1)).min(1),
  /**
   * Observe-stage feed labels this group's outputs flow into, transcribed
   * VERBATIM from the reference doc (display-only feed chips in Plan; NOT wired
   * to divergence/revision routing). The doc's `Multiple` sentinel is kept
   * literally; the doc's `-` (none) is encoded as an empty array.
   */
  observeFeeds: z.array(z.string()).default([]),
  /**
   * When this group was injected into an existing objective by a secondary
   * layer's patch, the responsible secondary ProjectTypeId — drives the amber
   * "Added by: <Type>" attribution. Stamped by the resolver from the parent
   * PatchRecord; null on authored (non-injected) groups.
   */
  sourceSecondaryId: ProjectTypeId.nullable().default(null),
});
export type DecisionGroup = z.infer<typeof DecisionGroupSchema>;

/**
 * A single operating-threshold parameter the steward enters on a Plan objective
 * (§10.1 Integration). Each maps a human-readable field to a protocol `token`
 * (transcribed VERBATIM from the standard-template catalogue) so the entered
 * value can be substituted into a protocol condition at activation. `label`,
 * `unit`, and `placeholder` are descriptive UI only — NEVER fabricated approved
 * values (the placeholder is illustrative, not a default).
 */
export const ParameterItemSchema = z.object({
  id: z.string().min(1),
  /** Protocol token this parameter fills (matches a standard-template token). */
  token: z.string().min(1),
  label: z.string().min(1),
  /** Optional unit suffix shown beside the input (e.g. "kg DM/ha", "days"). */
  unit: z.string().optional(),
  /** Optional input placeholder. Illustrative only — not a default value. */
  placeholder: z.string().optional(),
});
export type ParameterItem = z.infer<typeof ParameterItemSchema>;

/**
 * A named group of operating-threshold parameters on a Plan objective. Rendered
 * as an editable group ("Plan decides") in the ObjectiveDetailPanel; its values
 * are the single source of truth for protocol token substitution.
 */
export const ParameterGroupSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  items: z.array(ParameterItemSchema).min(1),
});
export type ParameterGroup = z.infer<typeof ParameterGroupSchema>;

export const PlanStratumSchema = z.object({
  id: PlanStratumId,
  ordinal: z.number().int().min(1).max(7),
  title: z.string().min(1),
  summary: z.string().min(1),
});
export type PlanStratum = z.infer<typeof PlanStratumSchema>;

export const PlanStratumObjectiveSchema = z.object({
  id: z.string().min(1),
  stratumId: PlanStratumId,
  title: z.string().min(1),
  focusedQuestion: z.string().min(1),
  /**
   * Other stratum-objective ids that must be `complete` before this objective
   * advances out of `locked`. Cross-stratum and intra-stratum prereqs both
   * supported.
   */
  prerequisiteObjectiveIds: z.array(z.string()).default([]),
  defaultOverlayBundle: z.array(OverlayId).default([]),
  checklist: z.array(PlanDecisionChecklistItemSchema).default([]),
  outputKind: PlanStratumObjectiveOutputKind.default('plan-decision-record'),
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
   * Catalogue reference code per Authoring Standards v1.4 (e.g. "U-S1.1",
   * "HS-S4.2"). Stable id used in provenance and cross-references.
   */
  ref: z.string().optional(),
  /**
   * Plain-text completion gate for this objective (what must be true before it
   * counts as done). Secondary patches CONCATENATE onto this, never replace.
   */
  completionGate: z.string().optional(),
  /**
   * Part D (Plan Nav v1.1 greyed gate history): the pre-amendment completion
   * gate, captured by the resolver the FIRST time a secondary patch amends
   * `completionGate`. Lets the Plan render show the original gate text greyed
   * ("Previously:") beneath the current concatenated gate. Runtime-only
   * (resolved objectives are never persisted) and absent when the gate was
   * never amended, so seed/catalogue objects validate unchanged.
   */
  completionGateBase: z.string().optional(),
  /**
   * Part D: ordered trail of completion-gate amendments, one entry per applied
   * secondary patch (in patch-application order), each attributing its
   * amendment text to the responsible secondary. Drives the per-amendment
   * "Amended by <Type>" history beneath the gate. Runtime-only; absent when the
   * gate was never amended.
   */
  completionGateAmendments: z
    .array(
      z.object({
        secondaryTypeId: ProjectTypeId,
        text: z.string(),
      }),
    )
    .optional(),
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
  /**
   * Plan-layer editorial groupings of this objective's checklist into named
   * decision scopes (Decision Groups Reference v1.0). Defaulted empty so the
   * static skeleton + not-yet-encoded catalogues validate unchanged; populated
   * for encoded objectives and surfaced by the Plan DecisionChecklist render.
   * Patch-injected groups (from secondaries) are appended by the resolver and
   * carry a non-null `sourceSecondaryId`.
   */
  decisionGroups: z.array(DecisionGroupSchema).default([]),
  /**
   * Optional steward-editable operating-threshold parameters (§10.1
   * Integration). When present (today only the S6 Integration objective), the
   * Plan ObjectiveDetailPanel renders an editable parameter group; the entered
   * values derive the protocol token substitutions at activation. Optional, so
   * every existing seed/catalogue objective validates unchanged.
   */
  parameterGroup: ParameterGroupSchema.optional(),
});
export type PlanStratumObjective = z.infer<typeof PlanStratumObjectiveSchema>;

/**
 * A checklist item injected into an existing objective by a secondary layer's
 * modifying patch. Shape mirrors PlanDecisionChecklistItemSchema; the resolver
 * stamps `expandedBySecondaryId` from the parent PatchRecord when applying, so
 * authors need not repeat it per item. Item ids MUST be globally unique across
 * the whole resolved set (rubric: `<targetObjId>-p<secId>-<n>`) or the
 * planStratumStore progress flatten collapses two items — enforced by a catalogue
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
  /** Catalogue reference per Authoring Standards v1.4 (e.g. "RES>U-S1.1"). */
  ref: z.string().optional(),
  /**
   * Checklist items injected into the target objective. Ids must be globally
   * unique (see PatchItemSchema).
   */
  injectedItems: z.array(PatchItemSchema).default([]),
  /**
   * Decision groups injected into the target objective. Parallel to
   * `injectedItems`: the resolver stamps each with `sourceSecondaryId =
   * secondaryTypeId` and appends it to the target's `decisionGroups`. Group ids
   * must be globally unique across the resolved set. Authors leave
   * `sourceSecondaryId` unset here; the resolver fills it.
   */
  injectedGroups: z.array(DecisionGroupSchema).default([]),
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
 * Snapshot of checklist completion for a single stratum objective, keyed by
 * checklist item id. `true` means the steward has checked the item.
 */
export type PlanChecklistProgress = Readonly<Record<string, boolean>>;
