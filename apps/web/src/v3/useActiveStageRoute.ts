/**
 * useActiveStageRoute — resolves the active v3 project + working stage from
 * the current pathname.
 *
 * Mirrors the route pattern that HeaderStageSpine uses to decide whether to
 * render. Returns null off the recognised working-stage routes (and on the
 * `report` section, which has no searchable stage surface), so both the header
 * search input and the stage surfaces can gate on the same signal.
 */

import { useRouterState } from '@tanstack/react-router';

export type SearchableStage = 'observe' | 'plan' | 'act';

const ROUTE_RE = /^\/v3\/project\/([^/]+)\/(observe|plan|act)(?:\/|$)/;

export interface ActiveStageRoute {
  projectId: string;
  stage: SearchableStage;
}

/** Parse a pathname into the active project + searchable stage, or null. */
export function parseActiveStageRoute(
  pathname: string,
): ActiveStageRoute | null {
  const match = ROUTE_RE.exec(pathname);
  if (!match) return null;
  return {
    projectId: match[1]!,
    stage: match[2] as SearchableStage,
  };
}

/** Hook form — recomputes only when the pathname changes. */
export function useActiveStageRoute(): ActiveStageRoute | null {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return parseActiveStageRoute(pathname);
}
