// relationships/computeObjectivesDelta.ts
//
// Pure diff between two resolved objective sets, used by the mid-project
// secondary-type addition flow (OLOS Plan Navigation Spec v1.1 9). Given the
// project's type record BEFORE and AFTER an edit (e.g. adding a secondary), it
// re-runs the pure `resolveProjectObjectives` engine for both sides and reports:
//
//   - newObjectiveIds / newObjectives        - objectives that did not exist before
//   - objectivesWithNewItems / injectedItems - existing objectives that gained
//                                              checklist items (secondary patches)
//   - objectivesWithGateAmendments / gateAmendments - existing objectives whose
//                                              completionGate string changed
//
// Like the resolver it wraps, this is pure and deterministic: no Date.now, no
// randomness, no I/O. The same inputs always yield the same delta. Dependencies
// are forwarded to `resolveProjectObjectives` so tests can substitute synthetic
// catalogues for the additive / patch / missing-target paths.

import type {
  PlanDecisionChecklistItem,
  PlanStratumObjective,
} from '../schemas/plan/planStratumObjective.schema.js';
import {
  resolveProjectObjectives,
  type ResolveProjectObjectivesDeps,
  type ResolveProjectObjectivesInput,
} from './resolveProjectObjectives.js';

/** A checklist item present in the AFTER objective but absent BEFORE. */
export interface InjectedItemDelta {
  objectiveId: string;
  item: PlanDecisionChecklistItem;
}

/** A completionGate string that differs between BEFORE and AFTER. */
export interface GateAmendmentDelta {
  objectiveId: string;
  before: string | undefined;
  after: string | undefined;
}

export interface ObjectivesDelta {
  /** Ids of objectives present AFTER but not BEFORE (new additive objectives). */
  newObjectiveIds: string[];
  /** The resolved objective objects for `newObjectiveIds`, in AFTER order. */
  newObjectives: PlanStratumObjective[];
  /** Ids of pre-existing objectives that gained one or more checklist items. */
  objectivesWithNewItems: string[];
  /** Every newly-injected checklist item, tagged with its host objective id. */
  injectedItems: InjectedItemDelta[];
  /** Ids of pre-existing objectives whose completionGate string changed. */
  objectivesWithGateAmendments: string[];
  /** Before/after completionGate for each amended objective. */
  gateAmendments: GateAmendmentDelta[];
}

/**
 * Diff the resolved objective sets for two type records. Both sides are
 * resolved by the same pure engine, so the delta reflects only the change in
 * inputs (typically one added secondary). See file header for the contract.
 */
export function computeObjectivesDelta(
  before: ResolveProjectObjectivesInput,
  after: ResolveProjectObjectivesInput,
  deps: ResolveProjectObjectivesDeps = {},
): ObjectivesDelta {
  const resolvedBefore = resolveProjectObjectives(before, deps);
  const resolvedAfter = resolveProjectObjectives(after, deps);

  const beforeById = new Map<string, PlanStratumObjective>(
    resolvedBefore.objectives.map((o) => [o.id, o]),
  );

  const newObjectiveIds: string[] = [];
  const newObjectives: PlanStratumObjective[] = [];
  const objectivesWithNewItems: string[] = [];
  const injectedItems: InjectedItemDelta[] = [];
  const objectivesWithGateAmendments: string[] = [];
  const gateAmendments: GateAmendmentDelta[] = [];

  for (const objAfter of resolvedAfter.objectives) {
    const objBefore = beforeById.get(objAfter.id);

    // Wholly new objective (an additive secondary objective).
    if (!objBefore) {
      newObjectiveIds.push(objAfter.id);
      newObjectives.push(objAfter);
      continue;
    }

    // Pre-existing objective: did it gain checklist items? Diff by item id.
    const beforeItemIds = new Set(objBefore.checklist.map((it) => it.id));
    const freshItems = objAfter.checklist.filter(
      (it) => !beforeItemIds.has(it.id),
    );
    if (freshItems.length > 0) {
      objectivesWithNewItems.push(objAfter.id);
      for (const item of freshItems) {
        injectedItems.push({ objectiveId: objAfter.id, item });
      }
    }

    // Did its completion gate change? Patches concatenate, so any string
    // inequality (including undefined -> defined) is a gate amendment.
    const gateBefore = objBefore.completionGate;
    const gateAfter = objAfter.completionGate;
    if (gateBefore !== gateAfter) {
      objectivesWithGateAmendments.push(objAfter.id);
      gateAmendments.push({
        objectiveId: objAfter.id,
        before: gateBefore,
        after: gateAfter,
      });
    }
  }

  return {
    newObjectiveIds,
    newObjectives,
    objectivesWithNewItems,
    injectedItems,
    objectivesWithGateAmendments,
    gateAmendments,
  };
}
