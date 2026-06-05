/**
 * usePlanImpactFlags — joins derived Plan Impact Flags (from recorded
 * observation needs) with their persisted review runs into ready-to-render view
 * models, scoped to one project. One place for the Plan Reviews page and the
 * nav badge to read so they stay consistent. Mirrors `useObservationNeeds`.
 */

import { useMemo } from 'react';
import { usePlanImpactReviewStore } from '../../../store/planImpactReviewStore.js';
import { useObservationNeeds } from '../../observation-needs/useObservationNeeds.js';
import {
  derivePlanImpactFlags,
  emptyPlanReviewRun,
  type PlanImpactFlag,
  type PlanReviewRun,
} from './planImpactFlag.js';

export interface PlanImpactFlagView {
  flag: PlanImpactFlag;
  review: PlanReviewRun;
}

/** Every Plan Impact Flag for a project, each joined with its review run. */
export function usePlanImpactFlags(projectId: string): PlanImpactFlagView[] {
  const views = useObservationNeeds(projectId);
  const reviews = usePlanImpactReviewStore((s) => s.byProject[projectId]);
  return useMemo(() => {
    const flags = derivePlanImpactFlags(views);
    return flags.map((flag) => ({
      flag,
      review: reviews?.[flag.id] ?? emptyPlanReviewRun(),
    }));
  }, [views, reviews]);
}

export interface PlanImpactFlagCounts {
  open: number;
  reviewed: number;
  total: number;
}

/** Open / reviewed / total flag counts for the nav badge. */
export function usePlanImpactFlagCounts(
  projectId: string,
): PlanImpactFlagCounts {
  const flags = usePlanImpactFlags(projectId);
  return useMemo(() => {
    let open = 0;
    for (const { review } of flags) {
      if (review.status === 'open') open += 1;
    }
    return { open, reviewed: flags.length - open, total: flags.length };
  }, [flags]);
}
