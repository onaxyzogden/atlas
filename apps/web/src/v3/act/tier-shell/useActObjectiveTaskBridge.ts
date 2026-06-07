/**
 * useActObjectiveTaskBridge — store-aware, READ-ONLY resolution of the formal
 * ActTask roster for a tier-shell PlanStratumObjective (ObserveDataPoint
 * replacement migration, Phase 1).
 *
 * The tier-shell completes a `PlanStratumObjective`; the formal proof path
 * verifies an `ActTask` whose `objectiveId` is a UNIVERSAL catalogue Act
 * objective id. The two id spaces are bridged ONLY by domain — see
 * `resolveActObjectiveId` in `@ogden/shared`. This hook layers the serverId +
 * task-roster awareness on top of that pure core and classifies the result:
 *
 *   - 'offline'   no serverId — formal path does not engage; the lightweight
 *                 "Record observation" path is the completion surface.
 *   - 'no-domain' the objective maps to no domain (defensive; no catalogue id).
 *   - 'no-task'   synced + resolved, but no handoff-seeded ActTask exists yet.
 *                 The caller surfaces a hint; we DO NOT auto-seed (tier-shell
 *                 objectives carry no ActHandoffPackage, and ActTaskSchema
 *                 requires handoffPackageId).
 *   - 'ready'     synced + resolved + at least one ActTask to verify.
 *
 * Strictly read-only: it never calls createTask/pushOne/setStatus or any other
 * store mutator. Roster population is the responsibility of `useActTaskSync`,
 * called once at the ActTierShell level.
 */

import { useMemo } from 'react';
import {
  resolveActObjectiveId,
  type ActTask,
  type PlanStratumObjective,
} from '@ogden/shared';
import { useActTaskStore } from '../../../store/olos/index.js';

export type ActObjectiveBridgeStatus =
  | 'offline'
  | 'no-domain'
  | 'no-task'
  | 'ready';

export interface ActObjectiveTaskBridge {
  status: ActObjectiveBridgeStatus;
  /** The universal catalogue Act objective id, or null if the objective maps
   *  to no domain. */
  actObjectiveId: string | null;
  /** ActTasks whose objectiveId equals actObjectiveId (empty unless 'ready'). */
  tasks: ActTask[];
}

export function useActObjectiveTaskBridge(
  projectId: string,
  serverId: string | undefined,
  objective: PlanStratumObjective,
): ActObjectiveTaskBridge {
  const actObjectiveId = useMemo(
    () => resolveActObjectiveId(objective),
    [objective],
  );
  // Subscribe to just this project's task map so the hook re-resolves when the
  // roster syncs in. Pure read — no store writes anywhere in this hook.
  const tasksById = useActTaskStore((s) => s.byProject[projectId]);

  return useMemo<ActObjectiveTaskBridge>(() => {
    if (!serverId) return { status: 'offline', actObjectiveId, tasks: [] };
    if (!actObjectiveId)
      return { status: 'no-domain', actObjectiveId: null, tasks: [] };
    const tasks = Object.values(tasksById ?? {}).filter(
      (t) => t.objectiveId === actObjectiveId,
    );
    if (tasks.length === 0)
      return { status: 'no-task', actObjectiveId, tasks: [] };
    return { status: 'ready', actObjectiveId, tasks };
  }, [serverId, actObjectiveId, tasksById]);
}
