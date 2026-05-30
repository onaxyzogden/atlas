// actStratumExecution.ts
//
// Pure aggregator that rolls FieldAction *execution* status up to a
// stratum-level state pill for the Act tier shell. This is the Act-stage
// counterpart to `stratumState.ts` (which serves Plan) and intentionally
// uses DIFFERENT semantics:
//
//   complete   — the stratum has at least one field action and EVERY one is
//                `verified`.
//   active     — at least one field action is in flight
//                (`in_progress | submitted | diverged | blocked`).
//   available  — anything else, INCLUDING an empty stratum or one whose work
//                is only `not_started`.
//
// Unlike Plan's `computeStratumState`, this NEVER returns `locked`: Act is the
// execution stage and every stratum is reachable — there is no prerequisite
// gate that hides a stratum from the steward. The spine must always let the
// operator step into any stratum to log work against it.
//
// Dependency-free (no I/O, no stores) so the same code runs in apps/web, in
// Vitest, and from a future server-side rollup.

import type { FieldActionStatus } from '../schemas/fieldAction/fieldAction.schema.js';
import type { PlanStratumState } from '../schemas/plan/planStratumObjective.schema.js';

/** Per-stratum execution tally produced in a single pass over field actions. */
export interface ActStratumCounts {
  total: number;
  verified: number;
  /** in_progress | submitted | diverged | blocked — work that has begun. */
  inFlight: number;
  /** not_started — claimed against the stratum but not yet picked up. */
  notStarted: number;
}

/** Execution counts keyed by stratum id. */
export type ActStratumCountsMap = Readonly<Record<string, ActStratumCounts>>;

const IN_FLIGHT: ReadonlySet<FieldActionStatus> = new Set<FieldActionStatus>([
  'in_progress',
  'submitted',
  'diverged',
  'blocked',
]);

function emptyCounts(): ActStratumCounts {
  return { total: 0, verified: 0, inFlight: 0, notStarted: 0 };
}

/**
 * Tally field actions per stratum in one pass. Reads only `{ stratumId,
 * status }` so callers can pass the full denormalised FieldAction or any
 * structural subset. Actions with no `stratumId` are skipped (they belong to
 * no stratum bucket on the spine).
 */
export function computeActStratumExecution(
  actions: ReadonlyArray<{ stratumId?: string | null; status: FieldActionStatus }>,
): ActStratumCountsMap {
  const out: Record<string, ActStratumCounts> = {};
  for (const action of actions) {
    const stratumId = action.stratumId;
    if (!stratumId) continue;
    const bucket = (out[stratumId] ??= emptyCounts());
    bucket.total += 1;
    if (action.status === 'verified') bucket.verified += 1;
    else if (action.status === 'not_started') bucket.notStarted += 1;
    else if (IN_FLIGHT.has(action.status)) bucket.inFlight += 1;
  }
  return out;
}

/**
 * Map a single stratum's counts to an Act-stage state pill. See the file
 * header for the semantics. Never returns `locked`.
 */
export function actStratumStateFromCounts(
  counts: ActStratumCounts | undefined,
): PlanStratumState {
  if (!counts || counts.total === 0) return 'available';
  if (counts.inFlight > 0) return 'active';
  if (counts.verified === counts.total) return 'complete';
  return 'available';
}

/** Act-stage stratum-state snapshot keyed by stratum id. */
export type ActStratumStateMap = Readonly<Record<string, PlanStratumState>>;

/**
 * Roll up every stratum's Act execution state in one pass. Strata with no
 * field actions still appear in the result as `available` so the spine
 * renders the full S1-S7 set.
 */
export function computeAllActStratumStates(
  stratumIds: readonly string[],
  actions: ReadonlyArray<{ stratumId?: string | null; status: FieldActionStatus }>,
): ActStratumStateMap {
  const counts = computeActStratumExecution(actions);
  const out: Record<string, PlanStratumState> = {};
  for (const stratumId of stratumIds) {
    out[stratumId] = actStratumStateFromCounts(counts[stratumId]);
  }
  return out;
}
