/**
 * planConflict — closes the last dangling Observe↔Plan edge (Phase 5a). Phase 1
 * surfaces an observation's plan *impact*; this surfaces a plan *conflict*: a
 * NEW recorded observation that lands in a module an existing, non-rejected
 * decision already addressed — a signal that reality may have moved since the
 * decision was taken.
 *
 * Mirrors the catalog/run split used across Atlas (and Phase 1's
 * `planImpactFlag.ts`):
 *   - The conflict is DERIVED (never stored), recomputed each render from the
 *     observation-need views + the Decision Log — pure, unit-testable.
 *   - The only persisted half is the review run (status + resolution + note),
 *     which lives in `planConflictReviewStore` and mirrors `PlanReviewRun`.
 *
 * Scope (Phase 5a): a resolution only RECORDS INTENT — it does not mutate the
 * plan, supersede a decision, or create work. The steward triages each conflict.
 * Strictly operational — no riba/gharar/CSRA/salam/financing semantics.
 */

import type { ObserveModule } from '../../observe/types.js';
import type { PlanModule } from '../types.js';
import type { ObservationNeedTarget } from '../../observation-needs/observationNeed.js';
import type { ObservationNeedView } from '../../observation-needs/useObservationNeeds.js';
import type { PlanDecision } from '../decisions/planDecision.js';

/** The triage call a steward records against a conflict. */
export type PlanConflictResolution = 'dismiss' | 'acknowledge' | 'revise-plan';

/** Where a conflict sits in the triage queue. */
export type PlanConflictStatus = 'open' | 'reviewed';

/**
 * How strong the conflict signal is. `likely` when the new observation
 * postdates the decision (reality changed after the call) or the steward
 * already flagged the observation `planImpact: likely`; `possible` otherwise.
 */
export type PlanConflictSeverity = 'possible' | 'likely';

/**
 * A derived, never-stored pairing of a recorded observation with an existing
 * decision it may contradict. `id` is composite so the review run keys 1:1.
 */
export interface PlanConflict {
  /** `${observationId}:${decisionId}` — stable across renders. */
  id: string;
  projectId: string;
  observationId: string;
  observationTitle: string;
  module: ObserveModule;
  /** When the underlying observation was recorded (run's last mutation). */
  observationRecordedAt?: string;
  target: ObservationNeedTarget;
  decisionId: string;
  decisionHeadline: string;
  affectedModule: PlanModule;
  reason: string;
  severity: PlanConflictSeverity;
}

/** The mutable, persisted half of a conflict review — the steward's triage. */
export interface PlanConflictRun {
  status: PlanConflictStatus;
  resolution?: PlanConflictResolution;
  note: string;
  /** ISO timestamp the resolution was recorded. */
  decidedAt?: string;
  /** ISO timestamp of the last mutation. */
  updatedAt?: string;
}

/** An empty review — the implicit state before a steward triages a conflict. */
export const emptyPlanConflictRun = (): PlanConflictRun => ({
  status: 'open',
  note: '',
});

/** Human label for each resolution, for the card buttons + recorded summary. */
export const PLAN_CONFLICT_RESOLUTION_LABEL: Record<
  PlanConflictResolution,
  string
> = {
  dismiss: 'Not a conflict',
  acknowledge: 'Acknowledge',
  'revise-plan': 'Revise plan',
};

/** Resolutions in display order. */
export const PLAN_CONFLICT_RESOLUTIONS: readonly PlanConflictResolution[] = [
  'dismiss',
  'acknowledge',
  'revise-plan',
] as const;

/**
 * Which Plan modules each Observe module can sensibly contradict. The two
 * taxonomies differ (7 Observe modules vs 15 Plan modules), so a decision is a
 * conflict candidate only when its `affectedModule` is in the observation
 * module's affinity set. Authored here (no auto-mapping from store data).
 */
export const OBSERVE_TO_PLAN_AFFINITY: Record<ObserveModule, PlanModule[]> = {
  'human-context': ['goal-compass', 'zone-circulation', 'phasing-budgeting'],
  'built-environment': ['structures-subsystems', 'machinery', 'zone-circulation'],
  'macroclimate-hazards': [
    'water-management',
    'cross-section-solar',
    'plant-systems',
  ],
  topography: [
    'water-management',
    'zone-circulation',
    'cross-section-solar',
    'soil-fertility',
  ],
  'earth-water-ecology': [
    'water-management',
    'soil-fertility',
    'plant-systems',
    'habitat-allocation',
    'biodiversity-monitor',
    'regeneration-monitor',
    'livestock',
  ],
  'sectors-zones': ['zone-circulation', 'goal-compass', 'livestock'],
  'swot-synthesis': ['goal-compass', 'principle-verification', 'phasing-budgeting'],
};

const SEVERITY_RANK: Record<PlanConflictSeverity, number> = {
  likely: 0,
  possible: 1,
};

/** Did the observation get recorded after the decision was last updated? */
function observationPostdatesDecision(
  recordedAt: string | undefined,
  decisionUpdatedAt: string | undefined,
): boolean {
  if (!recordedAt || !decisionUpdatedAt) return false;
  return recordedAt.localeCompare(decisionUpdatedAt) > 0;
}

/**
 * Pure derivation: pair every recorded/resolved observation with each
 * non-rejected decision whose `affectedModule` is affinity-related to the
 * observation's module. Severity is `likely` when the observation postdates the
 * decision or was flagged `planImpact: likely`, else `possible`. Sorted
 * likely-before-possible, then most-recently-recorded first. No store access →
 * unit-testable in the style of `derivePlanImpactFlags`.
 */
export function derivePlanConflicts(
  views: ObservationNeedView[],
  decisions: PlanDecision[],
): PlanConflict[] {
  const candidates = decisions.filter(
    (d) => d.status !== 'rejected' && !!d.affectedModule,
  );
  const conflicts: PlanConflict[] = [];

  for (const { objective, run } of views) {
    if (run.status !== 'recorded' && run.status !== 'resolved') continue;
    const recordedAt = run.updatedAt;
    const affinity = OBSERVE_TO_PLAN_AFFINITY[objective.module] ?? [];

    for (const decision of candidates) {
      const affectedModule = decision.affectedModule as PlanModule;
      if (!affinity.includes(affectedModule)) continue;

      const postdates = observationPostdatesDecision(
        recordedAt,
        decision.updatedAt,
      );
      const severity: PlanConflictSeverity =
        postdates || objective.planImpact === 'likely' ? 'likely' : 'possible';
      const headline = decision.headline.trim() || 'an untitled decision';
      const reason = postdates
        ? `Recorded after the decision "${headline}" was last updated — it may no longer hold.`
        : `A new ${objective.module} observation may affect the decision "${headline}".`;

      conflicts.push({
        id: `${objective.id}:${decision.id}`,
        projectId: objective.projectId,
        observationId: objective.id,
        observationTitle: objective.title,
        module: objective.module,
        ...(recordedAt ? { observationRecordedAt: recordedAt } : {}),
        target: objective.target,
        decisionId: decision.id,
        decisionHeadline: decision.headline,
        affectedModule,
        reason,
        severity,
      });
    }
  }

  return conflicts.sort((a, b) => {
    const rank = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (rank !== 0) return rank;
    return (b.observationRecordedAt ?? '').localeCompare(
      a.observationRecordedAt ?? '',
    );
  });
}
