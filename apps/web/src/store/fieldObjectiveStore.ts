/**
 * fieldObjectiveStore — per-project, persisted run state for FieldObjectives.
 * The static catalog (titles, targets, tools, checklist specs) lives in
 * `seedObjectives.ts`; this store owns only the *mutable* half a steward
 * produces while working: ticked checklist items, captured evidence, the
 * summary note, and the lifecycle status. Keyed `byProject[projectId]
 * [objectiveId]`. Mirrors the catalog/run split of the compass evidence model.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import {
  emptyObjectiveRun,
  type CapturedEvidence,
  type EvidenceKind,
  type ObjectiveRun,
  type ObjectiveStatus,
} from '../v3/objectives/fieldObjective.js';

type RunsByObjective = Record<string, ObjectiveRun>;

interface FieldObjectiveState {
  byProject: Record<string, RunsByObjective>;

  /** Read a run, falling back to a fresh empty run (never undefined). */
  getRun: (projectId: string, objectiveId: string) => ObjectiveRun;
  /** Toggle a checklist item; promotes status to in-progress on first touch. */
  toggleCheck: (projectId: string, objectiveId: string, itemId: string) => void;
  /** Append a captured evidence item. */
  addEvidence: (
    projectId: string,
    objectiveId: string,
    evidence: { specId: string; kind: EvidenceKind; value: string },
  ) => void;
  /** Remove one captured evidence item by index. */
  removeEvidence: (
    projectId: string,
    objectiveId: string,
    index: number,
  ) => void;
  /** Set the summary note. */
  setSummary: (projectId: string, objectiveId: string, summary: string) => void;
  /** Set the lifecycle status explicitly. */
  setStatus: (
    projectId: string,
    objectiveId: string,
    status: ObjectiveStatus,
  ) => void;
}

const now = () => new Date().toISOString();

export const useFieldObjectiveStore = create<FieldObjectiveState>()(
  persist(
    (set, get) => {
      /** Apply a mutation to one objective's run, stamping updatedAt. */
      const patch = (
        projectId: string,
        objectiveId: string,
        fn: (run: ObjectiveRun) => ObjectiveRun,
      ) =>
        set((s) => {
          const project = s.byProject[projectId] ?? {};
          const existing = project[objectiveId] ?? emptyObjectiveRun();
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...project,
                [objectiveId]: { ...fn(existing), updatedAt: now() },
              },
            },
          };
        });

      return {
        byProject: {},

        getRun: (projectId, objectiveId) =>
          get().byProject[projectId]?.[objectiveId] ?? emptyObjectiveRun(),

        toggleCheck: (projectId, objectiveId, itemId) =>
          patch(projectId, objectiveId, (run) => {
            const checked = run.checkedChecklist.includes(itemId)
              ? run.checkedChecklist.filter((id) => id !== itemId)
              : [...run.checkedChecklist, itemId];
            return {
              ...run,
              checkedChecklist: checked,
              status: run.status === 'not-started' ? 'in-progress' : run.status,
            };
          }),

        addEvidence: (projectId, objectiveId, evidence) =>
          patch(projectId, objectiveId, (run) => {
            const captured: CapturedEvidence = {
              specId: evidence.specId,
              kind: evidence.kind,
              value: evidence.value,
              capturedAt: now(),
            };
            return {
              ...run,
              evidence: [...run.evidence, captured],
              status: run.status === 'not-started' ? 'in-progress' : run.status,
            };
          }),

        removeEvidence: (projectId, objectiveId, index) =>
          patch(projectId, objectiveId, (run) => ({
            ...run,
            evidence: run.evidence.filter((_, i) => i !== index),
          })),

        setSummary: (projectId, objectiveId, summary) =>
          patch(projectId, objectiveId, (run) => ({
            ...run,
            summary,
            status: run.status === 'not-started' ? 'in-progress' : run.status,
          })),

        setStatus: (projectId, objectiveId, status) =>
          patch(projectId, objectiveId, (run) => ({ ...run, status })),
      };
    },
    {
      name: 'ogden-field-objectives',
      version: 1,
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(useFieldObjectiveStore);
