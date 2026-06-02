/**
 * reviewFlagStore -- persisted Zustand store for ObjectiveReviewFlag records.
 *
 * Flags are raised when field-fired protocol activations deviate from
 * steward-authored expectations (over/under) or when an existentially-
 * significant protocol fires once (existential). Each flag is an amber
 * "Review" marker on the downstream Plan objective.
 *
 * Lifecycle:
 *   raisedAt       -- when the evaluation engine raised the flag
 *   acknowledgedAt -- steward saw it (clears the "new" badge)
 *   resolvedAt     -- steward took corrective action and closed it
 *   dismissedAt    -- steward labelled it noise / acceptable variance
 *   dismissedAtCount -- observedCount at dismissal; escalation layer uses this
 *                       to detect patterns re-emerging after a dismiss
 *   dormantSince   -- evaluation paused (e.g. seasonal dormancy)
 *
 * Persist key: 'ogden-review-flags', version 1.
 * Partialize: byProject only (actions are not serialized).
 *
 * IMPORTANT -- hooks:
 *   Do NOT call useReviewFlagStore((s) => s.someFilterFn(...)) directly.
 *   Any selector that runs .filter() returns a fresh array reference on
 *   every call; under Zustand v5 that new snapshot is read as a state
 *   change on each render and drives an infinite re-render loop. Instead,
 *   select the stable byProject map and derive filtered results in useMemo.
 *   (Mirror of the pattern documented in protocolStore.ts.)
 */

import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import type { ObjectiveReviewFlag } from '@ogden/shared';

// ---------------------------------------------------------------------------
// Input type
// ---------------------------------------------------------------------------

/**
 * Input to `raiseFlag`: an ObjectiveReviewFlag with the auto-defaulted fields
 * made optional. Callers supply semantic fields; tests may pin `id` /
 * `raisedAt` for determinism.
 *
 * NOTE: this type intentionally still permits the closing-stamp fields
 * (`resolvedAt`, `dismissedAt`, `dormantSince`, etc.) so tests can construct a
 * pre-closed flag without a dedicated setter (dormancy setting lands in T1.9).
 * Production raise sites (the T1.6 evaluation engine) must pass ONLY semantic
 * fields -- passing a closing stamp here creates a flag that is born non-open,
 * which silently skips dedup and the open-flag counts. See `raiseFlag`.
 */
export type RaiseFlagInput = Omit<
  ObjectiveReviewFlag,
  'id' | 'raisedAt' | 'sourceActivationIds' | 'window'
> & {
  id?: string;
  raisedAt?: string;
  sourceActivationIds?: string[];
  window?: ObjectiveReviewFlag['window'];
};

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

export interface ReviewFlagState {
  /** Flags keyed by projectId -> array of ObjectiveReviewFlag. */
  byProject: Record<string, ObjectiveReviewFlag[]>;

  /**
   * Immutable-append with dedup: if an OPEN flag exists for the same
   * (objectiveId, sourceTemplateId, direction) triple, increment its
   * observedCount, append the new sourceActivationIds (existing first),
   * and refresh its window. Otherwise append a new flag.
   *
   * "Open" = no resolvedAt, no dismissedAt, no dormantSince.
   *
   * Production callers must pass ONLY semantic fields: a closing stamp in the
   * input creates a flag that is born non-open (skips dedup + open counts).
   * See the RaiseFlagInput note above.
   */
  raiseFlag: (input: RaiseFlagInput) => void;

  /** Stamp acknowledgedAt = now. */
  acknowledgeFlag: (projectId: string, flagId: string) => void;

  /**
   * Stamp resolvedAt = now + optionally set resolutionParameterDelta.
   * DISTINCT from dismissFlag -- see schema-level note in reviewFlag.schema.ts.
   */
  resolveFlag: (
    projectId: string,
    flagId: string,
    parameterDelta?: ObjectiveReviewFlag['resolutionParameterDelta'],
  ) => void;

  /**
   * Stamp dismissedAt = now AND dismissedAtCount = flag.observedCount.
   * DISTINCT from resolveFlag -- dismissal powers later escalation detection
   * via the dismissedAt + dismissedAtCount pair.
   */
  dismissFlag: (projectId: string, flagId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * A flag is "open" (live for dedup and counting) when it has none of the
 * three closing stamps.
 */
const isOpen = (f: ObjectiveReviewFlag): boolean =>
  !f.resolvedAt && !f.dismissedAt && !f.dormantSince;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useReviewFlagStore = create<ReviewFlagState>()(
  persist(
    (set) => ({
      byProject: {},

      raiseFlag: (input) =>
        set((state) => {
          const projectId = input.projectId;
          const bucket: ObjectiveReviewFlag[] = state.byProject[projectId] ?? [];

          // Find an open flag matching the dedup triple.
          const matchIdx = bucket.findIndex(
            (f) =>
              isOpen(f) &&
              f.objectiveId === input.objectiveId &&
              f.sourceTemplateId === input.sourceTemplateId &&
              f.direction === input.direction,
          );

          let newBucket: ObjectiveReviewFlag[];

          if (matchIdx !== -1) {
            // Dedup path: increment observedCount, append sourceActivationIds,
            // refresh window. Immutable .map -- no mutation of existing object.
            const existing = bucket[matchIdx];
            if (existing === undefined) {
              // Should never happen (matchIdx came from findIndex), but
              // noUncheckedIndexedAccess requires the guard.
              newBucket = bucket;
            } else {
              const updatedFlag: ObjectiveReviewFlag = {
                ...existing,
                observedCount: existing.observedCount + input.observedCount,
                sourceActivationIds: [
                  ...existing.sourceActivationIds,
                  ...(input.sourceActivationIds ?? []),
                ],
                window: input.window ?? existing.window,
              };
              newBucket = bucket.map((f, i) => (i === matchIdx ? updatedFlag : f));
            }
          } else {
            // Append path: build a new flag with caller-supplied or defaulted fields.
            const newFlag: ObjectiveReviewFlag = {
              projectId: input.projectId,
              objectiveId: input.objectiveId,
              sourceTemplateId: input.sourceTemplateId,
              observedCount: input.observedCount,
              deviationSign: input.deviationSign,
              depth: input.depth,
              direction: input.direction,
              reason: input.reason,
              // Optional fields from schema
              ...(input.expectedRate !== undefined
                ? { expectedRate: input.expectedRate }
                : {}),
              ...(input.acknowledgedAt !== undefined
                ? { acknowledgedAt: input.acknowledgedAt }
                : {}),
              ...(input.resolvedAt !== undefined
                ? { resolvedAt: input.resolvedAt }
                : {}),
              ...(input.dismissedAt !== undefined
                ? { dismissedAt: input.dismissedAt }
                : {}),
              ...(input.dismissedAtCount !== undefined
                ? { dismissedAtCount: input.dismissedAtCount }
                : {}),
              ...(input.dormantSince !== undefined
                ? { dormantSince: input.dormantSince }
                : {}),
              ...(input.resolutionParameterDelta !== undefined
                ? { resolutionParameterDelta: input.resolutionParameterDelta }
                : {}),
              ...(input.firingsSinceResolution !== undefined
                ? { firingsSinceResolution: input.firingsSinceResolution }
                : {}),
              // Defaulted fields (caller overrides accepted for determinism)
              id: input.id ?? crypto.randomUUID(),
              raisedAt: input.raisedAt ?? new Date().toISOString(),
              sourceActivationIds: input.sourceActivationIds ?? [],
              window: input.window ?? {},
            };
            newBucket = [...bucket, newFlag];
          }

          return {
            byProject: {
              ...state.byProject,
              [projectId]: newBucket,
            },
          };
        }),

      acknowledgeFlag: (projectId, flagId) =>
        set((state) => ({
          byProject: {
            ...state.byProject,
            [projectId]: (state.byProject[projectId] ?? []).map((f) =>
              f.id === flagId
                ? { ...f, acknowledgedAt: new Date().toISOString() }
                : f,
            ),
          },
        })),

      resolveFlag: (projectId, flagId, parameterDelta) =>
        set((state) => ({
          byProject: {
            ...state.byProject,
            [projectId]: (state.byProject[projectId] ?? []).map((f) =>
              f.id === flagId
                ? {
                    ...f,
                    resolvedAt: new Date().toISOString(),
                    ...(parameterDelta !== undefined
                      ? { resolutionParameterDelta: parameterDelta }
                      : {}),
                  }
                : f,
            ),
          },
        })),

      dismissFlag: (projectId, flagId) =>
        set((state) => ({
          byProject: {
            ...state.byProject,
            [projectId]: (state.byProject[projectId] ?? []).map((f) =>
              f.id === flagId
                ? {
                    ...f,
                    dismissedAt: new Date().toISOString(),
                    dismissedAtCount: f.observedCount,
                  }
                : f,
            ),
          },
        })),
    }),
    {
      name: 'ogden-review-flags',
      version: 1,
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(useReviewFlagStore);

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Stable empty results for consumers with no projectId / no matches.
 * Module-level constants ensure referential stability across renders.
 */
const EMPTY_FLAGS: ObjectiveReviewFlag[] = [];
const EMPTY_COUNTS: Record<string, number> = {};

/**
 * useReviewFlagsForObjective -- reactive hook returning all flags for a
 * (projectId, objectiveId) pair. The panel decides which to render.
 *
 * IMPORTANT: do NOT call useReviewFlagStore((s) => filterFn(s)) directly.
 * Any inline filter returns a fresh array on every call, driving a Zustand-v5
 * infinite re-render loop. We select the stable byProject map and derive the
 * filtered list in useMemo. See protocolStore.ts for canonical documentation.
 */
export function useReviewFlagsForObjective(
  projectId: string | null,
  objectiveId: string | null,
): ObjectiveReviewFlag[] {
  const byProject = useReviewFlagStore((s) => s.byProject);
  return useMemo(() => {
    if (!projectId || !objectiveId) return EMPTY_FLAGS;
    return (byProject[projectId] ?? []).filter(
      (f) => f.objectiveId === objectiveId,
    );
  }, [byProject, projectId, objectiveId]);
}

/**
 * useReviewFlagCountsByObjective -- reactive hook returning a
 * Record<objectiveId, number> counting ONLY open flags per objective for the
 * given project.
 *
 * "Open" = no resolvedAt, no dismissedAt, no dormantSince.
 *
 * Same Zustand-v5 anti-inline-filter warning as useReviewFlagsForObjective.
 */
export function useReviewFlagCountsByObjective(
  projectId: string | null,
): Record<string, number> {
  const byProject = useReviewFlagStore((s) => s.byProject);
  return useMemo(() => {
    if (!projectId) return EMPTY_COUNTS;
    const flags = byProject[projectId] ?? [];
    const counts: Record<string, number> = {};
    for (const f of flags) {
      if (!isOpen(f)) continue;
      const prev = counts[f.objectiveId] ?? 0;
      counts[f.objectiveId] = prev + 1;
    }
    return counts;
  }, [byProject, projectId]);
}
