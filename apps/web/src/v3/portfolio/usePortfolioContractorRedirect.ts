// usePortfolioContractorRedirect.ts
//
// §8 access control: contractors do not belong on the Portfolio Home surface —
// they work inside a single assigned project's Act / field-actions flow. Once
// roles resolve (useMyProjectRoles fetches asynchronously, so this CANNOT live
// in a route `beforeLoad`), a user who is a contractor on some project AND
// owner-tier on none is redirected to their assigned project's Act surface.
//
// Why Act and not per-project Home: PerProjectHomePage already renders an empty
// "all projects → /v3/portfolio" state for contractors/landowners, so bouncing
// a contractor there is a UX dead-end. Act/field-actions is where contractors
// actually do work. PerProjectHomePage renders (not redirects), so there is no
// redirect loop.
//
// Redirect fires at most once per mount (guarded by a ref) and only after roles
// have loaded — while the role map is still empty, synced projects resolve to a
// null role (owner-tier by default) so no premature redirect occurs.

import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { ProjectRole } from '@ogden/shared';
import type { LocalProject } from '../../store/projectStore.js';
import { portfolioAccess } from './portfolioModel.js';

export function usePortfolioContractorRedirect(
  projects: LocalProject[],
  roleMap: ReadonlyMap<string, ProjectRole>,
): void {
  const navigate = useNavigate();
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    // Wait until roles have loaded — an empty map means the fetch is in flight,
    // and every synced project would falsely resolve to owner-tier.
    if (roleMap.size === 0) return;

    let isContractorSomewhere = false;
    let ownerTierAnywhere = false;
    let assignedProjectId: string | null = null;
    for (const p of projects) {
      const access = portfolioAccess(p, roleMap);
      if (access.isOwnerTier) ownerTierAnywhere = true;
      if (access.isContractor) {
        isContractorSomewhere = true;
        if (assignedProjectId == null) assignedProjectId = p.id;
      }
    }

    if (isContractorSomewhere && !ownerTierAnywhere && assignedProjectId) {
      redirected.current = true;
      navigate({
        to: '/v3/project/$projectId/act',
        params: { projectId: assignedProjectId },
      });
    }
  }, [projects, roleMap, navigate]);
}
