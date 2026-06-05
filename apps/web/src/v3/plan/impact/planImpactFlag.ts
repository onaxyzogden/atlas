/**
 * planImpactFlag — closes the dangling Observe→Plan loop. An observation need
 * can carry `planImpact: 'possible' | 'likely'` (set in Observe), but until now
 * no `plan/` code consumed it. A Plan Impact Flag is the Plan-side view of a
 * *recorded* observation whose need was flagged for plan impact — a thing a
 * steward should triage into a decision.
 *
 * Mirrors the catalog/run split used across Atlas:
 *   - The flag is DERIVED (never stored), recomputed from observation-need views
 *     each render — exactly like the auto-needs in `autoObservationNeeds.ts`.
 *   - The only persisted half is the review run (status + decision + note), which
 *     lives in `planImpactReviewStore` and mirrors `ObservationNeedRun`.
 *
 * Scope (Phase 1): a decision only RECORDS INTENT on the review. It does not yet
 * mutate the plan, create Act work items, or pause anything — that wiring is
 * Phase 2 (Decision Log) / Phase 3 (Work Packages).
 */

import type { ObserveModule } from '../../observe/types.js';
import type { PlanImpact, ObservationNeedTarget } from '../../observation-needs/observationNeed.js';
import type { ObservationNeedView } from '../../observation-needs/useObservationNeeds.js';

/**
 * The operational decision a steward records against a flag. Plain operational
 * verbs (no stewardship/covenant framing yet) — outline §7.1 decision set.
 */
export type PlanReviewDecision =
  | 'no-change'
  | 'update-plan'
  | 'request-observation'
  | 'create-act-task'
  | 'pause-act'
  | 'escalate';

/** Where a flag sits in the triage queue. */
export type PlanReviewStatus = 'open' | 'reviewed';

/** Only the two impacts that warrant Plan attention (never `none`). */
export type FlaggedImpact = Extract<PlanImpact, 'possible' | 'likely'>;

/**
 * A derived, never-stored view of a recorded observation that may affect the
 * plan. `id` IS the source need's id, so the review run keys 1:1 with the flag.
 */
export interface PlanImpactFlag {
  id: string;
  projectId: string;
  needId: string;
  module: ObserveModule;
  title: string;
  reason: string;
  planImpact: FlaggedImpact;
  /** Back-link to the record the need followed from (follow-up needs). */
  sourceObservationId?: string;
  /** When the underlying observation was recorded (run's last mutation). */
  recordedAt?: string;
  target: ObservationNeedTarget;
}

/** The mutable, persisted half of a review — the only state a steward produces. */
export interface PlanReviewRun {
  status: PlanReviewStatus;
  decision?: PlanReviewDecision;
  note: string;
  /** ISO timestamp the decision was recorded. */
  decidedAt?: string;
  /** ISO timestamp of the last mutation. */
  updatedAt?: string;
}

/** An empty review — the implicit state before a steward triages a flag. */
export const emptyPlanReviewRun = (): PlanReviewRun => ({
  status: 'open',
  note: '',
});

/** Human label for each decision, for the card buttons + recorded summary. */
export const PLAN_REVIEW_DECISION_LABEL: Record<PlanReviewDecision, string> = {
  'no-change': 'No change',
  'update-plan': 'Update plan',
  'request-observation': 'Request observation',
  'create-act-task': 'Create Act task',
  'pause-act': 'Pause Act',
  escalate: 'Escalate',
};

/** Decisions in display order. */
export const PLAN_REVIEW_DECISIONS: readonly PlanReviewDecision[] = [
  'no-change',
  'update-plan',
  'request-observation',
  'create-act-task',
  'pause-act',
  'escalate',
] as const;

const IMPACT_RANK: Record<FlaggedImpact, number> = { likely: 0, possible: 1 };

function isFlaggedImpact(value: PlanImpact | undefined): value is FlaggedImpact {
  return value === 'possible' || value === 'likely';
}

/**
 * Pure derivation: keep only the views whose need was flagged for plan impact
 * (`possible`/`likely`) AND whose observation is actually on the books
 * (`recorded`/`resolved`) — open/anticipated needs are not yet reality, so they
 * don't earn a Plan review. Maps each to a flag and sorts `likely` before
 * `possible`, then most-recently-recorded first. No store access → unit-testable
 * in the style of `evaluateObservationRecorded`.
 */
export function derivePlanImpactFlags(
  views: ObservationNeedView[],
): PlanImpactFlag[] {
  const flags: PlanImpactFlag[] = [];
  for (const { objective, run } of views) {
    if (!isFlaggedImpact(objective.planImpact)) continue;
    if (run.status !== 'recorded' && run.status !== 'resolved') continue;
    flags.push({
      id: objective.id,
      projectId: objective.projectId,
      needId: objective.id,
      module: objective.module,
      title: objective.title,
      reason: objective.reason,
      planImpact: objective.planImpact,
      ...(objective.sourceObservationId
        ? { sourceObservationId: objective.sourceObservationId }
        : {}),
      ...(run.updatedAt ? { recordedAt: run.updatedAt } : {}),
      target: objective.target,
    });
  }
  return flags.sort((a, b) => {
    const rank = IMPACT_RANK[a.planImpact] - IMPACT_RANK[b.planImpact];
    if (rank !== 0) return rank;
    return (b.recordedAt ?? '').localeCompare(a.recordedAt ?? '');
  });
}
