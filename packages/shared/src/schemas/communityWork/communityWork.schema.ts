/**
 * communityWork.schema.ts — the community work-plan PROPOSAL layer.
 *
 * Intentional Community / ecovillage governance and operational obligations
 * are compiled by `generateCommunityWorkPlan` into RULES (recurring cadence
 * obligations) and expanded into dated INSTANCES over a rolling horizon.
 * Instances are held as proposals in `communityWorkPlanStore` (proposed /
 * confirmed / dismissed) and reach the WorkItem spine ONLY via the operator's
 * `confirmProposal` — the generation layer is structurally advisory
 * (sovereign-steward covenant), never a silent spine writer.
 *
 * Structural relationship to the livestock layer:
 *   - This schema mirrors `livestockWork.schema.ts` in structure and zod style.
 *   - Livestock-only concepts (species, paddockId, seasonalWindow, captureMode,
 *     hemisphere) are DELIBERATELY absent — community governance is not
 *     season-or-paddock scoped.
 *   - `CommunityWorkInstanceSchema` is structurally compatible with
 *     `WorkPlanInstanceBase` in `createWorkPlanStore.ts` (shared factory).
 *
 * Covenant constraints carried at the schema level:
 *   - `scopeNotes` is the VERBATIM Amanah caution channel — flows unreworded
 *     from protocol through rule → instance → confirmed WorkItem notes.
 *   - `anchorMonth` encodes a calendar preference without binding the generator
 *     to a specific day (generator picks the 1st of the month).
 *   - `explicitDueDate` supports one-off milestones (legal review, settlement
 *     milestone) that have a concrete date rather than a recurrence cadence.
 */

import { z } from 'zod';
import { WorkItemRecurrence } from '../workItem.schema.js';

/**
 * The governance / operational work kinds this layer may generate.
 * Covers the governance meeting cadence, commons care, adaptive review
 * cycles, five-year strategic reviews, member ratification events,
 * onboarding steps, legal reviews, settlement milestones, and a catch-all
 * custom kind for cyclical protocols without a more specific classification.
 */
export const CommunityWorkKindSchema = z.enum([
  'governance-meeting',
  'commons-review',
  'adaptive-review',
  'five-year-review',
  'member-ratification',
  'onboarding-step',
  'legal-review',
  'settlement-milestone',
  'custom',
]);
export type CommunityWorkKind = z.infer<typeof CommunityWorkKindSchema>;

/** Which Plan-decision surface a community rule was compiled from. */
export const CommunityWorkSourceKindSchema = z.enum([
  'protocol',
  'governance',
  'adaptive',
  'membership',
  'legal',
  'settlement',
  'onboarding',
]);
export type CommunityWorkSourceKind = z.infer<typeof CommunityWorkSourceKindSchema>;

/**
 * Recurrence superset for the PROPOSAL layer only.
 *
 * IMPORTANT: This union extends the shared `WorkItemRecurrence` enum with
 * community-governance-specific cadences that have no analogue in the
 * livestock or general WorkItem layers. The values added here are:
 *   - 'once'          — a one-off event (legal review, settlement milestone)
 *   - 'fortnightly'   — every two weeks (some governance cadences)
 *   - 'biannual'      — twice per year (six-month rhythm)
 *   - 'every-5-years' — strategic review cycle
 *
 * This recurrence superset is PROPOSAL-LAYER ONLY — it is NEVER written to
 * the work-item spine (instances carry concrete `dueDate` / `windowEnd` dates,
 * not recurrences). The shared `WorkItemRecurrence` enum is DELIBERATELY
 * untouched so that the spine and its consumers remain unaware of these
 * community-layer extensions.
 *
 * The community extras ('once', 'fortnightly', 'biannual', 'every-5-years')
 * are handled by `generateCommunityWorkPlan` — NOT by `anchorDatesInRange`,
 * which only understands the standard `WorkItemRecurrence` values.
 */
export const CommunityWorkRecurrenceSchema = z.enum([
  // --- Standard WorkItemRecurrence values (mirrored verbatim) ---
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'annual',
  'biennial',
  'every-3-years',
  // --- Community-layer extensions (proposal layer only) ---
  'once',
  'fortnightly',
  'biannual',
  'every-5-years',
]);
export type CommunityWorkRecurrence = z.infer<typeof CommunityWorkRecurrenceSchema>;

/**
 * A recurring governance / operational obligation compiled from one Plan
 * decision. Stable `key` format:
 *   `cwp__<sourceKind>__<sourceId>[__<suffix>]`
 * — string-stable across regenerations so the diff layer can match prior
 * proposals; `inputsHash` (FNV-1a over content-bearing fields) detects when
 * the SAME rule changed meaningfully.
 *
 * Deliberately omits: species, paddockId, seasonalWindow, captureMode
 * (livestock-only concepts).
 */
export const CommunityWorkRuleSchema = z.object({
  /** `cwp__<sourceKind>__<sourceId>[__<suffix>]` */
  key: z.string().min(1),
  kind: CommunityWorkKindSchema,
  /** Operator-facing title for generated instances. */
  title: z.string().min(1),
  /** Supporting prose (protocol response / capture guidance). */
  detail: z.string().optional(),
  /**
   * VERBATIM Amanah caution carried from the source protocol's `scopeNotes`.
   * Never reworded, stripped, or summarised at any layer.
   */
  scopeNotes: z.string().optional(),
  sourceKind: CommunityWorkSourceKindSchema,
  /** Protocol id / governance mode / settlement stage that authored this rule. */
  sourceId: z.string().min(1),
  /** Set when sourceKind === 'protocol' (provenance onto the spine row). */
  sourceProtocolId: z.string().optional(),
  /** Plan objective anchor (e.g. 'ev-s1-conflict-framework'). */
  sourceObjectiveId: z.string().optional(),
  /** Carer / facilitator name suggested from the community roster. */
  suggestedCarer: z.string().optional(),
  recurrence: CommunityWorkRecurrenceSchema,
  /**
   * Calendar month preference (1–12) for rules whose recurrence is not fully
   * determined by the standard anchor logic (e.g. 'biannual' with a preferred
   * start month). The generator picks the 1st of this month as the first
   * occurrence anchor.
   */
  anchorMonth: z.number().int().min(1).max(12).optional(),
  /**
   * ISO date string (YYYY-MM-DD) for one-off obligations (recurrence: 'once').
   * When set, the generator emits exactly one instance due on this date,
   * regardless of the rolling horizon bounds (subject to the horizon
   * overlapping the date).
   */
  explicitDueDate: z.string().optional(),
  /** FNV-1a hash of the content-bearing fields (change detection). */
  inputsHash: z.string().min(1),
});
export type CommunityWorkRule = z.infer<typeof CommunityWorkRuleSchema>;

/**
 * One dated occurrence of a community rule. `key` = `<ruleKey>__<dueDate>`
 * — stable across regenerations for the same date, which is what lets the
 * diff layer honour dismissed-stays-dismissed and confirmed-never-mutated.
 * Display fields are denormalised from the rule so a proposal is
 * self-contained for the review UI.
 *
 * Structurally compatible with `WorkPlanInstanceBase` in
 * `createWorkPlanStore.ts` — every required field of that interface is
 * present here with a compatible type.
 *
 * Deliberately omits: species, paddockId (livestock-only concepts).
 */
export const CommunityWorkInstanceSchema = z.object({
  /** `<ruleKey>__<dueDate>` */
  key: z.string().min(1),
  ruleKey: z.string().min(1),
  kind: CommunityWorkKindSchema,
  /** YYYY-MM-DD due date. */
  dueDate: z.string().min(1),
  /** YYYY-MM-DD end of a multi-day window, when one applies. */
  windowEnd: z.string().optional(),
  title: z.string().min(1),
  detail: z.string().optional(),
  /** VERBATIM Amanah caution (see rule). */
  scopeNotes: z.string().optional(),
  sourceProtocolId: z.string().optional(),
  sourceObjectiveId: z.string().optional(),
  suggestedCarer: z.string().optional(),
  /** Copied from the generating rule (change detection in diffWorkPlan). */
  inputsHash: z.string().min(1),
});
export type CommunityWorkInstance = z.infer<typeof CommunityWorkInstanceSchema>;

/** Operator review lifecycle of a generated community instance. */
export const CommunityWorkProposalStatusSchema = z.enum([
  'proposed',
  'confirmed',
  'dismissed',
]);
export type CommunityWorkProposalStatus = z.infer<typeof CommunityWorkProposalStatusSchema>;
