/**
 * realityCheckStore -- persisted steward state for Threshold 1 (The Reality
 * Check), the structural hinge between Mode 2 (Reception) and Mode 4 (Design).
 *
 * One entry per project:
 *   - `phase1Ready`         -- the steward has read the evidence and chosen to
 *                              proceed from Phase 1 (Review) to Phase 2 (Direction).
 *   - `strandFindings`      -- optional per-strand stance/note recorded while
 *                              reading Phase 1 (hybrid evidence: derived summary
 *                              + the steward's own observation).
 *   - `classifications`     -- the Phase-2 decision per intent element
 *                              (feasible / conditional / deferred / released),
 *                              keyed by the stable IntentElement id.
 *   - `planningDirectionText` -- the composed (then steward-editable) Planning
 *                              Direction Statement.
 *   - `approvedAt`          -- epoch ms when the Planning Direction was approved;
 *                              the approval that arms the soft Mode-4 gate.
 *
 * The VALUE types (RealityCheckStatus / ElementClassification / StrandFinding)
 * are owned by the pure `realityCheckModel` -- this store imports them so the
 * dependency runs store -> model, never the reverse.
 *
 * Client-only IndexedDB (`ogden-reality-check`, v1) registered in syncManifest
 * (the coverage guard fails the build if it is not). Mirrors actEvidenceStore's
 * persist/rehydrate idiom exactly.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import type {
  RealityCheckStatus,
  ElementClassification,
  StrandFinding,
} from '../v3/plan/threshold/realityCheckModel.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The whole Threshold-1 record for one project. */
export interface ProjectRealityCheck {
  /** Phase 1 (Review) -> Phase 2 (Direction) gate. */
  phase1Ready: boolean;
  /** Optional steward stance/note per evidence strand id. */
  strandFindings: Record<string, StrandFinding>;
  /** Phase-2 decision per intent element id. */
  classifications: Record<string, ElementClassification>;
  /** Composed + steward-editable Planning Direction Statement. */
  planningDirectionText?: string;
  /** Epoch ms of approval; absent until the steward approves. */
  approvedAt?: number;
}

/** Stable empty record returned when a project has no Threshold-1 data yet. */
export const EMPTY_REALITY_CHECK: ProjectRealityCheck = Object.freeze({
  phase1Ready: false,
  strandFindings: Object.freeze({}) as Record<string, StrandFinding>,
  classifications: Object.freeze({}) as Record<string, ElementClassification>,
});

interface RealityCheckState {
  /** Threshold-1 record keyed by projectId. */
  byProject: Record<string, ProjectRealityCheck>;

  /** Mark Phase 1 reading complete (or re-open it). */
  setPhase1Ready(projectId: string, ready: boolean): void;

  /**
   * Record (merge) a stance/note for one evidence strand. Passing both fields
   * empty clears the strand entry so the map stays sparse.
   */
  setStrandFinding(
    projectId: string,
    strandId: string,
    finding: StrandFinding,
  ): void;

  /**
   * Set the classification status for one intent element, preserving any
   * existing condition/note/gapNote on it.
   */
  classifyElement(
    projectId: string,
    elementId: string,
    status: RealityCheckStatus,
  ): void;

  /**
   * Merge condition/note/gapNote onto an element that has ALREADY been
   * classified. No-op if the element has no status yet (status is set first
   * via classifyElement), so a stored classification is never statusless.
   */
  annotateClassification(
    projectId: string,
    elementId: string,
    patch: Partial<Omit<ElementClassification, 'status'>>,
  ): void;

  /** Remove the classification for one element (un-classify). */
  clearClassification(projectId: string, elementId: string): void;

  /** Set (overwrite) the Planning Direction Statement text. */
  setPlanningDirectionText(projectId: string, text: string): void;

  /**
   * Approve the Planning Direction Statement, stamping `approvedAt`. Defaults
   * to now; tests pass an explicit timestamp for determinism.
   */
  approve(projectId: string, at?: number): void;

  /** Clear the approval (re-open the Direction phase for revision). */
  resetApproval(projectId: string): void;

  /** Drop the entire Threshold-1 record for a project. */
  reset(projectId: string): void;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Read a project's record, defaulting to EMPTY_REALITY_CHECK when absent. */
function readRecord(
  byProject: Record<string, ProjectRealityCheck>,
  projectId: string,
): ProjectRealityCheck {
  return byProject[projectId] ?? EMPTY_REALITY_CHECK;
}

/** Immutably write a patched record back into byProject. */
function writeRecord(
  byProject: Record<string, ProjectRealityCheck>,
  projectId: string,
  patch: Partial<ProjectRealityCheck>,
): Record<string, ProjectRealityCheck> {
  return {
    ...byProject,
    [projectId]: { ...readRecord(byProject, projectId), ...patch },
  };
}

/** True when a StrandFinding carries no usable content (-> drop it). */
function isEmptyFinding(finding: StrandFinding): boolean {
  return (
    (finding.stance === undefined || finding.stance === null) &&
    (finding.note === undefined || finding.note.trim() === '')
  );
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useRealityCheckStore = create<RealityCheckState>()(
  persist(
    (set) => ({
      byProject: {},

      setPhase1Ready: (projectId, ready) =>
        set((s) => {
          const current = readRecord(s.byProject, projectId);
          if (current.phase1Ready === ready) return s; // no-op
          return {
            byProject: writeRecord(s.byProject, projectId, {
              phase1Ready: ready,
            }),
          };
        }),

      setStrandFinding: (projectId, strandId, finding) =>
        set((s) => {
          const current = readRecord(s.byProject, projectId);
          const next = { ...current.strandFindings };
          if (isEmptyFinding(finding)) {
            if (!(strandId in next)) return s; // nothing to clear -- no-op
            delete next[strandId];
          } else {
            next[strandId] = finding;
          }
          return {
            byProject: writeRecord(s.byProject, projectId, {
              strandFindings: next,
            }),
          };
        }),

      classifyElement: (projectId, elementId, status) =>
        set((s) => {
          const current = readRecord(s.byProject, projectId);
          const existing = current.classifications[elementId];
          if (existing?.status === status) return s; // no-op
          return {
            byProject: writeRecord(s.byProject, projectId, {
              classifications: {
                ...current.classifications,
                // Preserve any prior condition/note/gapNote; swap only status.
                [elementId]: { ...(existing ?? {}), status },
              },
            }),
          };
        }),

      annotateClassification: (projectId, elementId, patch) =>
        set((s) => {
          const current = readRecord(s.byProject, projectId);
          const existing = current.classifications[elementId];
          if (!existing) return s; // status must be set first -- no-op
          return {
            byProject: writeRecord(s.byProject, projectId, {
              classifications: {
                ...current.classifications,
                [elementId]: { ...existing, ...patch },
              },
            }),
          };
        }),

      clearClassification: (projectId, elementId) =>
        set((s) => {
          const current = readRecord(s.byProject, projectId);
          if (!(elementId in current.classifications)) return s; // no-op
          const { [elementId]: _removed, ...rest } = current.classifications;
          return {
            byProject: writeRecord(s.byProject, projectId, {
              classifications: rest,
            }),
          };
        }),

      setPlanningDirectionText: (projectId, text) =>
        set((s) => ({
          byProject: writeRecord(s.byProject, projectId, {
            planningDirectionText: text,
          }),
        })),

      approve: (projectId, at) =>
        set((s) => ({
          byProject: writeRecord(s.byProject, projectId, {
            approvedAt: at ?? Date.now(),
          }),
        })),

      resetApproval: (projectId) =>
        set((s) => {
          const current = readRecord(s.byProject, projectId);
          if (current.approvedAt === undefined) return s; // no-op
          // Strip approvedAt while keeping everything else.
          const { approvedAt: _dropped, ...rest } = current;
          return {
            byProject: { ...s.byProject, [projectId]: rest },
          };
        }),

      reset: (projectId) =>
        set((s) => {
          if (!(projectId in s.byProject)) return s; // no-op
          const { [projectId]: _removed, ...rest } = s.byProject;
          return { byProject: rest };
        }),
    }),
    {
      name: 'ogden-reality-check',
      version: 1,
      // Synced project data lives in IndexedDB like every other byProject store
      // (Node-safe; degrades to localStorage/null). No schema migrate at v1.
      storage: idbPersistStorage,
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(useRealityCheckStore);
