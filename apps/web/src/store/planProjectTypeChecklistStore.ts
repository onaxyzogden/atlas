/**
 * planProjectTypeChecklistStore — per-project state for the Plan right-rail
 * "Project Type" template checklist card.
 *
 * Mirrors planHowChecksStore's persist/shape pattern. Each project tracks:
 *   - which project-type template the steward has selected (independent of
 *     project.projectType — the picker lives on the card itself).
 *   - which template-item indices have been checked off, scoped per type
 *     (so toggling type doesn't lose progress on the previous type).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PlanProjectTypeKey } from '../v3/plan/data/planProjectTypeTemplates.js';

interface ProjectState {
  selectedType: PlanProjectTypeKey | null;
  checks: Partial<Record<PlanProjectTypeKey, number[]>>;
}

export interface PlanProjectTypeChecklistState {
  byProject: Record<string, ProjectState>;
  setSelectedType: (
    projectId: string,
    type: PlanProjectTypeKey | null,
  ) => void;
  toggle: (
    projectId: string,
    type: PlanProjectTypeKey,
    itemIndex: number,
  ) => void;
  reset: (projectId: string) => void;
}

const EMPTY_PROJECT: ProjectState = { selectedType: null, checks: {} };

export const usePlanProjectTypeChecklistStore = create<PlanProjectTypeChecklistState>()(
  persist(
    (set) => ({
      byProject: {},
      setSelectedType: (projectId, type) =>
        set((s) => {
          const project = s.byProject[projectId] ?? EMPTY_PROJECT;
          return {
            byProject: {
              ...s.byProject,
              [projectId]: { ...project, selectedType: type },
            },
          };
        }),
      toggle: (projectId, type, itemIndex) =>
        set((s) => {
          const project = s.byProject[projectId] ?? EMPTY_PROJECT;
          const list = project.checks[type] ?? [];
          const next = list.includes(itemIndex)
            ? list.filter((i) => i !== itemIndex)
            : [...list, itemIndex].sort((a, b) => a - b);
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...project,
                checks: { ...project.checks, [type]: next },
              },
            },
          };
        }),
      reset: (projectId) =>
        set((s) => {
          if (!s.byProject[projectId]) return s;
          const next = { ...s.byProject };
          delete next[projectId];
          return { byProject: next };
        }),
    }),
    {
      name: 'ogden-atlas-plan-project-type-checklist',
      version: 1,
      migrate: (persisted) => persisted as PlanProjectTypeChecklistState,
    },
  ),
);
