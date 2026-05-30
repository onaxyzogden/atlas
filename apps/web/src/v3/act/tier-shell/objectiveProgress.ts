// objectiveProgress.ts
//
// Per-objective execution rollup for the Act tier shell. Computed ONCE in
// ActTierShell (grouping field actions by planObjectiveId in a single pass)
// and shared by the left rail cards and the map markers, so neither recomputes
// and both always agree. Pure — no React, no store reads.

import type { FieldAction } from '@ogden/shared';

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
