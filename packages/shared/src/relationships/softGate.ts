// softGate — the ADR 11 "soft tier gate" resolver. Pure, I/O-free.
//
// Cyclical review can leave a previously-completed objective back in a
// `locked` status: when a steward REVISES a decision (un-checks items below
// the completion threshold) in response to an Observe change, the prereq
// engine cascades the objectives downstream of it back to `locked`. Those
// downstream tiers were already reached and worked once -- hard-locking them
// behind the unmet prereq again would trap the steward mid-review.
//
// ADR 11 softens that gate: while a review is active, a `locked` objective
// that was PREVIOUSLY COMPLETED (cyclicalReviewStore `lastReviewedAt != null`)
// renders as an ACCESSIBLE amber review checkpoint instead of a hard lock --
// the steward can re-enter and re-confirm it. Tiers never reached (no
// `lastReviewedAt`) stay hard-gated; this only ever OPENS access, never blocks
// it (Amanah: advisory, never a gate that locks).
//
// The status engine itself stays untouched (`computeObjectiveStatus` remains
// pure and I/O-free) -- this is a UI-layer overlay computed from the review
// store, exactly the seam ADR 11 specifies.

import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '../schemas/plan/planStratumObjective.schema.js';

export interface ResolveSoftGatesInput {
  objectives: readonly PlanStratumObjective[];
  /** Status engine output (`computeAllObjectiveStatuses`). */
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
  /**
   * Objective ids that were completed at least once -- proxied by
   * `cyclicalReviewStore` `lastReviewedAt != null` (bumped on initial
   * completion AND on every confirm/revise).
   */
  previouslyCompleted: ReadonlySet<string>;
  /**
   * True when at least one objective in the project is under an active
   * Observe-driven review (`forcedTrigger === true`). Soft gates only apply
   * during an active review; in steady state every lock stays hard.
   */
  reviewActive: boolean;
}

export interface SoftGateResult {
  /** Objective ids that are `locked` by status but render as accessible
   *  amber review checkpoints. */
  softObjectiveIds: ReadonlySet<string>;
  /** Stratum ids containing >= 1 soft objective, so the spine can render the
   *  whole tier as amber-accessible rather than hard-locked. */
  softStratumIds: ReadonlySet<string>;
}

const EMPTY: SoftGateResult = {
  softObjectiveIds: new Set(),
  softStratumIds: new Set(),
};

/**
 * Resolve the soft-gate overlay: the locked-but-previously-completed
 * objectives (and their strata) that should be accessible while a review is
 * active. Returns empty sets when no review is active or nothing qualifies.
 */
export function resolveSoftGates(input: ResolveSoftGatesInput): SoftGateResult {
  const { objectives, objectiveStatuses, previouslyCompleted, reviewActive } =
    input;
  if (!reviewActive || previouslyCompleted.size === 0) return EMPTY;

  const softObjectiveIds = new Set<string>();
  const softStratumIds = new Set<string>();
  for (const objective of objectives) {
    if (objectiveStatuses[objective.id] !== 'locked') continue;
    if (!previouslyCompleted.has(objective.id)) continue;
    softObjectiveIds.add(objective.id);
    softStratumIds.add(objective.stratumId);
  }
  if (softObjectiveIds.size === 0) return EMPTY;
  return { softObjectiveIds, softStratumIds };
}
