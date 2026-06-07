// deviationPolicy.ts
//
// Pure protocol deviation policy helpers (T1.2).
// This module is intentionally free of time logic -- the CALLER decides
// window completeness before invoking evaluateDeviation.

import type { SeasonName } from '../../schemas/protocol/protocol.schema.js';
import {
  type FlagDepth,
  type FlagDirection,
  type ExpectedRate,
} from '../../schemas/protocol/reviewFlag.schema.js';

// ---------------------------------------------------------------------------
// temporalBucketKey
// ---------------------------------------------------------------------------

/**
 * Returns a stable string key identifying a temporal bucket for grouping
 * review flags by season + rotation cycle. Both arguments are optional:
 * an absent season becomes 'unknown' and an absent cycleNumber becomes 0.
 *
 * Used by the emission layer (T1.6) as the Map key that accumulates
 * activations before submitting an evaluation window.
 */
export function temporalBucketKey(
  season?: SeasonName,
  cycleNumber?: number
): string {
  return `${season ?? 'unknown'}:${cycleNumber ?? 0}`;
}

// ---------------------------------------------------------------------------
// S6_BOUND_TEMPLATE_IDS
// ---------------------------------------------------------------------------

/**
 * The 5 Tier-1 protocol templates hard-bound to the s6-yield-flows
 * objective. This is the single source of truth for the "5 s6-bound
 * protocols" membership test used by the web emission layer.
 *
 * T1.6 hard-codes these to s6+s7 in the web emission layer.
 * T2.2 uses `!S6_BOUND_TEMPLATE_IDS.has(id)` to fall back to the
 * FEEDS_TO_OBJECTIVE table for the templates NOT in this set.
 *
 * The OTHER 5 of the 10 STANDARD_PROTOCOL_TEMPLATES (the cyclical- and
 * judgment-type, trigger-on-event protocols) are NOT in this set; they WILL
 * be routed via FEEDS_TO_OBJECTIVE in T2.1 (not yet implemented). Note: all 10
 * templates share `tierAuthored: 'Stratum 6 - Integration'` in source - the
 * Tier-1/Tier-2 split is a plan-phase concept, not a stratum distinction.
 *
 * Keep these ids in sync with
 * packages/shared/src/constants/protocol/standardTemplates.ts.
 */
export const S6_BOUND_TEMPLATE_IDS: ReadonlySet<string> = new Set([
  'paddock-rotation-cover-trigger',
  'paddock-rotation-grazing-day-limit',
  'rest-period-re-entry-gate',
  'livestock-health-check-prompt',
  'emergency-destocking',
]);

// ---------------------------------------------------------------------------
// EXISTENTIAL_TEMPLATE_IDS
// ---------------------------------------------------------------------------

/**
 * Protocol templates whose SINGLE activation is inherently significant --
 * one firing alone contradicts a load-bearing design assumption regardless
 * of any steward-authored expected rate.
 */
export const EXISTENTIAL_TEMPLATE_IDS: ReadonlySet<string> = new Set([
  'emergency-destocking',
]);

// ---------------------------------------------------------------------------
// TEMPLATE_DEPTH
// ---------------------------------------------------------------------------

/**
 * FlagDepth (rendering weight) for each S6-bound template.
 * FlagDepth = rendering weight, NOT protocol type (e.g.
 * livestock-health-check-prompt is ProtocolType 'judgment' yet FlagDepth
 * 'threshold'). All 5 S6_BOUND_TEMPLATE_IDS map to 'threshold' (shallowest).
 *
 * Tier 2 (T2.1) added depths for the 5 event-driven templates that are NOT
 * in S6_BOUND_TEMPLATE_IDS: soil/water/zones where the event implicates a
 * deep stratum (post-rotation-impact -> soil, water-trough-inspection ->
 * water, silvopasture-pest-diversion -> zones), and threshold for the two
 * operational yield-monitoring events (pre-rotation-paddock-assessment,
 * seasonal-stocking-rate-review). Their depths pair with the
 * FEEDS_TO_OBJECTIVE targets in
 * packages/shared/src/constants/protocol/feedsToObjective.ts.
 */
export const TEMPLATE_DEPTH: Record<string, FlagDepth> = {
  'paddock-rotation-cover-trigger': 'threshold',
  'paddock-rotation-grazing-day-limit': 'threshold',
  'rest-period-re-entry-gate': 'threshold',
  'livestock-health-check-prompt': 'threshold',
  'emergency-destocking': 'threshold',
  // Event-driven (non-s6-bound) templates (T2.1):
  'post-rotation-impact-assessment': 'soil',
  'pre-rotation-paddock-assessment': 'threshold',
  'water-trough-inspection': 'water',
  'seasonal-stocking-rate-review': 'threshold',
  'silvopasture-pest-diversion': 'zones',
};

// ---------------------------------------------------------------------------
// evaluateDeviation
// ---------------------------------------------------------------------------

/** Input to the pure deviation evaluator. */
export interface EvaluateDeviationInput {
  /** The standard or custom protocol template id being evaluated. */
  templateId: string;
  /** Count of relevant activations in the caller-defined evaluation window. */
  activationsInWindow: number;
  /**
   * Steward-authored expected cadence. When absent: no baseline is available
   * so no deviation flag is raised (except for existential templates).
   */
  expectedRate?: ExpectedRate;
}

/** Result of a pure deviation evaluation. */
export interface EvaluateDeviationResult {
  /** Whether a ReviewFlag should be raised for this window. */
  shouldFlag: boolean;
  /**
   * The nature of the deviation. Absent when shouldFlag is false.
   *   over        -- more activations than expected
   *   under       -- fewer activations than expected
   *   existential -- single firing of an existentially-significant template
   */
  deviationSign?: 'over' | 'under' | 'existential';
  /**
   * Resolution posture. Absent when shouldFlag is false.
   *   tighten -- do more / be stricter
   *   loosen  -- do less / relax
   */
  direction?: FlagDirection;
  /** The raw activation count passed in -- always present for audit trails. */
  observedCount: number;
}

/**
 * Pure function: evaluates whether an activation count constitutes a
 * deviation from the expected rate (or existential significance) and returns
 * a structured result the caller can persist as an ObjectiveReviewFlag.
 *
 * This function is PURE on the count it is given.
 * The CALLER decides window completeness; no time logic lives here.
 *
 * Evaluation order:
 * 1. Existential check (templateId in EXISTENTIAL_TEMPLATE_IDS + count >= 1)
 * 2. No-baseline guard (expectedRate absent -> no flag)
 * 3. Over / under / equal comparison
 */
export function evaluateDeviation(
  input: EvaluateDeviationInput
): EvaluateDeviationResult {
  const { templateId, activationsInWindow, expectedRate } = input;
  const observedCount = activationsInWindow;

  // 1. Existential: a single firing is inherently significant
  if (
    EXISTENTIAL_TEMPLATE_IDS.has(templateId) &&
    activationsInWindow >= 1
  ) {
    return {
      shouldFlag: true,
      deviationSign: 'existential',
      direction: 'tighten',
      observedCount,
    };
  }

  // 2. No baseline available -> cannot compute a rate deviation
  if (expectedRate === undefined) {
    return { shouldFlag: false, observedCount };
  }

  // 3. Rate deviation
  if (observedCount > expectedRate.count) {
    return {
      shouldFlag: true,
      deviationSign: 'over',
      direction: 'tighten',
      observedCount,
    };
  }

  if (observedCount < expectedRate.count) {
    return {
      shouldFlag: true,
      deviationSign: 'under',
      direction: 'loosen',
      observedCount,
    };
  }

  // Equal: on target
  return { shouldFlag: false, observedCount };
}
