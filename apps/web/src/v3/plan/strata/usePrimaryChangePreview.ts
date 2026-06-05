// usePrimaryChangePreview.ts
//
// Pure, read-only preview of what CHANGING a project's primary type would do to
// its resolved objective set. The primary-change modal renders this preview so
// the steward sees the full consequences BEFORE committing the (destructive)
// switch via `projectStore.changePrimaryType`.
//
// A primary change re-derives the entire S1-S7 catalogue: some objectives
// appear, some disappear (their progress is orphaned), incompatible secondary
// layers are pruned, and new design tensions may become active. Unlike the
// secondary-add preview this is destructive on confirm, so the preview also
// reports how much STARTED work would be set aside and surfaces any Amanah
// scopeNotes cautions being taken on (added) or left behind (set aside) - those
// must never be dropped silently (the Market Garden CSA / bay' ma laysa 'indak
// flag is the load-bearing example).
//
// Everything is derived from two pure inputs - the project's current type
// record and its checklist progress + deferred set - run through the same
// deterministic engines the spine uses. No writes, no side effects.

import { useMemo } from 'react';
import {
  computeAllObjectiveStatuses,
  computeObjectivesDelta,
  findProjectType,
  getActiveTensions,
  isCompatibleSecondary,
  resolveProjectObjectives,
  type DesignTension,
  type PlanStratumObjective,
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

/** A fiqh/Amanah caution attached to an objective entering or leaving scope. */
export interface PrimaryChangeAmanahNote {
  objectiveId: string;
  objectiveTitle: string;
  note: string;
  /** 'added' = caution newly taken on; 'set-aside' = caution left behind. */
  direction: 'added' | 'set-aside';
}

export interface PrimaryChangePreview {
  /**
   * Whether the change can actually be applied. Mirrors the
   * `changePrimaryType` store guards: a type record exists, the candidate can
   * be a primary, and it differs from the current primary. When `false`, every
   * other field is empty.
   */
  eligible: boolean;
  /** True when the candidate equals the current primary (no change). */
  isNoOp: boolean;
  /** Count of objectives that appear under the new primary (absent now). */
  objectivesAddedCount: number;
  /** Objectives present now but absent under the new primary (orphaned). */
  objectivesSetAside: PlanStratumObjective[];
  /** Of the set-aside objectives, how many carry started/finished/parked work. */
  startedSetAsideCount: number;
  /** Current secondaries incompatible with the new primary (will be dropped). */
  droppedSecondaryIds: ProjectTypeId[];
  /** Design tensions active under the new pairing but not the current one. */
  newTensions: DesignTension[];
  /** Amanah scopeNotes cautions taken on (added) or left behind (set aside). */
  amanahNotes: PrimaryChangeAmanahNote[];
}

const EMPTY_PREVIEW: PrimaryChangePreview = Object.freeze({
  eligible: false,
  isNoOp: false,
  objectivesAddedCount: 0,
  objectivesSetAside: [],
  startedSetAsideCount: 0,
  droppedSecondaryIds: [],
  newTensions: [],
  amanahNotes: [],
}) as PrimaryChangePreview;

// Statuses that count as "started work" the steward would lose on discard.
const STARTED = new Set(['active', 'complete', 'deferred']);

/** An Amanah caution is a scopeNote that carries the verbatim "Amanah" flag. */
function isAmanahNote(note: string | undefined): note is string {
  return typeof note === 'string' && /amanah/i.test(note);
}

/**
 * Compute the primary-change preview for `candidatePrimaryId` against a
 * project's current type record + checklist progress. Returns a stable empty
 * preview (`eligible: false`) when there is no type record, the candidate
 * cannot be a primary, or it equals the current primary (`isNoOp: true`).
 */
export function usePrimaryChangePreview(
  projectId: string,
  candidatePrimaryId: ProjectTypeId,
): PrimaryChangePreview {
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
    const fromPrimary = record.primaryTypeId;
    const currentSecondaries = record.secondaryTypeIds ?? [];

    const isNoOp = candidatePrimaryId === fromPrimary;
    const canBePrimary = findProjectType(candidatePrimaryId)?.canBePrimary ?? false;
    if (isNoOp || !canBePrimary) {
      return { ...EMPTY_PREVIEW, isNoOp };
    }

    // Prune secondaries incompatible with the new primary (mirrors the store).
    const keptSecondaries = currentSecondaries.filter((s) =>
      isCompatibleSecondary(s, candidatePrimaryId),
    );
    const droppedSecondaryIds = currentSecondaries.filter(
      (s) => !keptSecondaries.includes(s),
    );

    const current = { primaryTypeId: fromPrimary, secondaryTypeIds: currentSecondaries };
    const next = { primaryTypeId: candidatePrimaryId, secondaryTypeIds: keptSecondaries };

    // Appearing objectives: in NEXT not in CURRENT. Disappearing (set aside):
    // in CURRENT not in NEXT (inverse delta — same pattern as removeSecondaryType).
    const appearing = computeObjectivesDelta(current, next);
    const disappearing = computeObjectivesDelta(next, current);
    const objectivesAddedCount = appearing.newObjectiveIds.length;
    const objectivesSetAside = disappearing.newObjectives;

    // Of the set-aside objectives, how many carry started work under the CURRENT
    // resolution (same progress + deferred sets the spine uses).
    const progressMap = toProgressMap(progress);
    const deferredSet = toDeferredSet(deferred);
    const currentObjectives = resolveProjectObjectives(current).objectives;
    const statuses = computeAllObjectiveStatuses(
      currentObjectives,
      progressMap,
      deferredSet,
    );
    const startedSetAsideCount = objectivesSetAside.filter((o) =>
      STARTED.has(statuses[o.id] ?? 'locked'),
    ).length;

    // Newly-active tensions (active under the new pairing, not the current one).
    const tensionsBefore = new Set(
      getActiveTensions(fromPrimary, currentSecondaries).map((t) => t.id),
    );
    const newTensions = getActiveTensions(candidatePrimaryId, keptSecondaries).filter(
      (t) => !tensionsBefore.has(t.id),
    );

    // Amanah cautions: surfaced from objectives being taken on (added) and left
    // behind (set aside). Never dropped silently — see [[feedback-csa-in-catalogues]].
    const amanahNotes: PrimaryChangeAmanahNote[] = [];
    for (const o of appearing.newObjectives) {
      if (isAmanahNote(o.scopeNotes)) {
        amanahNotes.push({
          objectiveId: o.id,
          objectiveTitle: o.title,
          note: o.scopeNotes,
          direction: 'added',
        });
      }
    }
    for (const o of objectivesSetAside) {
      if (isAmanahNote(o.scopeNotes)) {
        amanahNotes.push({
          objectiveId: o.id,
          objectiveTitle: o.title,
          note: o.scopeNotes,
          direction: 'set-aside',
        });
      }
    }

    return {
      eligible: true,
      isNoOp: false,
      objectivesAddedCount,
      objectivesSetAside,
      startedSetAsideCount,
      droppedSecondaryIds,
      newTensions,
      amanahNotes,
    };
  }, [record, progress, deferred, candidatePrimaryId]);
}
