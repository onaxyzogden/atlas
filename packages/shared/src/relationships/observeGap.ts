// observeGap.ts
//
// The single source of truth for "does this objective imply an Observe-stage
// data gap" (OLOS Plan Navigation Spec v1.1 section 9). A gap means the
// objective cannot be satisfied until field data is gathered in Observe.
//
// Two callers share this rule so they never drift:
//   - Plan-side add-preview (`useSecondaryAddPreview`) surfaces the gaps a
//     candidate secondary addition WOULD introduce, computed from a delta
//     (the just-injected objectives/items).
//   - Observe-side re-derivation (`useObserveGapObjectives`) surfaces the gaps
//     that PERSISTENTLY exist in a project's resolved objective set, with no
//     delta -- it reads the durable checklist marker instead.
//
// The rule itself: an objective is a gap when its output IS an observation
// record, OR it carries secondary-injected checklist items AND a non-empty
// default overlay bundle (field data the steward must collect first). The
// "carries injected items" signal differs by caller, so it is a parameter:
// a delta supplies it for the preview, the persistent `expandedBySecondaryId`
// stamp supplies it for Observe.

import type { PlanStratumObjective } from '../schemas/plan/planStratumObjective.schema.js';
import type { ObjectivesDelta } from './computeObjectivesDelta.js';

/**
 * Whether the objective's checklist carries at least one item injected by a
 * secondary layer's modifying patch (the resolver stamps `expandedBySecondaryId`
 * on each injected item). This is the durable, delta-free signal that an
 * objective gained secondary-driven work -- used by the Observe re-derivation.
 */
export function objectiveHasInjectedItems(
  objective: PlanStratumObjective,
): boolean {
  return objective.checklist.some((item) => Boolean(item.expandedBySecondaryId));
}

/**
 * Whether an objective implies an Observe-stage data gap. True when its output
 * is an observation record, OR it has injected items AND a non-empty default
 * overlay bundle. `hasInjectedItems` defaults to the persistent checklist
 * marker, so Observe callers can pass just the objective; the add-preview
 * passes its delta-derived signal explicitly to stay behaviour-identical.
 */
export function isObserveGapObjective(
  objective: PlanStratumObjective,
  hasInjectedItems: boolean = objectiveHasInjectedItems(objective),
): boolean {
  if (objective.outputKind === 'observation-record') return true;
  return hasInjectedItems && (objective.defaultOverlayBundle?.length ?? 0) > 0;
}

/**
 * Collect the ids of objectives that imply an Observe-stage gap.
 *
 * - Without `delta`: persistent re-derivation over the resolved set (Observe).
 *   Each objective is judged on its own output kind + durable injected-item
 *   marker + overlay bundle.
 * - With `delta`: restricted to what an addition CHANGED (Plan add-preview).
 *   Preserves the original two-part rule exactly -- a NEW objective whose
 *   output is an observation record, OR an objective that gained items and
 *   carries a non-empty overlay bundle.
 */
export function collectObserveGapObjectives(
  objectives: readonly PlanStratumObjective[],
  delta?: ObjectivesDelta,
): string[] {
  const gap = new Set<string>();
  if (delta) {
    for (const o of delta.newObjectives) {
      if (o.outputKind === 'observation-record') gap.add(o.id);
    }
    const byId = new Map(objectives.map((o) => [o.id, o]));
    for (const objId of delta.objectivesWithNewItems) {
      const o = byId.get(objId);
      if (o && (o.defaultOverlayBundle?.length ?? 0) > 0) gap.add(objId);
    }
    return [...gap];
  }
  for (const o of objectives) {
    if (isObserveGapObjective(o)) gap.add(o.id);
  }
  return [...gap];
}
