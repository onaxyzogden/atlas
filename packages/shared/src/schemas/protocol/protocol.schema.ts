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
   * project's active enterprise set intersects this list.
   */
  enterpriseScope: z.array(EnterpriseId).min(1),
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
});
export type StandardProtocolTemplate = z.infer<
  typeof StandardProtocolTemplateSchema
>;
