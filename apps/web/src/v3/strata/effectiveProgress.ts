/**
 * effectiveProgress — the pure, store-free core of the "effective checklist
 * progress" single source of truth: a project's stored planStratumStore
 * progress UNIONED with the wizard-derived Stratum-1 completion
 * (`visionProfileToChecklist.ts`).
 *
 * This file imports NOTHING from the Zustand stores so it can be unit-tested
 * and called inside loops (batch readers iterate many projects). The React
 * hook wrapper lives in `useEffectiveChecklistProgress.ts`.
 *
 * Two consumer shapes are returned so nothing recomputes downstream:
 *   - `flatMap`     : Record<itemId, boolean>          (computeAllObjectiveStatuses)
 *   - `byObjective` : Record<objectiveId, string[]>    (computeChecklistProgress)
 */

import type {
  PlanStratumObjective,
  VisionProfile,
  ProjectMetadata,
} from '@ogden/shared';
import {
  deriveStratum1EvidenceMap,
  deriveStratum1StewardshipMap,
  mergeDerivedIntoProgress,
} from './visionProfileToChecklist.js';
import { resolveAnswerSpec } from './resolveAnswerSpec.js';

type ProjectTeam = NonNullable<ProjectMetadata['team']>;

export interface EffectiveChecklistProgress {
  /** Stored ∪ wizard-derived, per objective (only checklist items kept). */
  byObjective: Readonly<Record<string, readonly string[]>>;
  /** Stored ∪ wizard-derived, flat item-id → done. */
  flatMap: Readonly<Record<string, boolean>>;
}

/**
 * Flatten the nested `objectiveId -> itemIds` progress shape into the flat
 * `Record<itemId, boolean>` the status engine consumes. Item ids are globally
 * unique across catalogues, so the collapse is lossless. (Mirrors
 * planStratumStore.toProgressMap, inlined here to keep this module store-free.)
 */
function flattenProgress(
  byObjective: Readonly<Record<string, readonly string[]>>,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const itemIds of Object.values(byObjective)) {
    for (const id of itemIds) out[id] = true;
  }
  return out;
}

/**
 * Pure, React-free composition. Unions the stored per-objective progress with
 * the wizard-derived S1 completion and returns both consumer shapes.
 *
 * `byObjective` is reconstructed from each objective's own checklist
 * intersected with the merged flat map, so it always agrees with `flatMap`
 * (and drops any stale stored id that is no longer a checklist item — which
 * the downstream rollups ignore anyway).
 */
export function computeEffectiveProgress(
  storedByObjective: Readonly<Record<string, readonly string[]>>,
  visionProfile: VisionProfile | null | undefined,
  team: ProjectTeam | null | undefined,
  objectives: readonly PlanStratumObjective[],
  metadata?: ProjectMetadata | null,
  /**
   * Item ids a livestock-formula binding has computed a usable result for
   * (see `useObjectiveFormulaProgress.collectFormulaSatisfiedItemIds`). This
   * module stays PURE — the caller does all store reads and hands in a plain
   * Set, exactly like `metadata` for the answerSpec path. A no-op when absent.
   */
  formulaSatisfiedItemIds?: ReadonlySet<string> | null,
): EffectiveChecklistProgress {
  const visionMap = deriveStratum1EvidenceMap(visionProfile);
  const stewardshipMap = deriveStratum1StewardshipMap(team);
  const derivedMap =
    Object.keys(stewardshipMap).length === 0
      ? visionMap
      : { ...visionMap, ...stewardshipMap };

  // Fresh mutable copy so the answerSpec union below can write into it (the
  // merge helper returns a Readonly map and may alias its input).
  const flatMap: Record<string, boolean> = {
    ...mergeDerivedIntoProgress(flattenProgress(storedByObjective), derivedMap),
  };

  // Data-driven auto-satisfy: any checklist item carrying an `answerSpec` whose
  // source data (wizard / vision / team) is already filled in is unioned into
  // the flat map — the generalisation of the two hand-coded S1 derivations
  // above. Sourced from the full `ProjectMetadata` (visionProfile + team +
  // projectTypeRecord); a no-op when metadata is absent (e.g. batch callers
  // that don't pass it), so nothing flips without source data.
  if (metadata) {
    for (const objective of objectives) {
      for (const item of objective.checklist) {
        if (!item.answerSpec || flatMap[item.id]) continue;
        if (resolveAnswerSpec(metadata, item.answerSpec).isAnswered) {
          flatMap[item.id] = true;
        }
      }
    }
  }

  // Formula auto-satisfy: a checklist item whose `formulaBinding` has produced
  // a usable result (predicate evaluated by the caller, passed in as a Set) is
  // unioned in exactly like an answerSpec. Pure here — no store read.
  if (formulaSatisfiedItemIds && formulaSatisfiedItemIds.size > 0) {
    for (const id of formulaSatisfiedItemIds) flatMap[id] = true;
  }

  const byObjective: Record<string, readonly string[]> = {};
  for (const objective of objectives) {
    const completed: string[] = [];
    for (const item of objective.checklist) {
      if (flatMap[item.id]) completed.push(item.id);
    }
    byObjective[objective.id] = completed;
  }

  return { byObjective, flatMap };
}
