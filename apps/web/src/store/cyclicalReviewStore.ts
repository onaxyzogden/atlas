/**
 * cyclicalReviewStore — per-(project, objective) record that powers the
 * Plan Navigation Spec v1 §3.6 cyclical-review prompt (Slice 1.11).
 *
 * What we persist
 * ---------------
 *  - `lastReviewedAt`            ISO timestamp; bumped on initial completion
 *                                AND on either "Confirm decision" / "Revise
 *                                decision". Drives the 90-day re-prompt.
 *  - `lastDecisionConfirmedAt`   ISO timestamp; set only when the steward
 *                                clicks "Confirm decision" — surfaces the
 *                                "Decision confirmed" modal (screenshot 3)
 *                                and, in Phase 4, threads through to the
 *                                Observe banner.
 *  - `forcedTrigger`             boolean per objective; set by `forceTrigger`
 *                                (dev-tools entry for Phase 1 + the Phase 4
 *                                Observe-revision flag stand-in). The
 *                                pure-predicate `isCyclicalReviewDue` reads
 *                                this through the `observeRevisionFlag`
 *                                injection point so the engine stays
 *                                I/O-free.
 *
 * Kept separate from `planTierStore` (checklist completion) so the two
 * concerns can evolve independently — review cadence is a temporal axis,
 * not a completion axis.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { cycleAdvance } from './cycleAdvance.js';
import { remapId } from '@ogden/shared';

const PERSIST_KEY = 'ogden-cyclical-review';

export interface CyclicalReviewRecord {
  lastReviewedAt: string | null;
  lastDecisionConfirmedAt: string | null;
  forcedTrigger: boolean;
}

const EMPTY_RECORD: CyclicalReviewRecord = Object.freeze({
  lastReviewedAt: null,
  lastDecisionConfirmedAt: null,
  forcedTrigger: false,
});

type ByObjective = Readonly<Record<string, CyclicalReviewRecord>>;
const EMPTY_BY_OBJECTIVE: ByObjective = Object.freeze({});

interface CyclicalReviewState {
  byProject: Record<string, ByObjective>;

  /** Read the review record for one objective. Returns a frozen empty
   *  record (never null) so call sites stay branch-light. */
  getRecord: (projectId: string, objectiveId: string) => CyclicalReviewRecord;

  /** Read the boolean the predicate uses for `observeRevisionFlag`. */
  isForced: (projectId: string, objectiveId: string) => boolean;

  /** Idempotent: record the initial completion timestamp so the 90-day
   *  clock has a starting point. No-op if `lastReviewedAt` is already set. */
  noteCompletion: (projectId: string, objectiveId: string) => void;

  /** "Confirm decision" CTA — bumps `lastReviewedAt` and stamps
   *  `lastDecisionConfirmedAt`, then clears any forced trigger. */
  confirmDecision: (projectId: string, objectiveId: string) => void;

  /** "Revise decision" CTA — bumps `lastReviewedAt` and clears the forced
   *  trigger, but does NOT stamp `lastDecisionConfirmedAt` (no confirmation
   *  modal). The steward edits the checklist directly afterward. */
  acknowledgeRevise: (projectId: string, objectiveId: string) => void;

  /** Dev-tools entry (also Phase 4's Observe-flag stand-in): force the
   *  predicate to return true on next read. */
  forceTrigger: (projectId: string, objectiveId: string) => void;

  /** Clear the forced trigger without recording a review — escape hatch
   *  for tests / dev-tools. */
  clearForcedTrigger: (projectId: string, objectiveId: string) => void;
}

function patchObjective(
  state: CyclicalReviewState,
  projectId: string,
  objectiveId: string,
  patch: Partial<CyclicalReviewRecord>,
): CyclicalReviewState {
  const project = state.byProject[projectId] ?? {};
  const current = project[objectiveId] ?? EMPTY_RECORD;
  const next: CyclicalReviewRecord = { ...current, ...patch };
  return {
    ...state,
    byProject: {
      ...state.byProject,
      [projectId]: {
        ...project,
        [objectiveId]: next,
      },
    },
  };
}

/**
 * persist `migrate` (v1 -> v2). The Plan tier spine was renamed to Stratum
 * 1-7; renumber the objective-id KEYS that index each project's review map
 * (t{n}- -> s{n+1}-, via `remapId`). The record VALUES are slug-free
 * (timestamps + a boolean) and are preserved verbatim; projectId keys are
 * opaque and left untouched. Idempotent on v2+ input (remapId is a no-op on
 * already-renumbered s{n} ids). Exported for the round-trip migration test.
 */
export function migrateCyclicalReview(
  persistedState: unknown,
  version: number,
): CyclicalReviewState {
  const safe = (persistedState as Partial<CyclicalReviewState> | null) ?? {};
  let byProject: Record<string, ByObjective> = safe.byProject ?? {};
  if (version < 2) {
    const remapped: Record<string, ByObjective> = {};
    for (const [projectId, byObjective] of Object.entries(byProject)) {
      const remappedObjectives: Record<string, CyclicalReviewRecord> = {};
      for (const [objectiveId, rec] of Object.entries(byObjective ?? {})) {
        remappedObjectives[remapId(objectiveId)] = rec;
      }
      remapped[projectId] = remappedObjectives;
    }
    byProject = remapped;
  }
  return { ...safe, byProject } as CyclicalReviewState;
}

export const useCyclicalReviewStore = create<CyclicalReviewState>()(
  persist(
    (set, get) => ({
      byProject: {},

      getRecord: (projectId, objectiveId) =>
        get().byProject[projectId]?.[objectiveId] ?? EMPTY_RECORD,

      isForced: (projectId, objectiveId) =>
        get().byProject[projectId]?.[objectiveId]?.forcedTrigger === true,

      noteCompletion: (projectId, objectiveId) =>
        set((s) => {
          const current = s.byProject[projectId]?.[objectiveId];
          if (current?.lastReviewedAt) return s;
          return patchObjective(s, projectId, objectiveId, {
            lastReviewedAt: new Date().toISOString(),
          });
        }),

      confirmDecision: (projectId, objectiveId) => {
        const nowIso = new Date().toISOString();
        set((s) =>
          patchObjective(s, projectId, objectiveId, {
            lastReviewedAt: nowIso,
            lastDecisionConfirmedAt: nowIso,
            forcedTrigger: false,
          }),
        );
        cycleAdvance(projectId, objectiveId, 'plan_revision_confirmed', {
          advancedAt: nowIso,
        });
      },

      acknowledgeRevise: (projectId, objectiveId) => {
        const nowIso = new Date().toISOString();
        set((s) =>
          patchObjective(s, projectId, objectiveId, {
            lastReviewedAt: nowIso,
            forcedTrigger: false,
          }),
        );
        cycleAdvance(projectId, objectiveId, 'plan_revision_revised', {
          advancedAt: nowIso,
        });
      },

      forceTrigger: (projectId, objectiveId) =>
        set((s) =>
          patchObjective(s, projectId, objectiveId, { forcedTrigger: true }),
        ),

      clearForcedTrigger: (projectId, objectiveId) =>
        set((s) =>
          patchObjective(s, projectId, objectiveId, { forcedTrigger: false }),
        ),
    }),
    {
      name: PERSIST_KEY,
      version: 2,
      partialize: (state) => ({ byProject: state.byProject }),
      migrate: migrateCyclicalReview,
    },
  ),
);

rehydrateWithLogging(useCyclicalReviewStore);

/** Stable selector for the per-project map. Returns a frozen empty record
 *  when the project has no review state yet so the selector identity stays
 *  stable across renders. */
export function selectProjectReviewMap(
  state: CyclicalReviewState,
  projectId: string,
): ByObjective {
  return state.byProject[projectId] ?? EMPTY_BY_OBJECTIVE;
}

// Expose a thin dev-tools entry on `window` ONLY in dev. The plan calls
// this out by name: `cyclicalReviewStore.getState().forceTrigger(...)`.
// Wired here so the smoke-test step 10 works without an extra import path.
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (
    window as unknown as { cyclicalReviewStore?: typeof useCyclicalReviewStore }
  ).cyclicalReviewStore = useCyclicalReviewStore;
}
