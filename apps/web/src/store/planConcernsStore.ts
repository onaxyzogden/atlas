/**
 * planConcernsStore -- the covenant safety valve for Threshold 3 (The Act
 * Mandate). Once "Begin Act" arms `planReadOnly`, the committed plan is no longer
 * silently editable. If reality diverges during Act, the steward RAISES A CONCERN
 * against the locked objective; the team governance declared in Objective 0.2
 * reviews it; and -- if approved -- the objective's lock is lifted just long
 * enough to record an amendment ALONGSIDE the original (additions only; the
 * catalogue objective is never overwritten), then re-locked.
 *
 * One entry per project: a byProject ARRAY of PlanConcern, append-only. The array
 * only ever grows by new concerns; resolving a concern replaces THAT one record
 * in place (status raised -> approved/declined) with a frozen record and leaves
 * every other concern untouched. A terminal (approved/declined) concern is never
 * re-resolved.
 *
 * AMANAH: every free-text field that could smuggle advance-sale / subscription /
 * CSA / yield-share framing into storage is scanned by `detectCsaLikeText` at the
 * persistence boundary as a HARD reject (never stored), not merely a UI advisory.
 * `raiseConcern` refuses an `observation`/`proposedChange` that trips the guard;
 * an approve refuses an `amendmentText` that trips it. This is the last line of
 * defence even if a UI guard is bypassed -- a banned term cannot reach IndexedDB.
 *
 * Client-only IndexedDB (`ogden-plan-concerns`, v1) registered in syncManifest
 * (the coverage guard fails the build if it is not). Mirrors the
 * coherenceCheckStore persist/rehydrate idiom; the Amanah guard is the same one
 * re-exported by coherenceCheckModel (ONE source of the advance-sale detector).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import { detectCsaLikeText } from '../v3/plan/threshold/coherenceCheckModel.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Lifecycle of one concern. raised -> under-review -> approved | declined. */
export type ConcernStatus = 'raised' | 'under-review' | 'approved' | 'declined';

/** Approve/decline are the two terminal resolutions a review can record. */
export type ConcernResolution = 'approved' | 'declined';

/** One steward concern raised against a locked Plan objective during Act. */
export interface PlanConcern {
  /** Stable id (caller-supplied in tests; else a generated uuid). */
  id: string;
  /** The Plan objective id this concern is raised against. */
  objectiveRef: string;
  /** How reality diverged from the plan (steward free-text). */
  observation: string;
  /** The change the steward proposes (steward free-text). */
  proposedChange: string;
  /** Who raised it (steward name/ref from the 0.2 roster). */
  raisedBy: string;
  /** Epoch ms it was raised. */
  timestamp: number;
  status: ConcernStatus;
  /** Who reviewed it (governance), set once resolved. */
  reviewedBy?: string;
  /** Epoch ms it was reviewed, set once resolved. */
  reviewedAt?: number;
  /** The recorded amendment (approve only) -- alongside the original objective. */
  amendmentText?: string;
}

/** Fields the affordance supplies when raising a concern. */
export interface RaiseConcernInput {
  objectiveRef: string;
  observation: string;
  proposedChange: string;
  raisedBy: string;
}

/** Stable empty list returned when a project has no concerns yet. */
export const EMPTY_CONCERNS: readonly PlanConcern[] = Object.freeze([]);

interface PlanConcernsState {
  /** Append-only concern list keyed by projectId. */
  byProject: Record<string, PlanConcern[]>;

  /**
   * Raise a concern against a locked objective. Trims the free-text fields;
   * no-op if `observation` is empty after trim (a concern needs an observation).
   * Amanah HARD reject: an `observation` or `proposedChange` that trips
   * `detectCsaLikeText` is refused (never stored). Defaults `timestamp` to now
   * and generates an id; tests pass both via `opts` for determinism.
   */
  raiseConcern(
    projectId: string,
    input: RaiseConcernInput,
    opts?: { id?: string; at?: number },
  ): void;

  /** Transition a `raised` concern to `under-review`. No-op otherwise. */
  markUnderReview(projectId: string, concernId: string): void;

  /**
   * Resolve a concern. `approved` REQUIRES an `amendmentText` (the amendment
   * recorded alongside the original); empty/whitespace or CSA-like text is a
   * no-op (covenant). `declined` records no amendment. A concern already in a
   * terminal state (approved/declined) is never re-resolved. The resolved
   * record is frozen; every other concern is untouched. Defaults `reviewedAt`
   * to now; tests pass it via `opts`.
   */
  resolveConcern(
    projectId: string,
    concernId: string,
    decision: ConcernResolution,
    reviewedBy: string,
    opts?: { amendmentText?: string; at?: number },
  ): void;

  /** Drop the entire concern list for a project. */
  reset(projectId: string): void;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Generate a concern id. Tests supply an explicit id for determinism. */
function newConcernId(): string {
  return `concern-${crypto.randomUUID()}`;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePlanConcernsStore = create<PlanConcernsState>()(
  persist(
    (set) => ({
      byProject: {},

      raiseConcern: (projectId, input, opts = {}) =>
        set((s) => {
          const observation = input.observation.trim();
          const proposedChange = input.proposedChange.trim();
          if (observation === '') return s; // nothing to record -- no-op
          // Amanah last line of defence: never persist advance-sale / CSA text.
          if (detectCsaLikeText(observation) || detectCsaLikeText(proposedChange)) {
            return s;
          }
          const concern: PlanConcern = Object.freeze({
            id: opts.id ?? newConcernId(),
            objectiveRef: input.objectiveRef,
            observation,
            proposedChange,
            raisedBy: input.raisedBy.trim(),
            timestamp: opts.at ?? Date.now(),
            status: 'raised' as const,
          });
          const list = s.byProject[projectId] ?? [];
          return {
            byProject: { ...s.byProject, [projectId]: [...list, concern] },
          };
        }),

      markUnderReview: (projectId, concernId) =>
        set((s) => {
          const list = s.byProject[projectId];
          if (!list) return s; // unknown project -- no-op
          const idx = list.findIndex((c) => c.id === concernId);
          if (idx < 0) return s; // unknown concern -- no-op
          const target = list[idx]!;
          if (target.status !== 'raised') return s; // only raised -> under-review
          const next = [...list];
          next[idx] = Object.freeze({ ...target, status: 'under-review' as const });
          return { byProject: { ...s.byProject, [projectId]: next } };
        }),

      resolveConcern: (projectId, concernId, decision, reviewedBy, opts = {}) =>
        set((s) => {
          const list = s.byProject[projectId];
          if (!list) return s; // unknown project -- no-op
          const idx = list.findIndex((c) => c.id === concernId);
          if (idx < 0) return s; // unknown concern -- no-op
          const target = list[idx]!;
          // Terminal states are frozen -- never re-resolve.
          if (target.status === 'approved' || target.status === 'declined') {
            return s;
          }
          let amendmentText: string | undefined;
          if (decision === 'approved') {
            const text = (opts.amendmentText ?? '').trim();
            if (text === '') return s; // approve requires an amendment -- no-op
            if (detectCsaLikeText(text)) return s; // Amanah reject -- never store
            amendmentText = text;
          }
          const resolved: PlanConcern = Object.freeze({
            ...target,
            status: decision,
            reviewedBy,
            reviewedAt: opts.at ?? Date.now(),
            ...(amendmentText !== undefined ? { amendmentText } : {}),
          });
          const next = [...list];
          next[idx] = resolved;
          return { byProject: { ...s.byProject, [projectId]: next } };
        }),

      reset: (projectId) =>
        set((s) => {
          if (!(projectId in s.byProject)) return s; // no-op
          const { [projectId]: _removed, ...rest } = s.byProject;
          return { byProject: rest };
        }),
    }),
    {
      name: 'ogden-plan-concerns',
      version: 1,
      // Synced project data lives in IndexedDB like every other byProject store
      // (Node-safe; degrades to localStorage/null). No schema migrate at v1.
      storage: idbPersistStorage,
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(usePlanConcernsStore);

// ---------------------------------------------------------------------------
// Selectors (pure)
// ---------------------------------------------------------------------------

/** A project's concern list, defaulting to the shared EMPTY list. */
export function selectConcerns(
  byProject: Record<string, PlanConcern[]>,
  projectId: string,
): readonly PlanConcern[] {
  return byProject[projectId] ?? EMPTY_CONCERNS;
}

/** A project's APPROVED amendments touching one objective, in submission order. */
export function approvedAmendmentsForObjective(
  concerns: readonly PlanConcern[],
  objectiveId: string,
): PlanConcern[] {
  return concerns.filter(
    (c) =>
      c.status === 'approved' &&
      c.objectiveRef === objectiveId &&
      typeof c.amendmentText === 'string' &&
      c.amendmentText.length > 0,
  );
}
