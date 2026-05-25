/**
 * objectiveStatus — pure helpers for the unified objective card's progress
 * header. Stage-generic: Plan, Observe (and later Act) all derive a coarse
 * status from the same checklist-completion percentage, so the progress bar,
 * "X% ready" readout, and status pill stay consistent across stages.
 */

export type ObjectiveStatus = 'not-started' | 'in-progress' | 'complete';

/** Human-readable label for each status, used by the status pill. */
export const OBJECTIVE_STATUS_LABEL: Record<ObjectiveStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  complete: 'Complete',
};

/**
 * Coarse status from a 0–100 completion percentage.
 * 0 → not-started · 100 → complete · anything between → in-progress.
 */
export function statusFromPct(pct: number): ObjectiveStatus {
  if (pct >= 100) return 'complete';
  if (pct <= 0) return 'not-started';
  return 'in-progress';
}

export interface ObjectiveProgress {
  /** How many checklist steps are marked done (clamped to [0, total]). */
  verified: number;
  /** Total checklist steps. */
  total: number;
  /** Rounded completion percentage in [0, 100]. */
  pct: number;
}

/**
 * Derive progress from the set of checked step indices and the total step
 * count. Indices outside [0, total) are ignored so stale persisted checks
 * (e.g. after a guidance list shrinks) never push the bar past 100%.
 */
export function progressFromChecks(
  checked: readonly number[],
  total: number,
): ObjectiveProgress {
  if (total <= 0) return { verified: 0, total: 0, pct: 0 };
  const inRange = new Set(
    checked.filter((i) => Number.isInteger(i) && i >= 0 && i < total),
  );
  const verified = inRange.size;
  const pct = Math.round((verified / total) * 100);
  return { verified, total, pct };
}
