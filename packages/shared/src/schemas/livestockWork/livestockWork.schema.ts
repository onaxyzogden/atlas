/**
 * livestockWork.schema.ts — the livestock work-plan PROPOSAL layer.
 *
 * Plan-tier livestock decisions (grazing design, husbandry framework,
 * standing protocols) are compiled by `generateLivestockWorkPlan` into
 * RULES (recurring care obligations) and expanded into dated INSTANCES
 * over a rolling horizon. Instances are held as proposals in
 * `livestockWorkPlanStore` (proposed / confirmed / dismissed) and reach
 * the WorkItem spine ONLY via the operator's `confirmProposal` — the
 * generation layer is structurally advisory (sovereign-steward covenant),
 * never a silent spine writer.
 *
 * Ownership boundary (anti-double-booking): rotation MOVES remain owned
 * by `rotationSequenceSpineSync` (source 'rotation-sequence'). This layer
 * owns the care/cadence/seasonal-husbandry work ONLY — `LivestockWorkKind`
 * deliberately contains no move kind and no schema field carries a move
 * direction.
 *
 * Covenant constraints carried at the schema level:
 *   - `scopeNotes` is the VERBATIM Amanah caution channel (protocol
 *     `scopeNotes` flow through unreworded onto rules → instances →
 *     confirmed WorkItem notes).
 *   - `slaughter-prep` is a valid kind, but the GENERATOR gates its
 *     emission on the husbandry halal `pathwayAcknowledged === true` gate
 *     and categorically excludes pigs (working-role-only ruling).
 */

import { z } from 'zod';
import { WorkItemRecurrence } from '../workItem.schema.js';

/**
 * The care/cadence work kinds this layer may generate. NO move kind —
 * rotation moves are owned by `rotationSequenceSpineSync` (B3) and the
 * scheduled-move pathway; emitting them here would double-book the herd.
 */
export const LivestockWorkKind = z.enum([
  'welfare-check',
  'feed-water-check',
  'health-treatment',
  'vaccination',
  'parasite-monitoring',
  'breeding-event',
  'fence-integrity-check',
  'tree-protection-check',
  'contingency-review',
  'graze-rest-review',
  'records-reconciliation',
  'slaughter-prep',
  'custom',
]);
export type LivestockWorkKind = z.infer<typeof LivestockWorkKind>;

/** Which Plan-decision surface a rule was compiled from. */
export const LivestockWorkSourceKind = z.enum([
  'protocol',
  'husbandry',
  'grazing',
]);
export type LivestockWorkSourceKind = z.infer<typeof LivestockWorkSourceKind>;

/**
 * The four seasons as QUARTER buckets matching the grazing capture's season
 * framing (`GRAZING_SEASONS` badges, e.g. southern "Autumn Apr-Jun").
 * Hemisphere resolution happens at expansion time (`expandRecurrence`):
 *   southern: autumn Apr-Jun · winter Jul-Sep · spring Oct-Dec · summer Jan-Mar
 *   northern: the same buckets shifted six months.
 */
export const LivestockSeasonKey = z.enum([
  'autumn',
  'winter',
  'spring',
  'summer',
]);
export type LivestockSeasonKey = z.infer<typeof LivestockSeasonKey>;

/**
 * A season-anchored due window. Stored hemisphere-NEUTRAL (season key only);
 * `expandRecurrence` resolves it to concrete months using the project's
 * hemisphere so the same rule travels between sites without re-authoring.
 */
export const SeasonalWindowSchema = z.object({
  season: LivestockSeasonKey,
});
export type SeasonalWindow = z.infer<typeof SeasonalWindowSchema>;

/**
 * A recurring care obligation compiled from one Plan decision. Stable
 * `key` format: `lvp__<sourceKind>__<sourceId>[__<species>][__<paddockId>]`
 * — string-stable across regenerations so the diff layer can match prior
 * proposals; `inputsHash` (FNV-1a over the content-bearing fields) detects
 * when the SAME rule changed meaningfully.
 */
export const LivestockWorkRuleSchema = z.object({
  /** `lvp__<sourceKind>__<sourceId>[__<species>][__<paddockId>]` */
  key: z.string().min(1),
  kind: LivestockWorkKind,
  /** Operator-facing title for generated instances. */
  title: z.string().min(1),
  /** Supporting prose (protocol response / capture guidance). */
  detail: z.string().optional(),
  /**
   * VERBATIM Amanah caution carried from the source protocol's
   * `scopeNotes`. Never reworded, stripped, or summarised at any layer.
   */
  scopeNotes: z.string().optional(),
  sourceKind: LivestockWorkSourceKind,
  /** Protocol id / husbandry mode / grazing mode that authored this rule. */
  sourceId: z.string().min(1),
  /** Set when sourceKind === 'protocol' (provenance onto the spine row). */
  sourceProtocolId: z.string().optional(),
  /** Plan objective anchor (e.g. 'silv-sec-s4-grazing-design'). */
  sourceObjectiveId: z.string().optional(),
  /** Capture mode that authored a husbandry/grazing rule (e.g. 'welfare'). */
  captureMode: z.string().optional(),
  /** LivestockSpecies key when the rule is species-scoped. */
  species: z.string().optional(),
  /** Paddock id when the rule is paddock-scoped. */
  paddockId: z.string().optional(),
  /** Carer name suggested from the livestock-intent carer roster. */
  suggestedCarer: z.string().optional(),
  recurrence: WorkItemRecurrence,
  seasonalWindow: SeasonalWindowSchema.optional(),
  /** FNV-1a hash of the content-bearing fields (change detection). */
  inputsHash: z.string().min(1),
});
export type LivestockWorkRule = z.infer<typeof LivestockWorkRuleSchema>;

/**
 * One dated occurrence of a rule. `key` = `<ruleKey>__<dueDate>` — stable
 * across regenerations for the same date, which is what lets the diff
 * layer honour dismissed-stays-dismissed and confirmed-never-mutated.
 * Display fields are denormalised from the rule so a proposal is
 * self-contained for the review UI.
 */
export const LivestockWorkInstanceSchema = z.object({
  /** `<ruleKey>__<dueDate>` */
  key: z.string().min(1),
  ruleKey: z.string().min(1),
  /** YYYY-MM-DD due date (window start for seasonal rules). */
  dueDate: z.string().min(1),
  /** YYYY-MM-DD last day of a seasonal window, when one applies. */
  windowEnd: z.string().optional(),
  kind: LivestockWorkKind,
  title: z.string().min(1),
  detail: z.string().optional(),
  /** VERBATIM Amanah caution (see rule). */
  scopeNotes: z.string().optional(),
  sourceKind: LivestockWorkSourceKind,
  sourceProtocolId: z.string().optional(),
  sourceObjectiveId: z.string().optional(),
  species: z.string().optional(),
  paddockId: z.string().optional(),
  suggestedCarer: z.string().optional(),
  /** Copied from the generating rule (change detection in diffWorkPlan). */
  inputsHash: z.string().min(1),
});
export type LivestockWorkInstance = z.infer<typeof LivestockWorkInstanceSchema>;

/** Operator review lifecycle of a generated instance. */
export const LivestockWorkProposalStatus = z.enum([
  'proposed',
  'confirmed',
  'dismissed',
]);
export type LivestockWorkProposalStatus = z.infer<
  typeof LivestockWorkProposalStatus
>;
