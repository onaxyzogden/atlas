// stratumObjectiveStatus.ts
//
// Pure status engine for Plan Stratum Objectives. Status flows through a
// 4-state machine driven by (a) prerequisite satisfaction and
// (b) checklist completion. The engine is dependency-free — no I/O,
// no store access — so the same helpers can be used in apps/web,
// in tests, and from a future server-side validator.
//
// State semantics (OLOS Plan Navigation Spec v1 §3.4):
//   locked     — at least one prereq objective is not `complete`.
//   available  — all prereqs satisfied, no required checklist items
//                checked yet.
//   active     — all prereqs satisfied, some (but not all required)
//                checklist items checked.
//   complete   — every required checklist item is checked.

import type {
  PlanChecklistProgress,
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '../schemas/plan/planStratumObjective.schema.js';

/** Snapshot of computed objective statuses keyed by objective id. */
export type PlanStratumObjectiveStatusMap = Readonly<
  Record<string, PlanStratumObjectiveStatus>
>;

/**
 * Compute the status for a single stratum objective given the steward's
 * checklist progress and the already-known statuses of its prerequisite
 * objectives.
 *
 * The function is total and deterministic — undefined prereq statuses are
 * treated as `locked` (conservative default).
 */
export function computeObjectiveStatus(
  objective: PlanStratumObjective,
  progress: PlanChecklistProgress,
  prerequisiteStatuses: PlanStratumObjectiveStatusMap,
): PlanStratumObjectiveStatus {
  const prereqsSatisfied = objective.prerequisiteObjectiveIds.every(
    (prereqId) => prerequisiteStatuses[prereqId] === 'complete',
  );
  if (!prereqsSatisfied) {
    return 'locked';
  }

  const requiredItems = objective.checklist.filter((i) => !i.optional);
  if (requiredItems.length === 0) {
    // No required items: the objective is `complete` as soon as
    // prereqs are met. This avoids stranding zero-checklist
    // objectives in `available` forever.
    return 'complete';
  }

  const checkedCount = requiredItems.filter((i) => progress[i.id] === true)
    .length;
  if (checkedCount === 0) {
    return 'available';
  }
  if (checkedCount < requiredItems.length) {
    return 'active';
  }
  return 'complete';
}

/**
 * Compute statuses for every objective in `objectives`. Resolves prereqs
 * in topological order — each objective is computed only after all of its
 * dependencies have a status.
 *
 * If a cycle is detected the remaining objectives default to `locked`
 * (the conservative outcome — a real cycle is a seed-data bug that the
 * Vitest suite catches).
 */
export function computeAllObjectiveStatuses(
  objectives: readonly PlanStratumObjective[],
  progress: PlanChecklistProgress,
): PlanStratumObjectiveStatusMap {
  const result: Record<string, PlanStratumObjectiveStatus> = {};
  const remaining = new Set(objectives.map((o) => o.id));
  const byId = new Map(objectives.map((o) => [o.id, o]));

  // Bounded loop — at most one pass per objective.
  for (let i = 0; i < objectives.length && remaining.size > 0; i += 1) {
    let progressedThisRound = false;
    for (const id of [...remaining]) {
      const obj = byId.get(id)!;
      const allResolved = obj.prerequisiteObjectiveIds.every((p) =>
        Object.prototype.hasOwnProperty.call(result, p),
      );
      if (!allResolved) continue;
      result[id] = computeObjectiveStatus(obj, progress, result);
      remaining.delete(id);
      progressedThisRound = true;
    }
    if (!progressedThisRound) break;
  }

  // Anything still unresolved is part of a cycle — fail conservative.
  for (const id of remaining) {
    result[id] = 'locked';
  }
  return result;
}
