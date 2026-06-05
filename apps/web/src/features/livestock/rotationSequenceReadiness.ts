/**
 * B3.x — Rotation-sequence promotion-criteria evaluators.
 *
 * Two pure read-only roll-ups over the WorkItem spine that let the
 * `livestock-enterprise` goal-tree subgoal gate on actual spine state:
 *
 *  - `computeRotationSpinePresencePct` — hygiene metric. % of the moves
 *    a fresh `seedRotationSequenceWorkItems` projection would emit that
 *    are currently present (by `generatedFromRotationMove`) on the
 *    spine. Drift between paddocks/plan and the spine surfaces as < 100%.
 *  - `computeRotationMovesCompletedPct` — execution metric. % of
 *    rotation-sequence rows whose `scheduledEnd` is past-due that carry
 *    `status:'done'`. Surfaces the gap between projected schedule and
 *    actual field execution.
 *
 * Both return 100 when the relevant denominator is zero (nothing to be
 * missing / nothing yet due, which is the "everything that could matter
 * is fine" baseline). Both are pure reads — they call the existing
 * `seedRotationSequenceWorkItems` projector and `useWorkItemStore`
 * read selector and never write. The D4 invariant (status writes route
 * through `fulfilWorkItem`) is preserved.
 *
 * No riba/gharar/CSRA/salam/investor/financing/cost-of-capital/payback
 * /ROI semantics — agronomic-only.
 */

import type { WorkItem } from '@ogden/shared';
import type { Paddock } from '../../store/livestockStore.js';
import type { BuildPhase } from '../../store/phaseStore.js';
import { useWorkItemStore } from '../../store/workItemStore.js';
import type { RotationPlan } from './rotationSequenceMath.js';
import { seedRotationSequenceWorkItems } from './rotationSequenceSpineSync.js';

/**
 * Pure: % of projected rotation moves currently present on the spine.
 *
 * `100` when the plan would emit zero moves (no plan, no paddocks for
 * project, or empty cells) — there is nothing that could be missing.
 *
 * Counts only `source:'rotation-sequence'` rows for the project; both
 * overridden and non-overridden rows count as "present" (an overridden
 * row still represents the steward acknowledging that move exists, just
 * with hand-edited fields).
 */
export function computeRotationSpinePresencePct(args: {
  projectId: string;
  paddocks: Paddock[];
  plan: RotationPlan | null;
  declaredPhases: BuildPhase[];
  items?: WorkItem[];
}): number {
  const expected = seedRotationSequenceWorkItems({
    projectId: args.projectId,
    paddocks: args.paddocks,
    plan: args.plan,
    declaredPhases: args.declaredPhases,
  });
  const expectedProvenances = new Set<string>();
  for (const w of expected) {
    if (w.generatedFromRotationMove) {
      expectedProvenances.add(w.generatedFromRotationMove);
    }
  }
  if (expectedProvenances.size === 0) return 100;

  const items = args.items ?? useWorkItemStore.getState().items;
  const presentProvenances = new Set<string>();
  for (const w of items) {
    if (w.projectId !== args.projectId) continue;
    if (w.source !== 'rotation-sequence') continue;
    if (!w.generatedFromRotationMove) continue;
    if (expectedProvenances.has(w.generatedFromRotationMove)) {
      presentProvenances.add(w.generatedFromRotationMove);
    }
  }
  return (100 * presentProvenances.size) / expectedProvenances.size;
}

/**
 * Pure: % of past-due rotation moves on the spine marked completed.
 *
 * "Past-due" means `scheduledEnd < todayISO` (yyyy-mm-dd lexicographic
 * compare is equivalent to date compare for this format). Returns
 * `100` when no rows are past-due — nothing yet due, nothing to be
 * late on.
 *
 * Overridden rotation-sequence rows are included in the denominator —
 * the steward overriding a row does not change the fact that a move
 * was scheduled and either did or didn't happen.
 */
export function computeRotationMovesCompletedPct(args: {
  projectId: string;
  todayISO: string;
  items?: WorkItem[];
}): number {
  const items = args.items ?? useWorkItemStore.getState().items;
  let pastDue = 0;
  let done = 0;
  for (const w of items) {
    if (w.projectId !== args.projectId) continue;
    if (w.source !== 'rotation-sequence') continue;
    const end = w.scheduledEnd;
    if (typeof end !== 'string' || !end) continue;
    if (end >= args.todayISO) continue;
    pastDue += 1;
    if (w.status === 'done') done += 1;
  }
  if (pastDue === 0) return 100;
  return (100 * done) / pastDue;
}
