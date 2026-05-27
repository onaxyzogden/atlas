// cyclicalReviewTrigger.ts
//
// Pure predicate for cyclical-review mode (OLOS Plan Navigation Spec v1
// §3.6). An objective enters cyclical review when it is `complete` AND
// EITHER more than 90 days have passed since the last review OR an
// Observe-driven Plan revision flag has fired for it.
//
// The Observe-flag plumbing lands in Phase 4. For Phase 1 the predicate
// accepts the flag as a function so the UI can stub it behind a feature
// gate (see cyclicalReviewStore.forceTrigger).

import type {
  PlanTierObjective,
  PlanTierObjectiveStatus,
} from '../schemas/plan/planTierObjective.schema.js';

export const CYCLICAL_REVIEW_DEFAULT_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface CyclicalReviewInputs {
  objective: PlanTierObjective;
  currentStatus: PlanTierObjectiveStatus;
  /** ISO timestamp the objective last entered `complete` or was last reviewed. */
  lastReviewedAt: string | null;
  /** `Date.now()`-style epoch milliseconds, injected for testability. */
  now: number;
  /** Optional Observe-flag check (wired in Phase 4). Returns true to force a review. */
  observeRevisionFlag?: (objectiveId: string) => boolean;
  /** Override the 90-day threshold (mostly for tests). */
  reviewIntervalDays?: number;
}

export function isCyclicalReviewDue(input: CyclicalReviewInputs): boolean {
  if (input.currentStatus !== 'complete') return false;

  if (input.observeRevisionFlag?.(input.objective.id) === true) {
    return true;
  }

  if (!input.lastReviewedAt) {
    // Completed but never reviewed since completion — not yet due. The
    // initial completion is itself the first "review".
    return false;
  }

  const intervalDays =
    input.reviewIntervalDays ?? CYCLICAL_REVIEW_DEFAULT_DAYS;
  const lastReviewedMs = Date.parse(input.lastReviewedAt);
  if (Number.isNaN(lastReviewedMs)) return false;
  const elapsedMs = input.now - lastReviewedMs;
  return elapsedMs > intervalDays * MS_PER_DAY;
}
