/**
 * coherenceCheckStore -- persisted steward state for Threshold 2 (The Coherence
 * Check), the Plan-only audit hinge after Mode-4 Design (s5 System Design).
 *
 * One entry per project:
 *   - `itemResolutions` -- the steward's inline gap-resolution per audit item,
 *                          keyed by the audit item id (a Section-B loop id like
 *                          `B3`, or a Section-C coverage id `c-<objectiveId>`).
 *                          This is the map fed straight to
 *                          `evaluateCoherenceAudit({ resolutions })`.
 *   - `amendments`      -- the APPEND-ONLY log of every recorded amendment, in
 *                          submission order. The spec is explicit: an amendment
 *                          "cannot be edited after submission" -- so a second
 *                          resolveItem for an already-resolved item is a no-op,
 *                          and the log only ever grows.
 *   - `sealedAt`        -- epoch ms when the Coherence Record was sealed; the
 *                          idempotent stamp that flips the downstream s6/s7 soft
 *                          banner from "not yet sealed" to "sealed". Never
 *                          overwritten once set (the original seal time stands).
 *
 * The `ItemResolution` VALUE type is owned by the pure `coherenceCheckModel`,
 * so the dependency runs store -> model, never the reverse. The store also
 * borrows the model's Amanah `detectCsaLikeText` guard as a persistence-boundary
 * last line of defence: amendment text that trips the advance-sale / CSA
 * detector is REFUSED (never stored), so a banned term cannot reach IndexedDB
 * even if a UI guard is bypassed.
 *
 * Client-only IndexedDB (`ogden-coherence-check`, v1) registered in syncManifest
 * (the coverage guard fails the build if it is not). Mirrors realityCheckStore's
 * persist/rehydrate idiom exactly.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import {
  detectCsaLikeText,
  type ItemResolution,
} from '../v3/plan/threshold/coherenceCheckModel.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * One permanent entry in the append-only amendments log. Carries the audit
 * item id it resolved plus the steward's text and the moment it was recorded.
 * The objective an amendment displays against (Stage 5 overlay) is derived at
 * render time from the audit model (each item knows its evidence/coverage
 * objective), so it is intentionally NOT denormalised here.
 */
export interface Amendment {
  /** Audit item id resolved (Section-B loop id, or `c-<objectiveId>`). */
  itemId: string;
  /** The steward's amendment text (trimmed, Amanah-vetted before storage). */
  amendmentText: string;
  /** Epoch ms of submission; permanent -- the record is never edited. */
  resolvedAt: number;
}

/** The whole Threshold-2 record for one project. */
export interface ProjectCoherenceCheck {
  /** Current resolution per audit item id (fed to evaluateCoherenceAudit). */
  itemResolutions: Record<string, ItemResolution>;
  /** Append-only log of every recorded amendment, in submission order. */
  amendments: Amendment[];
  /** Epoch ms the Coherence Record was sealed; absent until sealed. */
  sealedAt?: number;
}

/** Stable empty record returned when a project has no Threshold-2 data yet. */
export const EMPTY_COHERENCE_CHECK: ProjectCoherenceCheck = Object.freeze({
  itemResolutions: Object.freeze({}) as Record<string, ItemResolution>,
  amendments: Object.freeze([]) as unknown as Amendment[],
});

interface CoherenceCheckState {
  /** Threshold-2 record keyed by projectId. */
  byProject: Record<string, ProjectCoherenceCheck>;

  /**
   * Resolve one open audit item with an amendment. APPEND-ONLY: if the item is
   * already resolved the call is a no-op (the spec forbids editing a submitted
   * amendment). Empty/whitespace text is a no-op. Amendment text that trips the
   * Amanah CSA / advance-sale guard is REFUSED (never stored). On success the
   * item's resolution is recorded AND a permanent entry is pushed to the log.
   * Defaults `resolvedAt` to now; tests pass an explicit timestamp.
   */
  resolveItem(
    projectId: string,
    itemId: string,
    amendmentText: string,
    at?: number,
  ): void;

  /**
   * Seal the Coherence Record, stamping `sealedAt`. IDEMPOTENT: once sealed the
   * original timestamp stands (a re-seal is a no-op). Defaults to now; tests
   * pass an explicit timestamp for determinism.
   */
  seal(projectId: string, at?: number): void;

  /** Clear the seal (re-open the audit for revision); keeps amendments. */
  unseal(projectId: string): void;

  /** Drop the entire Threshold-2 record for a project. */
  reset(projectId: string): void;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Read a project's record, defaulting to EMPTY_COHERENCE_CHECK when absent. */
function readRecord(
  byProject: Record<string, ProjectCoherenceCheck>,
  projectId: string,
): ProjectCoherenceCheck {
  return byProject[projectId] ?? EMPTY_COHERENCE_CHECK;
}

/** Immutably write a patched record back into byProject. */
function writeRecord(
  byProject: Record<string, ProjectCoherenceCheck>,
  projectId: string,
  patch: Partial<ProjectCoherenceCheck>,
): Record<string, ProjectCoherenceCheck> {
  return {
    ...byProject,
    [projectId]: { ...readRecord(byProject, projectId), ...patch },
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCoherenceCheckStore = create<CoherenceCheckState>()(
  persist(
    (set) => ({
      byProject: {},

      resolveItem: (projectId, itemId, amendmentText, at) =>
        set((s) => {
          const text = amendmentText.trim();
          if (text === '') return s; // nothing to record -- no-op
          // Amanah last line of defence: never persist advance-sale / CSA text.
          if (detectCsaLikeText(text)) return s;
          const current = readRecord(s.byProject, projectId);
          if (itemId in current.itemResolutions) return s; // append-only -- frozen
          const resolvedAt = at ?? Date.now();
          const resolution: ItemResolution = { resolvedAt, amendmentText: text };
          return {
            byProject: writeRecord(s.byProject, projectId, {
              itemResolutions: {
                ...current.itemResolutions,
                [itemId]: resolution,
              },
              amendments: [
                ...current.amendments,
                { itemId, amendmentText: text, resolvedAt },
              ],
            }),
          };
        }),

      seal: (projectId, at) =>
        set((s) => {
          const current = readRecord(s.byProject, projectId);
          if (current.sealedAt !== undefined) return s; // idempotent -- no-op
          return {
            byProject: writeRecord(s.byProject, projectId, {
              sealedAt: at ?? Date.now(),
            }),
          };
        }),

      unseal: (projectId) =>
        set((s) => {
          const current = readRecord(s.byProject, projectId);
          if (current.sealedAt === undefined) return s; // no-op
          // Strip sealedAt while keeping itemResolutions + amendments.
          const { sealedAt: _dropped, ...rest } = current;
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
      name: 'ogden-coherence-check',
      version: 1,
      // Synced project data lives in IndexedDB like every other byProject store
      // (Node-safe; degrades to localStorage/null). No schema migrate at v1.
      storage: idbPersistStorage,
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(useCoherenceCheckStore);
