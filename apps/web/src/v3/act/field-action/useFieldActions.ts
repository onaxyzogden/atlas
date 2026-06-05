/**
 * useFieldActions — composed read hook for View B.
 *
 * Pulls field actions out of `useFieldActionStore`, applies the active
 * filter (objective / status / assignee / tier), computes the "Next Up"
 * winner per spec §4.3 priority order, and groups the rest by the
 * sections that View B renders (active / ready-to-start / blocked +
 * diverged / completed-today).
 *
 * The filter lives in this hook (session-scoped, not persisted) so it
 * resets between sessions — same shape as the Plan TierShell filter.
 */

import { useMemo, useState } from 'react';
import type { FieldAction, FieldActionStatus } from '@ogden/shared';
import {
  selectFieldActionsForProject,
  useFieldActionStore,
} from '../../../store/fieldActionStore.js';

export interface FieldActionFilter {
  objectiveIds: ReadonlyArray<string>;
  statuses: ReadonlyArray<FieldActionStatus>;
  assignees: ReadonlyArray<string>;
  stratumIds: ReadonlyArray<string>;
}

const EMPTY_FILTER: FieldActionFilter = {
  objectiveIds: [],
  statuses: [],
  assignees: [],
  stratumIds: [],
};

export interface FieldActionsByObjective {
  planObjectiveId: string;
  stratumId: string;
  tasks: FieldAction[];
}

export interface UseFieldActionsResult {
  /** All actions for the project after filter is applied. */
  tasks: FieldAction[];
  /** Single highest-priority action per spec §4.3 — undefined when none qualifies. */
  nextUp: FieldAction | undefined;
  /** in_progress + submitted-pending-verification, grouped by parent objective. */
  active: FieldActionsByObjective[];
  /** not_started actions, grouped by parent objective. */
  readyToStart: FieldActionsByObjective[];
  /** blocked + diverged, flat list. */
  blockedDiverged: FieldAction[];
  /** verified today (rolling 24h), flat list. */
  completedToday: FieldAction[];
  filter: FieldActionFilter;
  setFilter: (next: FieldActionFilter) => void;
  /** Quickest way to clear the filter back to "no filter". */
  clearFilter: () => void;
  /** True when any axis of the filter is non-empty. */
  hasFilter: boolean;
}

function groupByObjective(tasks: FieldAction[]): FieldActionsByObjective[] {
  const byKey = new Map<string, FieldActionsByObjective>();
  for (const t of tasks) {
    const key = t.planObjectiveId;
    const bucket = byKey.get(key);
    if (bucket) {
      bucket.tasks.push(t);
    } else {
      byKey.set(key, {
        planObjectiveId: t.planObjectiveId,
        stratumId: t.stratumId,
        tasks: [t],
      });
    }
  }
  // Order by tier id then objective id so the dashboard reads tier-foundation-first.
  return Array.from(byKey.values()).sort((a, b) => {
    const tierCmp = a.stratumId.localeCompare(b.stratumId);
    if (tierCmp !== 0) return tierCmp;
    return a.planObjectiveId.localeCompare(b.planObjectiveId);
  });
}

function pickNextUp(tasks: FieldAction[]): FieldAction | undefined {
  // Priority order per spec §4.3:
  //   1. in_progress  (any)
  //   2. submitted    (review mode only — pending verification)
  //   3. not_started  (lowest active tier)
  const inProgress = tasks.find((t) => t.status === 'in_progress');
  if (inProgress) return inProgress;
  const pendingReview = tasks.find(
    (t) => t.status === 'submitted' && t.verificationMode === 'review',
  );
  if (pendingReview) return pendingReview;
  const ready = tasks
    .filter((t) => t.status === 'not_started')
    .slice()
    .sort((a, b) => a.stratumId.localeCompare(b.stratumId));
  return ready[0];
}

function applyFilter(
  tasks: ReadonlyArray<FieldAction>,
  f: FieldActionFilter,
): FieldAction[] {
  return tasks.filter((t) => {
    if (f.objectiveIds.length > 0 && !f.objectiveIds.includes(t.planObjectiveId)) {
      return false;
    }
    if (f.statuses.length > 0 && !f.statuses.includes(t.status)) {
      return false;
    }
    if (f.stratumIds.length > 0 && !f.stratumIds.includes(t.stratumId)) {
      return false;
    }
    if (f.assignees.length > 0) {
      const hit = (t.assignedTo ?? []).some((a) => f.assignees.includes(a));
      if (!hit) return false;
    }
    return true;
  });
}

function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return false;
  // Rolling 24h instead of calendar-day so a steward who finishes a task
  // at 11:55pm still sees it "today" five minutes later.
  return Date.now() - ts < 24 * 60 * 60 * 1000;
}

export function useFieldActions(projectId: string | null): UseFieldActionsResult {
  const tasksRaw = useFieldActionStore((s) =>
    projectId ? selectFieldActionsForProject(s, projectId) : ([] as readonly FieldAction[]),
  );
  const [filter, setFilter] = useState<FieldActionFilter>(EMPTY_FILTER);

  return useMemo(() => {
    const tasks = applyFilter(tasksRaw, filter);
    const nextUp = pickNextUp(tasks);
    const activeTasks = tasks.filter(
      (t) =>
        t.status === 'in_progress' ||
        (t.status === 'submitted' && t.verificationMode === 'review'),
    );
    const readyTasks = tasks.filter((t) => t.status === 'not_started');
    const blockedDivergedTasks = tasks.filter(
      (t) => t.status === 'blocked' || t.status === 'diverged',
    );
    const completedTodayTasks = tasks.filter(
      (t) => t.status === 'verified' && isToday(t.doneAt),
    );
    const hasFilter =
      filter.objectiveIds.length +
        filter.statuses.length +
        filter.assignees.length +
        filter.stratumIds.length >
      0;
    return {
      tasks,
      nextUp,
      active: groupByObjective(activeTasks),
      readyToStart: groupByObjective(readyTasks),
      blockedDiverged: blockedDivergedTasks,
      completedToday: completedTodayTasks,
      filter,
      setFilter,
      clearFilter: () => setFilter(EMPTY_FILTER),
      hasFilter,
    };
  }, [tasksRaw, filter]);
}
