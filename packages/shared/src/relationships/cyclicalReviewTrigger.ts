// cyclicalReviewTrigger.ts
//
// Pure predicate for cyclical-review mode (OLOS Plan Navigation Spec v1
// §3.6). An objective enters cyclical review when it is `complete` AND
// EITHER more than 90 days have passed since the last review OR an
// Observe-driven Plan revision flag has fired for it.
//
// Phase 4 caller wiring (Slice 4.4 — landed):
//   `apps/web/src/v3/observe/dashboard/revision/usePlanRevisionFlagSync.ts`
//   computes `computeObserveRevisionFlag` for every PLAN_STRATUM_OBJECTIVE
//   against active diverged ObserveDataPoints + diverged ObserveFeedEntries
//   and flips `cyclicalReviewStore.forceTrigger` / `clearForcedTrigger`
//   on delta. The `observeRevisionFlag` injection point of this predicate
//   is then satisfied by `cyclicalReviewStore.isForced(projectId, id)`.
//
// Before Phase 4, the flag was stubbed behind a feature gate via
// `cyclicalReviewStore.forceTrigger` (dev-tools only). The predicate
// itself is unchanged across Phases.

import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '../schemas/plan/planTierObjective.schema.js';

export const CYCLICAL_REVIEW_DEFAULT_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface CyclicalReviewInputs {
  objective: PlanStratumObjective;
  currentStatus: PlanStratumObjectiveStatus;
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
