// protocol.schema.ts
//
// Minimal typed foundation for the OLOS Protocol Layer (Protocol Layer
// Specification v1.0). The full spec defines an event-driven evaluation
// engine, compound AND/OR/THEN-AFTER logic, custom Observe-grounded
// authoring, and a five-object data model (9). This file encodes only the
// subset the FIRST vertical slice needs: the two lifecycle enums (3, 8) and
// a read-only StandardProtocolTemplate shape for the standard catalogue (4.2)
// surfaced enterprise-filtered (4.3) in Protocol Mode.
//
// Deferred to later phases (intentionally absent here): Protocol /
// ProtocolCondition / ProtocolClause / ProtocolResponse / ProtocolTriggerRecord
// (9.1-9.5), the evaluation engine (7), and custom authoring (5).

import { z } from 'zod';
import { PlanStratumId } from '../plan/planStratumObjective.schema.js';
import { ProjectTypeId } from '../plan/projectTypeTaxonomy.schema.js';

/**
 * The four protocol types (Protocol Layer Spec 3). Each has a distinct
 * evaluation model in later phases; here it drives only the type badge in
 * Protocol Mode.
 * - threshold: fires when a measured Observe stream crosses a numeric limit.
 * - judgment:  surfaced on freshness/pattern signal; steward assesses.
 * - cyclical:  bound to rotation / season / calendar rhythm.
 * - freeform:  plain-language logic, surfaced for review on a cadence.
 */
export const ProtocolType = z.enum([
  'threshold',
  'judgment',
  'cyclical',
  'freeform',
]);
export type ProtocolType = z.infer<typeof ProtocolType>;

/**
 * Protocol lifecycle status (Protocol Layer Spec 8). Exported for the later
 * authoring/evaluation phases; the read-only template library renders standard
 * templates as not-yet-activated proposals (see ProtocolModePanel).
 */
export const ProtocolStatus = z.enum([
  'draft',
  'active',
  'triggered',
  'suspended',
  'retired',
]);
export type ProtocolStatus = z.infer<typeof ProtocolStatus>;

/**
 * The four OLOS severity tiers (Protocol System Object Model & Architecture
 * Spec v1.1). ORTHOGONAL to ProtocolType: `type` describes HOW a protocol
 * evaluates; `severityTier` describes the RESPONSE POSTURE when it fires.
 * - stop:      halt project-wide; Plan approval to resume.
 * - respond:   generate an assignable field action; affected area paused
 *              (the canonical "produces work" tier).
 * - watch:     log only; no action required (30s auto-confirm in the field).
 * - abundance: a positive condition was reached; begin an observation cycle
 *              before acting (the permaculture observe-before-act tier).
 */
export const SeverityTier = z.enum(['stop', 'respond', 'watch', 'abundance']);
export type SeverityTier = z.infer<typeof SeverityTier>;

/**
 * The animal/livestock enterprises that gate which standard templates surface
 * (Protocol Layer Spec 4.3). This is the slice's minimal enterprise vocabulary
 * — not the full ProjectType taxonomy. A template surfaces when any id in its
 * `enterpriseScope` is present in the project's active enterprise set; this is
 * what hides the Silvopasture Pest Diversion template on a property without
 * poultry.
 */
export const EnterpriseId = z.enum([
  'sheep_beef',
  'poultry',
]);
export type EnterpriseId = z.infer<typeof EnterpriseId>;

/**
 * The provenance layer a protocol template comes from, mirroring the objective
 * layer's `PlanObjectiveSource` (universal/primary/secondary). This is the
 * scoping axis the per-type catalogue + `resolveProjectProtocols` use to compose
 * a project's standing-protocol set:
 * - universal: applies to EVERY project regardless of type.
 * - primary:   contributed by the project's primary type catalogue.
 * - secondary: contributed by a layered secondary type (additive or patch).
 *
 * ORTHOGONAL to `enterpriseScope`: enterprise scope gates the legacy
 * animal/livestock catalogue (4.3); `source` drives the per-type composition.
 * A template uses one axis or the other - the livestock catalogue carries
 * `enterpriseScope`, the per-type catalogues carry `source` + `stratumId`.
 */
export const ProtocolSource = z.enum(['universal', 'primary', 'secondary']);
export type ProtocolSource = z.infer<typeof ProtocolSource>;

/**
 * A read-only standard protocol template from the §4.2 catalogue. These are
 * pre-authored proposals, not active protocols: at Tier 5 completion OLOS
 * pre-fills them from approved tier outputs and the steward confirms (4.1,
 * deferred). The bracketed [auto-filled] placeholders in `condition` are kept
 * verbatim from the spec table.
 *
 * Provenance: `name`, `type`, `condition`, and `response` are transcribed
 * VERBATIM from spec table 4.2; `enterpriseScope` encodes the 4.3 filtering
 * table; `rationale` and `feeds` are AUTHORED for this slice (the spec table
 * gives neither column) under the operator's pixel-fidelity scope.
 */
export const StandardProtocolTemplateSchema = z.object({
  /** Stable kebab id, unique within the catalogue. */
  id: z.string().min(1),
  /** Display name, verbatim from spec table 4.2. */
  name: z.string().min(1),
  type: ProtocolType,
  /**
   * Enterprises this template applies to (4.3). A template surfaces when the
   * project's active enterprise set intersects this list. OPTIONAL: only the
   * legacy animal/livestock catalogue carries it; the per-type catalogues scope
   * via `source` + `sourceTypeId` instead and omit it.
   */
  enterpriseScope: z.array(EnterpriseId).min(1).optional(),
  /**
   * The stratum that authors this protocol (one of the 7 universal strata).
   * This is what makes "a protocol for each stratum" addressable - the resolver
   * sorts by stratum ordinal so a project's protocols read top-to-bottom S1..S7.
   * OPTIONAL for back-compat: the legacy catalogue predates typed strata and
   * carries the free-text `tierAuthored` label instead; per-type catalogue
   * entries set this.
   */
  stratumId: PlanStratumId.optional(),
  /**
   * Provenance layer (universal/primary/secondary). Drives the per-type
   * composition + sort. OPTIONAL for back-compat; the resolver treats an absent
   * value as the universal layer (rank 0), mirroring resolveProjectObjectives.
   */
  source: ProtocolSource.optional(),
  /** Which project type contributed this template, when source is primary/secondary. */
  sourceTypeId: ProjectTypeId.optional(),
  /** The IF condition, verbatim from 4.2 (keeps [auto-filled] placeholders). */
  condition: z.string().min(1),
  /** The THEN response, verbatim from 4.2. */
  response: z.string().min(1),
  /** Authored one-line statement of why this protocol exists. */
  rationale: z.string().min(1),
  /**
   * Observe-domain feed labels this protocol reads from / writes to. Authored
   * to the prototype's domain vocabulary (e.g. "Pasture & Forage"); display-only
   * chips this slice (not wired to the evaluation engine).
   */
  feeds: z.array(z.string().min(1)).default([]),
  /**
   * The tier/stratum objective whose approval authored this protocol (spec §9.1
   * `tier_authored`). Records provenance for the §10.1 auto-instantiation: the
   * standard templates are generated when the Stratum-6 ("Integration", formerly
   * "Tier 5") objective is approved. Optional — custom-authored protocols added
   * later need not carry it.
   */
  tierAuthored: z.string().min(1).optional(),
  /**
   * Response posture when this protocol fires (Object Model Spec v1.1).
   * Optional for backward compatibility: the existing catalogue templates were
   * authored before tiers existed and omit it; `resolveSeverityTier` treats an
   * absent value as RESPOND. Authoring surfaces set it explicitly going forward.
   */
  severityTier: SeverityTier.optional(),
  /**
   * Amanah caution surfaced verbatim alongside the protocol when its response
   * touches a sales channel or advance commitment (e.g. CSA advance-purchase ->
   * *bayʿ mā laysa ʿindak*). Display-only; never stripped or reworded. Absent on
   * protocols with no ethical caveat.
   */
  scopeNotes: z.string().min(1).optional(),
});
export type StandardProtocolTemplate = z.infer<
  typeof StandardProtocolTemplateSchema
>;

/**
 * A secondary-type modification of an existing protocol template, mirroring the
 * objective layer's `PatchRecord`. When a secondary type is layered onto a
 * primary, it may not only ADD protocols (additive) but also AMEND an existing
 * universal/primary protocol - tightening its condition or extending its
 * response for the combined system. The resolver concatenates amendments onto
 * the target (never replaces) and skips a patch whose target is absent.
 */
export const ProtocolPatchRecordSchema = z.object({
  /** Id of the protocol template this patch amends. */
  targetTemplateId: z.string().min(1),
  /** The secondary type responsible for this patch (provenance + attribution). */
  secondaryTypeId: ProjectTypeId,
  /** Text appended onto the target's condition (e.g. an extra clause). */
  conditionAmendment: z.string().min(1).optional(),
  /** Text appended onto the target's response. */
  responseAmendment: z.string().min(1).optional(),
  /** Amanah caution appended onto the target's scopeNotes, verbatim. */
  scopeNote: z.string().min(1).optional(),
  /** Spec/source reference for provenance tracking. */
  ref: z.string().min(1).optional(),
});
export type ProtocolPatchRecord = z.infer<typeof ProtocolPatchRecordSchema>;

/**
 * Safe accessor for a template's severity tier: any template without an
 * explicit tier is treated as RESPOND (the canonical "produces work" posture).
 * Keeps the default out of the stored data so provenance stays honest.
 */
export function resolveSeverityTier(t: {
  severityTier?: SeverityTier;
}): SeverityTier {
  return t.severityTier ?? 'respond';
}

/**
 * How the steward resolved a Trigger Recognition prompt (Trigger Recognition
 * UX Spec v1.1, 4). Each prompt writes exactly one ProtocolActivation carrying
 * one of these states:
 * - confirmed:      the condition is real; the response recipe proceeds.
 * - false_positive: dismissed; the trigger did not actually hold.
 * - pending_review: flagged for later judgement (the PENDING pseudo-tier).
 */
export const ConfirmationStatus = z.enum([
  'confirmed',
  'false_positive',
  'pending_review',
]);
export type ConfirmationStatus = z.infer<typeof ConfirmationStatus>;

/**
 * The four seasons, reserved for the biodynamic / seasonal-calendar phase
 * (Object Model Spec v1.1, 9.4). Activations may record the season they fired
 * in so cyclical protocols can be analysed per-cycle. Unpopulated this slice.
 */
export const SeasonName = z.enum(['spring', 'summer', 'autumn', 'winter']);
export type SeasonName = z.infer<typeof SeasonName>;

/**
 * The field surface a protocol trigger was recognised on (Trigger Recognition
 * UX Spec v1.1, 2 - the three contexts). Defaults to the most common surface,
 * Act proof capture; the slice only wires that one, the other two are valid
 * values for later phases.
 */
export const TriggerContext = z.enum([
  'act_proof_capture',
  'act_map',
  'observe_domain_detail',
]);
export type TriggerContext = z.infer<typeof TriggerContext>;

/**
 * A frozen copy of the protocol recipe at the instant of activation (Object
 * Model Spec v1.1, 9.3). Snapshotting name/condition/response means later edits
 * to the source template never rewrite an activation's history - the record is
 * the immutable fact of what fired and what the recipe said at that moment.
 */
export const RecipeSnapshotSchema = z.object({
  name: z.string().min(1),
  condition: z.string().min(1),
  response: z.string().min(1),
});
export type RecipeSnapshot = z.infer<typeof RecipeSnapshotSchema>;

/**
 * The immutable record written when a protocol's trigger is recognised in the
 * field (Object Model & Architecture Spec v1.1, 9; Trigger Recognition UX Spec
 * v1.1, 4). Append-only: never mutated after creation. `recipeSnapshot` freezes
 * the recipe so history is stable; `season`/`cycleNumber`/
 * `weatherConditionAtActivation` are reserved for the biodynamic phase and stay
 * unpopulated this slice.
 */
export const ProtocolActivationSchema = z.object({
  /** Stable unique id (caller- or store-generated via crypto.randomUUID()). */
  id: z.string().min(1),
  /** The project this activation belongs to. */
  projectId: z.string().min(1),
  /** The standard/custom template whose trigger was recognised. */
  templateId: z.string().min(1),
  /** Severity posture at activation time. */
  severityTier: SeverityTier,
  /** How the steward resolved the recognition prompt. */
  confirmationStatus: ConfirmationStatus,
  /** Frozen recipe copy (immutability guarantee). */
  recipeSnapshot: RecipeSnapshotSchema,
  /** ISO-8601 timestamp of activation. */
  activatedAt: z.string().min(1),
  /** Reserved (biodynamic phase): season the trigger fired in. */
  season: SeasonName.optional(),
  /** Reserved (biodynamic phase): rotation/observation cycle index. */
  cycleNumber: z.number().int().nonnegative().optional(),
  /** Reserved (biodynamic phase): free-text weather note at activation. */
  weatherConditionAtActivation: z.string().min(1).optional(),
  /** Field surface the trigger was recognised on; defaults to proof capture. */
  triggerContext: TriggerContext.default('act_proof_capture'),
});
export type ProtocolActivation = z.infer<typeof ProtocolActivationSchema>;
