/**
 * actEvidenceStore -- persisted capture for the Act tier-shell execution panel.
 *
 * Replaces the local (ephemeral) state that previously lived inside
 * ActTierExecutionPanel and ActTierShell. Three categories of data:
 *
 *   1. Evidence capture -- photo counts, confirms, note text, and save-status
 *      for the per-objective evidence descriptors resolved by
 *      getObjectiveEvidence (@ogden/shared). Keyed by
 *      projectId -> objectiveId -> descriptorId.
 *
 *   2. Vision form values -- text entered via the VisionFormModal (s1-vision
 *      checklist items that open a text-capture popup rather than arming a
 *      map tool). Keyed by projectId -> formId.
 *
 * Checklist item completion (the Act panel's "checked" state) is NOT stored
 * here. It writes to and reads from the shared planStratumStore
 * (toggleItem / byProject[projectId][objectiveId]) because item ids are
 * globally unique across all objective catalogues and the Plan status engine
 * derives objective completion from that same store. Act and Plan share one
 * source of truth for checklist progress.
 *
 * Persist key: 'ogden-act-evidence', version 3.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import type { FormValue } from '../v3/act/tier-shell/actToolCatalog.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Evidence capture for one objective. Every field is keyed by evidence
 * descriptor id so multiple cards of the same kind can coexist (e.g. two
 * photo cards -- checkpoint-photos and site-photo).
 */
export interface EvidenceCapture {
  /** Photo count per descriptor id (0 to descriptor.target). */
  photos: Record<string, number>;
  /** Confirmed state per descriptor id. */
  confirms: Record<string, boolean>;
  /** Raw note text per descriptor id. */
  notes: Record<string, string>;
  /** Whether the note for a descriptor has been explicitly saved. Cleared
   *  to false whenever the text changes; set to true on Save. */
  notesSaved: Record<string, boolean>;
}

/** Stable empty capture returned when no data exists for an objective. */
export const EMPTY_CAPTURE: EvidenceCapture = Object.freeze({
  photos: Object.freeze({}) as Record<string, number>,
  confirms: Object.freeze({}) as Record<string, boolean>,
  notes: Object.freeze({}) as Record<string, string>,
  notesSaved: Object.freeze({}) as Record<string, boolean>,
});

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

type ByObjective = Record<string, EvidenceCapture>;

interface ActEvidenceState {
  /** Evidence capture keyed projectId -> objectiveId -> EvidenceCapture. */
  byProject: Record<string, ByObjective>;
  /** Vision form text values keyed projectId -> formId -> text. */
  visionForms: Record<string, Record<string, string>>;
  /** Structured vision form values keyed projectId -> formId -> FormValue. */
  visionFormData: Record<string, Record<string, FormValue>>;
  /** Optional "why these?" rationale per decision/checklist item. Keyed projectId -> itemId -> text. Display + persistence only; does NOT feed the progress/dependency-gate engine. */
  decisionRationale: Record<string, Record<string, string>>;
  /** Lightweight "needs more observation" defer annotation per decision. Keyed projectId -> itemId -> true. Display-only re: gating (TODO: true per-item status lives in planStratumStore). */
  deferredDecisions: Record<string, Record<string, true>>;

  /**
   * Increment the photo count for a descriptor, capped at maxTarget.
   * Creates the nested path if absent.
   */
  addPhoto(
    projectId: string,
    objectiveId: string,
    descriptorId: string,
    maxTarget: number,
  ): void;

  /**
   * Set the confirmed state for a confirm-kind descriptor.
   * Idempotent if called with the same value.
   */
  setConfirm(
    projectId: string,
    objectiveId: string,
    descriptorId: string,
    confirmed: boolean,
  ): void;

  /**
   * Update the text for a note-kind descriptor. Also clears the saved flag
   * so "Save note" re-enables after any edit.
   */
  updateNote(
    projectId: string,
    objectiveId: string,
    descriptorId: string,
    text: string,
  ): void;

  /**
   * Mark the note for a descriptor as saved. A no-op when the note is already
   * saved; clears naturally on the next updateNote call.
   */
  saveNote(
    projectId: string,
    objectiveId: string,
    descriptorId: string,
  ): void;

  /**
   * Persist a vision form value (one formId -> text entry under the project).
   * Overwrites any previous value for that formId.
   */
  saveVisionForm(projectId: string, formId: string, text: string): void;

  /**
   * Persist a structured vision form value AND mirror a human-readable
   * summary string into visionForms[projectId][formId] (so the existing
   * "captured" / text readers keep working). Overwrites both for that formId.
   */
  saveVisionFormData(
    projectId: string,
    formId: string,
    value: FormValue,
    summaryText: string,
  ): void;

  /** Persist (overwrite) the rationale text for one decision item. */
  saveDecisionRationale(projectId: string, itemId: string, text: string): void;

  /** Set or clear the defer annotation for one decision item. Setting false deletes the key so the map stays sparse. */
  setDecisionDeferred(projectId: string, itemId: string, deferred: boolean): void;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Read an EvidenceCapture, defaulting to EMPTY_CAPTURE when absent. */
function readCapture(
  byProject: Record<string, ByObjective>,
  projectId: string,
  objectiveId: string,
): EvidenceCapture {
  return byProject[projectId]?.[objectiveId] ?? EMPTY_CAPTURE;
}

/** Immutably write a partial patch into the nested byProject structure. */
function patchCapture(
  byProject: Record<string, ByObjective>,
  projectId: string,
  objectiveId: string,
  patch: Partial<EvidenceCapture>,
): Record<string, ByObjective> {
  const current = readCapture(byProject, projectId, objectiveId);
  return {
    ...byProject,
    [projectId]: {
      ...(byProject[projectId] ?? {}),
      [objectiveId]: { ...current, ...patch },
    },
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useActEvidenceStore = create<ActEvidenceState>()(
  persist(
    (set, get) => ({
      byProject: {},
      visionForms: {},
      visionFormData: {},
      decisionRationale: {},
      deferredDecisions: {},

      addPhoto: (projectId, objectiveId, descriptorId, maxTarget) => {
        const current = readCapture(
          get().byProject,
          projectId,
          objectiveId,
        );
        const prev = current.photos[descriptorId] ?? 0;
        if (prev >= maxTarget) return; // already at cap -- no-op
        set((s) => ({
          byProject: patchCapture(s.byProject, projectId, objectiveId, {
            photos: { ...current.photos, [descriptorId]: prev + 1 },
          }),
        }));
      },

      setConfirm: (projectId, objectiveId, descriptorId, confirmed) =>
        set((s) => {
          const current = readCapture(s.byProject, projectId, objectiveId);
          if (current.confirms[descriptorId] === confirmed) return s; // no-op
          return {
            byProject: patchCapture(s.byProject, projectId, objectiveId, {
              confirms: { ...current.confirms, [descriptorId]: confirmed },
            }),
          };
        }),

      updateNote: (projectId, objectiveId, descriptorId, text) =>
        set((s) => {
          const current = readCapture(s.byProject, projectId, objectiveId);
          return {
            byProject: patchCapture(s.byProject, projectId, objectiveId, {
              notes: { ...current.notes, [descriptorId]: text },
              // Any edit clears the "saved" flag so the Save button re-enables.
              notesSaved: { ...current.notesSaved, [descriptorId]: false },
            }),
          };
        }),

      saveNote: (projectId, objectiveId, descriptorId) =>
        set((s) => {
          const current = readCapture(s.byProject, projectId, objectiveId);
          if (current.notesSaved[descriptorId]) return s; // already saved -- no-op
          return {
            byProject: patchCapture(s.byProject, projectId, objectiveId, {
              notesSaved: { ...current.notesSaved, [descriptorId]: true },
            }),
          };
        }),

      saveVisionForm: (projectId, formId, text) =>
        set((s) => ({
          visionForms: {
            ...s.visionForms,
            [projectId]: {
              ...(s.visionForms[projectId] ?? {}),
              [formId]: text,
            },
          },
        })),

      saveVisionFormData: (projectId, formId, value, summaryText) =>
        set((s) => ({
          visionFormData: {
            ...s.visionFormData,
            [projectId]: {
              ...(s.visionFormData[projectId] ?? {}),
              [formId]: value,
            },
          },
          // Mirror a readable summary into the legacy string map so the
          // existing "captured" / text readers keep working unchanged.
          visionForms: {
            ...s.visionForms,
            [projectId]: {
              ...(s.visionForms[projectId] ?? {}),
              [formId]: summaryText,
            },
          },
        })),

      saveDecisionRationale: (projectId, itemId, text) =>
        set((s) => ({
          decisionRationale: {
            ...s.decisionRationale,
            [projectId]: {
              ...(s.decisionRationale[projectId] ?? {}),
              [itemId]: text,
            },
          },
        })),

      setDecisionDeferred: (projectId, itemId, deferred) =>
        set((s) => {
          if (deferred) {
            return {
              deferredDecisions: {
                ...s.deferredDecisions,
                [projectId]: {
                  ...(s.deferredDecisions[projectId] ?? {}),
                  [itemId]: true,
                },
              },
            };
          }
          // Clearing: drop the itemId key so the map stays sparse. Safe no-op
          // when the project or item key is absent.
          const projectMap = s.deferredDecisions[projectId];
          if (!projectMap || !(itemId in projectMap)) return s;
          const { [itemId]: _removed, ...rest } = projectMap;
          return {
            deferredDecisions: {
              ...s.deferredDecisions,
              [projectId]: rest,
            },
          };
        }),
    }),
    {
      name: 'ogden-act-evidence',
      version: 3,
      // Passthrough migrate: a v1 blob has no visionFormData and a v2 blob has
      // no decisionRationale/deferredDecisions; zustand merges the persisted
      // object over the store creator's defaults, so missing fields backfill to
      // {} via the initializer (v1->v2 and v2->v3) when absent.
      migrate: (persisted) => persisted as never,
      partialize: (state) => ({
        byProject: state.byProject,
        visionForms: state.visionForms,
        visionFormData: state.visionFormData,
        decisionRationale: state.decisionRationale,
        deferredDecisions: state.deferredDecisions,
      }),
    },
  ),
);

rehydrateWithLogging(useActEvidenceStore);
