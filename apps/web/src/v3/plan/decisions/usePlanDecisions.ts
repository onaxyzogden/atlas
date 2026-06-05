/**
 * usePlanDecisions — reads the authored Decision Log for one project and returns
 * it sorted (draft → accepted → superseded → rejected, newest first within a
 * group). One place for the Decision Log page and the nav badge to read so they
 * stay consistent. Mirrors `usePlanImpactFlags`.
 */

import { useMemo } from 'react';
import { usePlanDecisionStore } from '../../../store/planDecisionStore.js';
import {
  sortDecisions,
  type PlanDecision,
  type PlanDecisionStatus,
} from './planDecision.js';

/** Every decision for a project, sorted for display. */
export function usePlanDecisions(projectId: string): PlanDecision[] {
  const byId = usePlanDecisionStore((s) => s.byProject[projectId]);
  return useMemo(
    () => sortDecisions(byId ? Object.values(byId) : []),
    [byId],
  );
}

/**
 * One decision by id — a reactive selector so the Planning Workspace re-renders
 * on every `update()` (e.g. when a scenario option is added or adopted).
 */
export function usePlanDecision(
  projectId: string,
  id: string,
): PlanDecision | undefined {
  return usePlanDecisionStore((s) => s.byProject[projectId]?.[id]);
}

export type PlanDecisionCounts = Record<PlanDecisionStatus, number> & {
  total: number;
};

/** Per-status counts for the nav badge (badges the draft count). */
export function usePlanDecisionCounts(projectId: string): PlanDecisionCounts {
  const decisions = usePlanDecisions(projectId);
  return useMemo(() => {
    const counts: PlanDecisionCounts = {
      draft: 0,
      accepted: 0,
      superseded: 0,
      rejected: 0,
      total: decisions.length,
    };
    for (const d of decisions) counts[d.status] += 1;
    return counts;
  }, [decisions]);
}
