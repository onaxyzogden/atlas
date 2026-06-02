// reviewFlag.schema.ts
//
// ObjectiveReviewFlag: the record raised when a project objective's observed
// activity deviates from its expected rate or is absent altogether. Supports
// the OLOS Cyclical Review layer: Observe computes deviations; this schema is
// the immutable append written to reviewFlagStore; a downstream escalation
// task keys off dismissedAt/dismissedAtCount to detect ignored patterns.
//
// Deliberately minimal -- no evaluation engine, no rendering logic here.

import { z } from 'zod';
import { SeasonName } from './protocol.schema.js';

// ---------------------------------------------------------------------------
// ExpectedRate
// ---------------------------------------------------------------------------

/**
 * The cadence at which a steward expects a given objective to produce
 * observable evidence. "count per season" or "count per cycle" (rotation
 * cycle). Used as a denominator when computing over/under deviations.
 */
export const ExpectedRateSchema = z.object({
  /** How many occurrences are expected in the given period. */
  count: z.number().nonnegative(),
  /** The temporal unit the count is expressed over. */
  per: z.enum(['season', 'cycle']),
});
export type ExpectedRate = z.infer<typeof ExpectedRateSchema>;

// ---------------------------------------------------------------------------
// FlagDirection + FlagDepth
// ---------------------------------------------------------------------------

/**
 * Whether the steward should tighten (do more / stricter) or loosen
 * (do less / relax) the parameter in response to the deviation.
 */
export const FlagDirection = z.enum(['tighten', 'loosen']);
export type FlagDirection = z.infer<typeof FlagDirection>;

/**
 * Rendering weight / structural significance of the flag.
 * Listed from shallowest (threshold: a numeric limit crossed) to deepest
 * (structural: a systemic design issue). Downstream UI sorts/filters by this.
 */
export const FlagDepth = z.enum([
  'threshold',
  'soil',
  'water',
  'zones',
  'structural',
]);
export type FlagDepth = z.infer<typeof FlagDepth>;

// ---------------------------------------------------------------------------
// ObjectiveReviewFlag
// ---------------------------------------------------------------------------

/**
 * An immutable flag record raised when a project objective's observed activity
 * deviates from expectation (over/under) or is entirely absent (existential).
 *
 * Lifecycle fields:
 *   raisedAt       -- when the evaluation engine raised this flag
 *   acknowledgedAt -- steward saw it (clears the "new" badge)
 *   resolvedAt     -- steward acted and considers the issue closed
 *   dismissedAt    -- steward judged it noise and suppressed it
 *   dismissedAtCount -- observedCount at dismissal time; escalation layer uses
 *                       this to detect patterns re-emerging after a dismiss
 *   dormantSince   -- evaluation paused (e.g. seasonal dormancy)
 *
 * NOTE: resolvedAt and dismissedAt are INTENTIONALLY DISTINCT fields.
 *   resolvedAt  = steward took corrective action
 *   dismissedAt = steward labelled it a false positive / acceptable variance
 * A downstream escalation task keys off dismissedAt + dismissedAtCount to
 * detect "dismissed but now re-firing" patterns; do not collapse these fields.
 */
export const ObjectiveReviewFlagSchema = z.object({
  /** Stable unique id (caller-generated via crypto.randomUUID()). */
  id: z.string(),
  /** The project this flag belongs to. */
  projectId: z.string(),
  /** The objective whose observed activity triggered this flag. */
  objectiveId: z.string(),
  /** The protocol template that authored the evaluation rule. */
  sourceTemplateId: z.string(),
  /**
   * The activation records that contributed observed evidence for this
   * evaluation window. Defaults to empty (existential flags have none).
   */
  sourceActivationIds: z.array(z.string()).default([]),
  /** Count of relevant activations observed in the evaluation window. */
  observedCount: z.number().int().nonnegative(),
  /**
   * The steward-authored expected cadence against which this flag was
   * evaluated. Absent for existential flags (no evidence at all).
   */
  expectedRate: ExpectedRateSchema.optional(),
  /**
   * The temporal window this flag covers. Both fields are optional;
   * defaults to empty object so callers can always read window.season etc.
   */
  window: z
    .object({
      /** Season the window falls in (biodynamic / cyclical phase). */
      season: SeasonName.optional(),
      /** Zero-based rotation/observation cycle index. */
      cycleNumber: z.number().int().nonnegative().optional(),
    })
    .default({}),
  /**
   * Direction of the deviation:
   *   over        -- more activations than expected
   *   under       -- fewer activations than expected
   *   existential -- zero activations; the objective has no evidence at all
   */
  deviationSign: z.enum(['over', 'under', 'existential']),
  /** Structural significance / rendering weight of this flag. */
  depth: FlagDepth,
  /** Whether the resolution posture should tighten or loosen. */
  direction: FlagDirection,
  /** Human-readable explanation of why this flag was raised. */
  reason: z.string().min(1),
  /** ISO-8601 timestamp: when the evaluation engine raised this flag. */
  raisedAt: z.string().min(1),
  /** ISO-8601 timestamp: when the steward acknowledged (saw) this flag. */
  acknowledgedAt: z.string().optional(),
  /**
   * ISO-8601 timestamp: steward took corrective action and considers the
   * issue closed. DISTINCT from dismissedAt -- see schema-level note above.
   */
  resolvedAt: z.string().optional(),
  /**
   * ISO-8601 timestamp: steward labelled this flag noise / acceptable
   * variance. DISTINCT from resolvedAt -- see schema-level note above.
   */
  dismissedAt: z.string().optional(),
  /**
   * The value of observedCount at the time the flag was dismissed. Escalation
   * layer compares current observedCount against this to detect re-emergence.
   */
  dismissedAtCount: z.number().int().nonnegative().optional(),
  /**
   * ISO-8601 timestamp: evaluation paused (e.g. winter dormancy); flag is
   * silenced until this timestamp passes or is cleared.
   */
  dormantSince: z.string().optional(),
  /**
   * Optional parameter adjustment proposed as resolution: which parameter
   * changed, its before value, and its after value (all strings for
   * schema-agnosticism; the rendering layer parses/formats them).
   */
  resolutionParameterDelta: z
    .object({
      itemId: z.string(),
      from: z.string(),
      to: z.string(),
    })
    .optional(),
  /**
   * How many times this flag has fired since it was last resolved. Used by
   * the escalation layer to upgrade depth automatically.
   */
  firingsSinceResolution: z.number().int().nonnegative().optional(),
});
export type ObjectiveReviewFlag = z.infer<typeof ObjectiveReviewFlagSchema>;
