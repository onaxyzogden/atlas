// tierState.ts
//
// Pure aggregator that rolls per-objective statuses up to a tier-level
// state pill, per OLOS Plan Navigation Spec v1 §3.2:
//
//   complete   — every objective in the tier is `complete`.
//   active     — at least one objective is `active`.
//   available  — at least one objective is `available` (none active).
//   locked     — every objective is `locked`.
//
// Empty tiers (no seeded objectives) default to `available` — the tier
// shell still renders so the steward can see the placeholder.

import type {
  PlanStratumObjective,
  PlanStratumState,
} from '../schemas/plan/planTierObjective.schema.js';
import type { PlanStratumObjectiveStatusMap } from './tierObjectiveStatus.js';

export function computeStratumState(
  stratumId: string,
  objectives: readonly PlanStratumObjective[],
  statuses: PlanStratumObjectiveStatusMap,
): PlanStratumState {
  const stratumObjectives = objectives.filter((o) => o.stratumId === stratumId);
  if (stratumObjectives.length === 0) return 'available';

  let hasActive = false;
  let hasAvailable = false;
  let allComplete = true;
  let allLocked = true;

  for (const obj of stratumObjectives) {
    const s = statuses[obj.id] ?? 'locked';
    if (s !== 'complete') allComplete = false;
    if (s !== 'locked') allLocked = false;
    if (s === 'active') hasActive = true;
    if (s === 'available') hasAvailable = true;
  }

  if (allComplete) return 'complete';
  if (hasActive) return 'active';
  if (hasAvailable) return 'available';
  if (allLocked) return 'locked';
  // Mixed bag with neither active nor available — conservative.
  return 'locked';
}

/** Tier-state snapshot keyed by tier id. */
export type PlanStratumStateMap = Readonly<Record<string, PlanStratumState>>;

/**
 * Roll up all tier statuses in one pass given the per-objective status
 * map produced by `computeAllObjectiveStatuses`.
 */
export function computeAllStratumStates(
  stratumIds: readonly string[],
  objectives: readonly PlanStratumObjective[],
  statuses: PlanStratumObjectiveStatusMap,
): PlanStratumStateMap {
  const out: Record<string, PlanStratumState> = {};
  for (const stratumId of stratumIds) {
    out[stratumId] = computeStratumState(stratumId, objectives, statuses);
  }
  return out;
}
