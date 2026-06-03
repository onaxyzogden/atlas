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
 * three closing stamps. Exported as the SINGLE authority on "open" so read
 * consumers (e.g. ObjectiveDetailPanel) derive the same set as the count hook.
 * NOTE (T1.9): dormancy is NOW computed-on-read in the hooks (isFlagDormantByWindow)
 * rather than stored in dormantSince, so this predicate remains stamp-only.
 * isOpenReviewFlag does NOT check computed dormancy; the hooks apply it after.
 */
export const isOpenReviewFlag = (f: ObjectiveReviewFlag): boolean =>
  !f.resolvedAt && !f.dismissedAt && !f.dormantSince;

/**
 * SeasonName type alias (mirrors the schema -- imported at usage sites via
 * @ogden/shared, but we need it locally here for the helper signature without
 * pulling in the whole schema).
 */
type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';

/** The temporal bucket that contextualises a flag: season + cycleNumber. */
export interface FlagBucket {
  season?: SeasonName;
  cycleNumber?: number;
}

/**
 * The ordered depth scale used for bump-on-re-open.
 * Must match FlagDepth in reviewFlag.schema.ts.
 */
const DEPTH_ORDER = [
  'threshold',
  'soil',
  'water',
  'zones',
  'structural',
] as const;

type FlagDepthKey = (typeof DEPTH_ORDER)[number];

function bumpDepth(depth: FlagDepthKey): FlagDepthKey {
  const idx = DEPTH_ORDER.indexOf(depth);
  if (idx === -1 || idx >= DEPTH_ORDER.length - 1) return 'structural';
  return DEPTH_ORDER[idx + 1] ?? 'structural';
}

/**
 * isFlagDormantByWindow -- pure helper (T1.9 auto-dormancy).
 *
 * Returns true when an open flag's firing pattern did NOT recur within one
 * comparable LATER window (i.e. the pattern appears to have been a one-off or
 * has self-corrected).
 *
 * Rules:
 *   per='cycle': dormant when currentBucket.cycleNumber > flagWindow.cycleNumber + 1.
 *     Adjacent cycle (cycleNumber + 1) is NOT dormant (pattern may still be live).
 *   per='season': prefer cycleNumber distance when both are present (seasons are
 *     cyclic; two identical season names from different years may be far apart),
 *     using the same >+1 rule as 'cycle'. If either cycleNumber is absent we cannot
 *     reliably date the window from season names alone, so we treat it as NOT
 *     dormant (season-only buckets never auto-hide a flag).
 *   Either bucket missing required data => NOT dormant (never hide without data).
 *
 * @param flag         The flag to evaluate.
 * @param currentBucket The most-recent known (season, cycleNumber) for the project.
 * @param per          The temporal unit from flag.expectedRate.per (default 'season').
 */
export function isFlagDormantByWindow(
  flag: ObjectiveReviewFlag,
  currentBucket: FlagBucket,
  per: 'season' | 'cycle',
): boolean {
  const flagCycle = flag.window.cycleNumber;
  const currentCycle = currentBucket.cycleNumber;

  if (per === 'cycle') {
    // Both cycle numbers must be present to determine dormancy.
    if (flagCycle === undefined || currentCycle === undefined) return false;
    return currentCycle > flagCycle + 1;
  }

  // per === 'season'
  // Prefer cycleNumber comparison when both are available (unambiguous distance).
  if (flagCycle !== undefined && currentCycle !== undefined) {
    return currentCycle > flagCycle + 1;
  }

  // Fallback: season-name comparison alone -- without cycleNumber we cannot
  // determine how many seasons have elapsed, so conservatively return false.
  // This ensures we never hide a flag purely because a new season has arrived
  // without a cycle counter to date it.
  return false;
}

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

          // ------------------------------------------------------------------
          // Step A: dismissed-but-worsening check (T1.9).
          // If a DISMISSED flag for the same triple would see its cumulative
          // observedCount exceed dismissedAtCount after this raise, re-open it
          // and bump depth one step. This check runs BEFORE the open-dedup path
          // so the dismissed flag is not also matched as a new append.
          // ------------------------------------------------------------------
          const dismissedIdx = bucket.findIndex(
            (f) =>
              f.dismissedAt !== undefined &&
              f.dismissedAtCount !== undefined &&
              f.objectiveId === input.objectiveId &&
              f.sourceTemplateId === input.sourceTemplateId &&
              f.direction === input.direction,
          );

          if (dismissedIdx !== -1) {
            const dismissed = bucket[dismissedIdx];
            if (dismissed !== undefined) {
              const newCumulative = dismissed.observedCount + input.observedCount;
              if (newCumulative > (dismissed.dismissedAtCount ?? dismissed.observedCount)) {
                // Re-open: clear dismissedAt, bump depth, refresh window + count.
                const bumpedDepth = bumpDepth(dismissed.depth as FlagDepthKey);
                const reopened: ObjectiveReviewFlag = {
                  ...dismissed,
                  observedCount: newCumulative,
                  sourceActivationIds: [
                    ...dismissed.sourceActivationIds,
                    ...(input.sourceActivationIds ?? []),
                  ],
                  window: input.window ?? dismissed.window,
                  depth: bumpedDepth,
                  dismissedAt: undefined,
                  dismissedAtCount: undefined,
                };
                const newBucket = bucket.map((f, i) =>
                  i === dismissedIdx ? reopened : f,
                );
                return {
                  byProject: {
                    ...state.byProject,
                    [projectId]: newBucket,
                  },
                };
              }
              // Cumulative count does NOT exceed dismissedAtCount: leave dismissed.
              // Return state unchanged -- do NOT append a new row. The steward
              // dismissed this pattern; a raise below the threshold is not
              // enough evidence to re-surface it.
              return state;
            }
          }

          // ------------------------------------------------------------------
          // Step B: Open-flag dedup path (original behaviour).
          // ------------------------------------------------------------------
          // Find an open flag matching the dedup triple.
          const matchIdx = bucket.findIndex(
            (f) =>
              isOpenReviewFlag(f) &&
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
 * useReviewFlagsForObjective -- reactive hook returning ALL flags for a
 * (projectId, objectiveId) pair. The panel decides which subset to render
 * (open, resolved with delta, etc.).
 *
 * Auto-dormancy filtering (T1.9): when currentBucket is supplied, open flags
 * whose firing pattern has not recurred in a later comparable window are
 * excluded. Resolved / dismissed / dormantSince-stamped flags are NOT excluded
 * by this hook (the panel handles those subsets separately).
 *
 * IMPORTANT: do NOT call useReviewFlagStore((s) => filterFn(s)) directly.
 * Any inline filter returns a fresh array on every call, driving a Zustand-v5
 * infinite re-render loop. We select the stable byProject map and derive the
 * filtered list in useMemo. See protocolStore.ts for canonical documentation.
 */
export function useReviewFlagsForObjective(
  projectId: string | null,
  objectiveId: string | null,
  currentBucket?: FlagBucket,
): ObjectiveReviewFlag[] {
  const byProject = useReviewFlagStore((s) => s.byProject);
  return useMemo(() => {
    if (!projectId || !objectiveId) return EMPTY_FLAGS;
    return (byProject[projectId] ?? []).filter((f) => {
      if (f.objectiveId !== objectiveId) return false;
      // Auto-dormancy only applies to OPEN flags. Resolved/dismissed flags are
      // passed through regardless -- the panel uses them for the verify section.
      if (isOpenReviewFlag(f) && currentBucket !== undefined) {
        const per = f.expectedRate?.per ?? 'season';
        if (isFlagDormantByWindow(f, currentBucket, per)) return false;
      }
      return true;
    });
  }, [byProject, projectId, objectiveId, currentBucket]);
}

/**
 * useReviewFlagCountsByObjective -- reactive hook returning a
 * Record<objectiveId, number> counting ONLY open, non-dormant flags per
 * objective for the given project.
 *
 * currentBucket (optional): same semantics as useReviewFlagsForObjective.
 *
 * Same Zustand-v5 anti-inline-filter warning as useReviewFlagsForObjective.
 */
export function useReviewFlagCountsByObjective(
  projectId: string | null,
  currentBucket?: FlagBucket,
): Record<string, number> {
  const byProject = useReviewFlagStore((s) => s.byProject);
  return useMemo(() => {
    if (!projectId) return EMPTY_COUNTS;
    const flags = byProject[projectId] ?? [];
    const counts: Record<string, number> = {};
    for (const f of flags) {
      if (!isOpenReviewFlag(f)) continue;
      if (currentBucket !== undefined) {
        const per = f.expectedRate?.per ?? 'season';
        if (isFlagDormantByWindow(f, currentBucket, per)) continue;
      }
      const prev = counts[f.objectiveId] ?? 0;
      counts[f.objectiveId] = prev + 1;
    }
    return counts;
  }, [byProject, projectId, currentBucket]);
}
