/**
 * diffWorkPlan — reconcile a freshly generated instance set against the
 * operator's prior review state without ever clobbering their decisions.
 *
 * The generator re-runs on a rolling horizon (entering the Act work
 * surface / explicit refresh), so this diff is what makes regeneration
 * SAFE under the sovereign-steward covenant:
 *
 *   prior status │ key in next │ outcome
 *   ─────────────┼─────────────┼────────────────────────────────────────
 *   (absent)     │ present     │ insert as a new proposed entry
 *   proposed     │ present     │ overwrite with next (idempotent — an
 *                │             │ unchanged proposal is overwritten with
 *                │             │ identical content)
 *   proposed     │ absent      │ remove (nothing operator-owned is lost)
 *   dismissed    │ present     │ keepDismissed — NEVER resurrected
 *   dismissed    │ absent      │ remove (window has passed; key retires)
 *   confirmed    │ present,    │ untouchedConfirmed — the spine row is
 *                │ same hash   │ operator property; not touched
 *   confirmed    │ present,    │ needsReview 'changed' — surfaced for the
 *                │ diff hash   │ operator to accept-update / keep-mine /
 *                │             │ cancel-work; NEVER auto-applied
 *   confirmed    │ absent      │ needsReview 'orphaned' — the Plan
 *                │             │ decision behind it changed or vanished;
 *                │             │ operator decides the spine row's fate
 *
 * Pure and store-agnostic: the caller (livestockWorkPlanStore.apply-
 * Generation) owns all mutation; this module only classifies.
 */

/**
 * The minimal instance shape the diff reads: it only ever inspects `key`
 * (to match prior entries) and `inputsHash` (to detect a meaningful change).
 * Parameterising over this lets a domain-neutral work-plan store
 * (`createWorkPlanStore`) drive the SAME diff with its own instance type,
 * while the livestock path infers `T = LivestockWorkInstance` unchanged.
 */
export interface WorkPlanInstanceLike {
  key: string;
  inputsHash: string;
}

/** The minimal prior-state view the diff needs (one per known instance key). */
export interface WorkPlanEntry {
  key: string;
  status: 'proposed' | 'confirmed' | 'dismissed';
  /** inputsHash recorded when the entry was last written/confirmed. */
  inputsHash: string;
}

export interface WorkPlanReviewItem<
  T extends WorkPlanInstanceLike = WorkPlanInstanceLike,
> {
  key: string;
  reason: 'changed' | 'orphaned';
  /** The regenerated instance, when one exists (reason 'changed'). */
  next?: T;
}

export interface WorkPlanDiff<
  T extends WorkPlanInstanceLike = WorkPlanInstanceLike,
> {
  /** Brand-new keys → create as proposed. */
  insert: T[];
  /** Existing proposed keys → replace content with the regenerated instance. */
  overwrite: T[];
  /** proposed/dismissed keys no longer generated → delete the entry. */
  remove: string[];
  /** dismissed keys still generated → keep the dismissal untouched. */
  keepDismissed: string[];
  /** confirmed keys regenerated with an identical hash → leave alone. */
  untouchedConfirmed: string[];
  /** confirmed keys that changed or vanished → operator review queue. */
  needsReview: WorkPlanReviewItem<T>[];
}

export function diffWorkPlan<T extends WorkPlanInstanceLike>(
  prior: ReadonlyArray<WorkPlanEntry>,
  next: ReadonlyArray<T>,
): WorkPlanDiff<T> {
  const nextByKey = new Map<string, T>();
  for (const instance of next) nextByKey.set(instance.key, instance);
  const priorByKey = new Map<string, WorkPlanEntry>();
  for (const entry of prior) priorByKey.set(entry.key, entry);

  const diff: WorkPlanDiff<T> = {
    insert: [],
    overwrite: [],
    remove: [],
    keepDismissed: [],
    untouchedConfirmed: [],
    needsReview: [],
  };

  for (const entry of priorByKey.values()) {
    const regenerated = nextByKey.get(entry.key);
    switch (entry.status) {
      case 'proposed':
        if (regenerated) diff.overwrite.push(regenerated);
        else diff.remove.push(entry.key);
        break;
      case 'dismissed':
        if (regenerated) diff.keepDismissed.push(entry.key);
        else diff.remove.push(entry.key);
        break;
      case 'confirmed':
        if (!regenerated) {
          diff.needsReview.push({ key: entry.key, reason: 'orphaned' });
        } else if (regenerated.inputsHash !== entry.inputsHash) {
          diff.needsReview.push({
            key: entry.key,
            reason: 'changed',
            next: regenerated,
          });
        } else {
          diff.untouchedConfirmed.push(entry.key);
        }
        break;
    }
  }

  for (const instance of next) {
    if (!priorByKey.has(instance.key)) diff.insert.push(instance);
  }

  return diff;
}
