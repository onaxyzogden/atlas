/**
 * usePlanVersions — reads the authored Plan Version history for one project and
 * returns it sorted (draft → approved → superseded, newest first within a
 * group). One place for the Versions page, the synthesis rollup, and the nav
 * badge to read so they stay consistent. Mirrors `usePlanDecisions`.
 */

import { useMemo } from 'react';
import { usePlanVersionStore } from '../../../store/planVersionStore.js';
import {
  sortVersions,
  type PlanVersion,
  type PlanVersionStatus,
} from './planVersion.js';

/** Every version for a project, sorted for display. */
export function usePlanVersions(projectId: string): PlanVersion[] {
  const byId = usePlanVersionStore((s) => s.byProject[projectId]);
  return useMemo(
    () => sortVersions(byId ? Object.values(byId) : []),
    [byId],
  );
}

export type PlanVersionCounts = Record<PlanVersionStatus, number> & {
  total: number;
};

/** Per-status counts for the nav badge (badges the draft count). */
export function usePlanVersionCounts(projectId: string): PlanVersionCounts {
  const versions = usePlanVersions(projectId);
  return useMemo(() => {
    const counts: PlanVersionCounts = {
      draft: 0,
      approved: 0,
      superseded: 0,
      total: versions.length,
    };
    for (const v of versions) counts[v.status] += 1;
    return counts;
  }, [versions]);
}

/**
 * The "active" version for the synthesis header — the most recent approved
 * version, or the most recent overall when none is approved yet. Undefined when
 * the project has no versions. (`usePlanVersions` already sorts newest-first
 * within status, and approved sorts before superseded.)
 */
export function useActivePlanVersion(projectId: string): PlanVersion | undefined {
  const versions = usePlanVersions(projectId);
  return useMemo(() => {
    const approved = versions.filter((v) => v.status === 'approved');
    if (approved.length > 0) return approved[0];
    return versions[0];
  }, [versions]);
}
