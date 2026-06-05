// useSecondaryRemovePreview.ts
//
// Pure, read-only preview of what removing a secondary project type would do to
// an active project (OLOS Plan Navigation Spec v1.1, spec section 8.3). The
// manage-types / remove flow renders this preview so the steward sees -- BEFORE
// committing via `projectStore.removeSecondaryType` -- whether removal is
// permitted and, if not, exactly which objectives are blocking it.
//
// Removal is permitted only when none of the secondary's delta objectives (its
// additive objectives + any objective it injected items into) are currently
// `active`, `complete`, or `deferred`. This mirrors the store guard so the UI
// and the action agree. Everything here is derived from two pure inputs -- the
// project's current type record and its checklist progress (+ deferred set) --
// run through the same deterministic engines the spine uses
// (`resolveProjectObjectives`, `computeAllObjectiveStatuses`,
// `computeObjectivesDelta`). No writes, no side effects.

import { useMemo } from 'react';
import {
  computeAllObjectiveStatuses,
  computeObjectivesDelta,
  resolveProjectObjectives,
  type PlanStratumObjective,
  type PlanStratumObjectiveStatus,
  type ProjectTypeId,
} from '@ogden/shared';
import { useProjectStore } from '../../../store/projectStore.js';
import {
  usePlanStratumProgressStore,
  selectProjectProgress,
  selectDeferredObjectives,
  toProgressMap,
  toDeferredSet,
} from '../../../store/planStratumStore.js';

/** One blocking objective: the objective object + its current (blocking) status. */
export interface BlockingObjective {
  objective: PlanStratumObjective;
  status: PlanStratumObjectiveStatus;
}

export interface SecondaryRemovePreview {
  /** Whether the secondary is currently present on the project. */
  present: boolean;
  /**
   * Whether removal is permitted right now (present AND no blocking delta
   * objective). When `false` and `present`, `blockingObjectives` is non-empty.
   */
  removable: boolean;
  /**
   * Delta objectives whose current status (`active` | `complete` | `deferred`)
   * blocks removal. The blocked-removal modal names these and offers to mark
   * them Deferred instead.
   */
  blockingObjectives: BlockingObjective[];
  /** Ids of additive objectives that removal would delete entirely. */
  removedObjectiveIds: string[];
  /** Ids of injected checklist items that removal would drop from host objectives. */
  lostItemIds: string[];
}

const EMPTY_PREVIEW: SecondaryRemovePreview = Object.freeze({
  present: false,
  removable: false,
  blockingObjectives: [],
  removedObjectiveIds: [],
  lostItemIds: [],
}) as SecondaryRemovePreview;

const BLOCKING_STATUSES: ReadonlySet<PlanStratumObjectiveStatus> = new Set([
  'active',
  'complete',
  'deferred',
]);

/**
 * Compute the secondary-remove preview for `secondaryTypeId` against a project's
 * current type record + checklist progress + deferred set. Returns a stable
 * empty preview (`present: false`) when there is no type record or the secondary
 * is not on the project.
 */
export function useSecondaryRemovePreview(
  projectId: string,
  secondaryTypeId: ProjectTypeId,
): SecondaryRemovePreview {
  const record = useProjectStore(
    (s) =>
      s.projects.find((p) => p.id === projectId)?.metadata?.projectTypeRecord,
  );
  const progress = usePlanStratumProgressStore((s) =>
    selectProjectProgress(s, projectId),
  );
  const deferred = usePlanStratumProgressStore((s) =>
    selectDeferredObjectives(s, projectId),
  );

  return useMemo(() => {
    if (!record) return EMPTY_PREVIEW;
    const primaryTypeId = record.primaryTypeId;
    const current = record.secondaryTypeIds ?? [];
    if (!current.includes(secondaryTypeId)) return EMPTY_PREVIEW;

    const nextSecondaries = current.filter((id) => id !== secondaryTypeId);
    const currentRecord = { primaryTypeId, secondaryTypeIds: current };
    const afterRemoval = { primaryTypeId, secondaryTypeIds: nextSecondaries };

    // Inverse delta: post-removal AGAINST current surfaces removed objectives
    // as `newObjectiveIds` and host objectives losing items as
    // `objectivesWithNewItems`.
    const inverse = computeObjectivesDelta(afterRemoval, currentRecord);
    const deltaObjectiveIds = Array.from(
      new Set([...inverse.newObjectiveIds, ...inverse.objectivesWithNewItems]),
    );

    const progressMap = toProgressMap(progress);
    const deferredSet = toDeferredSet(deferred);
    const currentObjectives = resolveProjectObjectives(currentRecord).objectives;
    const statuses = computeAllObjectiveStatuses(
      currentObjectives,
      progressMap,
      deferredSet,
    );
    const byId = new Map(currentObjectives.map((o) => [o.id, o]));

    const blockingObjectives: BlockingObjective[] = [];
    for (const id of deltaObjectiveIds) {
      const status = statuses[id] ?? 'locked';
      if (BLOCKING_STATUSES.has(status)) {
        const objective = byId.get(id);
        if (objective) blockingObjectives.push({ objective, status });
      }
    }

    return {
      present: true,
      removable: blockingObjectives.length === 0,
      blockingObjectives,
      removedObjectiveIds: inverse.newObjectiveIds,
      lostItemIds: inverse.injectedItems.map((i) => i.item.id),
    };
  }, [record, progress, deferred, secondaryTypeId]);
}
