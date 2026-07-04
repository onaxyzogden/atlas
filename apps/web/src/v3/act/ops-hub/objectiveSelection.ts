/**
 * objectiveSelection — the decision behind clicking an objective in the
 * Operations Hub.
 *
 * The hub surfaces objectives from three entry points (quick-find search,
 * status-filtered task rows, map pins). Selecting one navigates to its
 * walkthrough route (`act/ops/$objectiveId`), whose `beforeLoad` bounces a
 * LOCKED objective straight back to the bare hub. Routing into that guaranteed
 * redirect reads as a silent dead-click (deep-audit 2026-07-03, H6). This
 * resolves the click BEFORE navigating: a locked objective is blocked with
 * feedback (parity with the tier-shell rail's `toast.warning`), everything else
 * opens.
 *
 * The "unknown id => locked" default matches the route guard's `?? 'locked'`
 * exactly, so the hub and the route can never disagree about what is openable.
 */

import type { PlanStratumObjectiveStatusMap } from '@ogden/shared';

/**
 * True when an objective is not yet openable — either explicitly `locked` by
 * Plan prerequisites, or absent from the computed status set (the conservative
 * default the route guard itself uses). Every other status (available, active,
 * complete, deferred) is openable, mirroring the guard, which blocks `locked`
 * alone.
 */
export function isObjectiveLocked(
  statuses: PlanStratumObjectiveStatusMap,
  objectiveId: string,
): boolean {
  return (statuses[objectiveId] ?? 'locked') === 'locked';
}

/** Effect handlers a hub click is dispatched to, injected so the decision is
 *  testable without a router or the toast store. */
export interface ObjectiveSelectHandlers {
  /** Open the objective's walkthrough — only ever called for an openable id. */
  open: (projectId: string, objectiveId: string) => void;
  /** The objective is locked: give feedback instead of a dead navigation. */
  locked: () => void;
}

/**
 * Resolve a hub objective click. With no project context there is no route to
 * open into, so it is a no-op. A locked (or unknown) objective is blocked with
 * feedback; anything openable navigates.
 */
export function selectObjective(
  objectiveId: string,
  projectId: string | undefined,
  statuses: PlanStratumObjectiveStatusMap,
  handlers: ObjectiveSelectHandlers,
): void {
  if (!projectId) return;
  if (isObjectiveLocked(statuses, objectiveId)) {
    handlers.locked();
    return;
  }
  handlers.open(projectId, objectiveId);
}
