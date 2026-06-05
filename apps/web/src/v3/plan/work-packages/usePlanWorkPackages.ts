/**
 * usePlanWorkPackages — reads the authored Work Packages for one project and
 * returns them sorted (draft → queued → in-progress → done → cancelled, newest
 * first within a group). One place for the Work Packages page, the Act consumer,
 * and the nav badge to read so they stay consistent. Mirrors `usePlanDecisions`.
 */

import { useMemo } from 'react';
import { usePlanWorkPackageStore } from '../../../store/planWorkPackageStore.js';
import {
  sortWorkPackages,
  type PlanWorkPackage,
  type PlanWorkPackageStatus,
} from './planWorkPackage.js';

/** Every work package for a project, sorted for display. */
export function usePlanWorkPackages(projectId: string): PlanWorkPackage[] {
  const byId = usePlanWorkPackageStore((s) => s.byProject[projectId]);
  return useMemo(
    () => sortWorkPackages(byId ? Object.values(byId) : []),
    [byId],
  );
}

export type PlanWorkPackageCounts = Record<PlanWorkPackageStatus, number> & {
  total: number;
};

/** Per-status counts for the nav badge (badges the draft count). */
export function usePlanWorkPackageCounts(
  projectId: string,
): PlanWorkPackageCounts {
  const pkgs = usePlanWorkPackages(projectId);
  return useMemo(() => {
    const counts: PlanWorkPackageCounts = {
      draft: 0,
      queued: 0,
      'in-progress': 0,
      done: 0,
      cancelled: 0,
      total: pkgs.length,
    };
    for (const p of pkgs) counts[p.status] += 1;
    return counts;
  }, [pkgs]);
}

/**
 * The work package generated from a given decision, if one exists — for the
 * Decision Log idempotence check (one package per decision).
 */
export function useWorkPackageForDecision(
  projectId: string,
  decisionId: string,
): PlanWorkPackage | undefined {
  const byId = usePlanWorkPackageStore((s) => s.byProject[projectId]);
  return useMemo(
    () =>
      byId
        ? Object.values(byId).find((p) => p.decisionId === decisionId)
        : undefined,
    [byId, decisionId],
  );
}
