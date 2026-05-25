/**
 * usePlanConflicts — joins derived Plan Conflicts (recorded observations paired
 * against non-rejected decisions) with their persisted review runs into
 * ready-to-render view models, scoped to one project. One place for the Plan
 * Conflicts page and the nav badge to read so they stay consistent. Mirrors
 * `usePlanImpactFlags`.
 */

import { useMemo } from 'react';
import { usePlanConflictReviewStore } from '../../../store/planConflictReviewStore.js';
import { useObservationNeeds } from '../../observation-needs/useObservationNeeds.js';
import { usePlanDecisions } from '../decisions/usePlanDecisions.js';
import {
  derivePlanConflicts,
  emptyPlanConflictRun,
  type PlanConflict,
  type PlanConflictRun,
} from './planConflict.js';

export interface PlanConflictView {
  conflict: PlanConflict;
  review: PlanConflictRun;
}

/** Every Plan Conflict for a project, each joined with its review run. */
export function usePlanConflicts(projectId: string): PlanConflictView[] {
  const views = useObservationNeeds(projectId);
  const decisions = usePlanDecisions(projectId);
  const reviews = usePlanConflictReviewStore((s) => s.byProject[projectId]);
  return useMemo(() => {
    const conflicts = derivePlanConflicts(views, decisions);
    return conflicts.map((conflict) => ({
      conflict,
      review: reviews?.[conflict.id] ?? emptyPlanConflictRun(),
    }));
  }, [views, decisions, reviews]);
}

export interface PlanConflictCounts {
  open: number;
  reviewed: number;
  total: number;
}

/** Open / reviewed / total conflict counts for the nav badge. */
export function usePlanConflictCounts(projectId: string): PlanConflictCounts {
  const conflicts = usePlanConflicts(projectId);
  return useMemo(() => {
    let open = 0;
    for (const { review } of conflicts) {
      if (review.status === 'open') open += 1;
    }
    return { open, reviewed: conflicts.length - open, total: conflicts.length };
  }, [conflicts]);
}
