// objectiveProgress.ts
//
// Per-objective execution rollup for the Act tier shell. Computed ONCE in
// ActTierShell (grouping field actions by planObjectiveId in a single pass)
// and shared by the left rail cards and the map markers, so neither recomputes
// and both always agree. Pure — no React, no store reads.

import type { FieldAction, PlanStratumObjective } from '@ogden/shared';

/** Per-objective execution rollup the rail + markers render. */
export interface ObjectiveProgress {
  total: number;
  verified: number;
  /** complete = all verified (total>0); active = any in flight; else available. */
  state: 'complete' | 'active' | 'available';
}

const IN_FLIGHT = new Set<FieldAction['status']>([
  'in_progress',
  'submitted',
  'diverged',
  'blocked',
]);

function deriveProgress(actions: readonly FieldAction[]): ObjectiveProgress {
  let verified = 0;
  let inFlight = 0;
  for (const a of actions) {
    if (a.status === 'verified') verified += 1;
    else if (IN_FLIGHT.has(a.status)) inFlight += 1;
  }
  const total = actions.length;
  const state: ObjectiveProgress['state'] =
    total === 0
      ? 'available'
      : inFlight > 0
        ? 'active'
        : verified === total
          ? 'complete'
          : 'available';
  return { total, verified, state };
}

/**
 * Group field actions by objective in one pass, then derive each objective's
 * progress. Objectives with no actions map to a zeroed `available` rollup so
 * every objective has an entry.
 */
export function computeObjectiveProgress(
  objectives: ReadonlyArray<{ id: string }>,
  actions: readonly FieldAction[],
): Record<string, ObjectiveProgress> {
  const grouped = new Map<string, FieldAction[]>();
  for (const a of actions) {
    const bucket = grouped.get(a.planObjectiveId);
    if (bucket) bucket.push(a);
    else grouped.set(a.planObjectiveId, [a]);
  }
  const out: Record<string, ObjectiveProgress> = {};
  for (const objective of objectives) {
    out[objective.id] = deriveProgress(grouped.get(objective.id) ?? []);
  }
  return out;
}

/**
 * Checklist-based rollup for the LEFT objective rail. Counts completed
 * checklist items (from planStratumStore) against each objective's
 * `checklist.length` -- the same signal the right-rail execution panel shows
 * ("N/M steps"). This keeps the rail and the panel in agreement and stops the
 * rail reporting "No tasks yet" for objectives that have a populated checklist
 * but no logged field actions. (`verified` carries the done-count so the
 * shared ObjectiveProgress shape is reused; the map markers keep the separate
 * field-action progress from computeObjectiveProgress.)
 */
export function computeChecklistProgress(
  objectives: readonly PlanStratumObjective[],
  completedByObjective: Readonly<Record<string, readonly string[]>>,
): Record<string, ObjectiveProgress> {
  const out: Record<string, ObjectiveProgress> = {};
  for (const objective of objectives) {
    const completed = completedByObjective[objective.id] ?? [];
    const total = objective.checklist.length;
    let done = 0;
    for (const item of objective.checklist) {
      if (completed.includes(item.id)) done += 1;
    }
    const state: ObjectiveProgress['state'] =
      total > 0 && done === total
        ? 'complete'
        : done > 0
          ? 'active'
          : 'available';
    out[objective.id] = { total, verified: done, state };
  }
  return out;
}
