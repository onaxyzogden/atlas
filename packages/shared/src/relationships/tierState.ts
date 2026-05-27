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
  PlanTierObjective,
  PlanTierState,
} from '../schemas/plan/planTierObjective.schema.js';
import type { PlanTierObjectiveStatusMap } from './tierObjectiveStatus.js';

export function computeTierState(
  tierId: string,
  objectives: readonly PlanTierObjective[],
  statuses: PlanTierObjectiveStatusMap,
): PlanTierState {
  const tierObjectives = objectives.filter((o) => o.tierId === tierId);
  if (tierObjectives.length === 0) return 'available';

  let hasActive = false;
  let hasAvailable = false;
  let allComplete = true;
  let allLocked = true;

  for (const obj of tierObjectives) {
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
export type PlanTierStateMap = Readonly<Record<string, PlanTierState>>;

/**
 * Roll up all tier statuses in one pass given the per-objective status
 * map produced by `computeAllObjectiveStatuses`.
 */
export function computeAllTierStates(
  tierIds: readonly string[],
  objectives: readonly PlanTierObjective[],
  statuses: PlanTierObjectiveStatusMap,
): PlanTierStateMap {
  const out: Record<string, PlanTierState> = {};
  for (const tierId of tierIds) {
    out[tierId] = computeTierState(tierId, objectives, statuses);
  }
  return out;
}
