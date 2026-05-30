// useSecondaryAddPreview.ts
//
// Pure, read-only preview of what adding a secondary project type would do to
// an active project's resolved objective set (OLOS Plan Navigation Spec v1.1
// secondary-addition flow). The add-secondary modal renders this preview so the
// steward sees the consequences BEFORE committing the change via
// `projectStore.addSecondaryType`.
//
// Everything here is derived from two pure inputs - the project's current type
// record and its checklist progress - run through the same deterministic engines
// the spine itself uses (`resolveProjectObjectives`, `computeAllObjectiveStatuses`,
// `computeObjectivesDelta`, `getActiveTensions`). No writes, no side effects.
//
// The reopened-objective detection is the load-bearing piece: it resolves the
// objective set BEFORE and AFTER the candidate addition, computes statuses for
// each side against the SAME progress map, and reports objectives that were
// `complete` before and are no longer `complete` after (a modifying patch
// injected a fresh required item). This is a pure consequence of re-resolution -
// no objective is force-cleared - so unrelated objectives never reopen.

import { useMemo } from 'react';
import {
  computeAllObjectiveStatuses,
  computeObjectivesDelta,
  getActiveTensions,
  isCompatibleSecondary,
  resolveProjectObjectives,
  type DesignTension,
  type ObjectivesDelta,
  type PlanStratumObjective,
  type ProjectTypeId,
} from '@ogden/shared';
import { useProjectStore } from '../../../store/projectStore.js';
import {
  usePlanStratumProgressStore,
  selectProjectProgress,
  toProgressMap,
} from '../../../store/planStratumStore.js';

export interface SecondaryAddPreview {
  /**
   * Whether the candidate can actually be added. Mirrors the
   * `addSecondaryType` store guards (not the primary, not a duplicate,
   * compatible with the primary, under the 8-secondary ceiling). When
   * `false`, every other field is empty.
   */
  eligible: boolean;
  /** Objective-set diff between the current record and the candidate one. */
  delta: ObjectivesDelta;
  /**
   * Ids of objectives that were `complete` before the addition and are no
   * longer `complete` after it (a modifying patch added a required item).
   */
  reopenedObjectiveIds: string[];
  /** The reopened objectives as full objects, for the reopen modal listing. */
  reopenedObjectives: PlanStratumObjective[];
  /** Design tensions that become active with this addition (not active before). */
  newTensions: DesignTension[];
  /**
   * Objective ids that imply an Observe-stage gap: a brand-new objective whose
   * output is an observation record, or an existing objective that gained an
   * injected item and carries a default overlay bundle (data the steward will
   * need to gather in Observe before the objective can be satisfied).
   */
  observeGapObjectiveIds: string[];
}

const EMPTY_DELTA: ObjectivesDelta = Object.freeze({
  newObjectiveIds: [],
  newObjectives: [],
  objectivesWithNewItems: [],
  injectedItems: [],
  objectivesWithGateAmendments: [],
  gateAmendments: [],
}) as ObjectivesDelta;

const EMPTY_PREVIEW: SecondaryAddPreview = Object.freeze({
  eligible: false,
  delta: EMPTY_DELTA,
  reopenedObjectiveIds: [],
  reopenedObjectives: [],
  newTensions: [],
  observeGapObjectiveIds: [],
}) as SecondaryAddPreview;

/**
 * Compute the secondary-add preview for `candidateSecondaryId` against a
 * project's current type record + checklist progress. Returns a stable empty
 * preview (`eligible: false`) when there is no type record yet or the candidate
 * fails the add guards.
 */
export function useSecondaryAddPreview(
  projectId: string,
  candidateSecondaryId: ProjectTypeId,
): SecondaryAddPreview {
  const record = useProjectStore(
    (s) =>
      s.projects.find((p) => p.id === projectId)?.metadata?.projectTypeRecord,
  );
  const progress = usePlanStratumProgressStore((s) =>
    selectProjectProgress(s, projectId),
  );

  return useMemo(() => {
    if (!record) return EMPTY_PREVIEW;
    const primaryTypeId = record.primaryTypeId;
    const current = record.secondaryTypeIds ?? [];

    const eligible =
      candidateSecondaryId !== primaryTypeId &&
      !current.includes(candidateSecondaryId) &&
      isCompatibleSecondary(candidateSecondaryId, primaryTypeId) &&
      current.length < 8;
    if (!eligible) return EMPTY_PREVIEW;

    const nextSecondaries = [...current, candidateSecondaryId];
    const before = { primaryTypeId, secondaryTypeIds: current };
    const after = { primaryTypeId, secondaryTypeIds: nextSecondaries };

    const delta = computeObjectivesDelta(before, after);

    // Reopened objectives: resolve both sides, compute statuses against the
    // SAME progress map, report complete -> not-complete transitions.
    const progressMap = toProgressMap(progress);
    const beforeObjectives = resolveProjectObjectives(before).objectives;
    const afterObjectives = resolveProjectObjectives(after).objectives;
    const statusBefore = computeAllObjectiveStatuses(beforeObjectives, progressMap);
    const statusAfter = computeAllObjectiveStatuses(afterObjectives, progressMap);

    const afterById = new Map(afterObjectives.map((o) => [o.id, o]));
    const reopenedObjectiveIds: string[] = [];
    for (const o of afterObjectives) {
      if (statusBefore[o.id] === 'complete' && statusAfter[o.id] !== 'complete') {
        reopenedObjectiveIds.push(o.id);
      }
    }
    const reopenedObjectives = reopenedObjectiveIds
      .map((id) => afterById.get(id))
      .filter((o): o is PlanStratumObjective => o !== undefined);

    // Newly-active tensions (active after, not before).
    const tensionsBefore = new Set(
      getActiveTensions(primaryTypeId, current).map((t) => t.id),
    );
    const newTensions = getActiveTensions(primaryTypeId, nextSecondaries).filter(
      (t) => !tensionsBefore.has(t.id),
    );

    // Observe-stage gaps.
    const observeGap = new Set<string>();
    for (const o of delta.newObjectives) {
      if (o.outputKind === 'observation-record') observeGap.add(o.id);
    }
    for (const objId of delta.objectivesWithNewItems) {
      const o = afterById.get(objId);
      if (o && (o.defaultOverlayBundle?.length ?? 0) > 0) observeGap.add(objId);
    }
    const observeGapObjectiveIds = [...observeGap];

    return {
      eligible: true,
      delta,
      reopenedObjectiveIds,
      reopenedObjectives,
      newTensions,
      observeGapObjectiveIds,
    };
  }, [record, progress, candidateSecondaryId]);
}
