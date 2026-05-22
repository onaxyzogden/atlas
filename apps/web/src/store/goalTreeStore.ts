/**
 * Goal-tree store — per-project, persisted. Seeded from
 * `homesteadGoalTree.ts` on first access.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import type { GoalTree, SubGoal, SuccessCriterion } from '../v3/plan/data/goalCompassTypes.js';
import { HOMESTEAD_GOAL_TREE_TEMPLATE } from '../v3/plan/data/homesteadGoalTree.js';
import { getGoalTreeTemplate } from '../v3/plan/data/goalTreeTemplates.js';

interface GoalTreeState {
  goalTreesByProject: Record<string, GoalTree>;
  /**
   * Per-project set of intervention ids the steward has confirmed
   * removed via the Impact Preview panel. The sequencing engine
   * filters its catalog by this set on every regenerate.
   */
  excludedInterventionsByProject: Record<string, string[]>;

  ensureDefault: (projectId: string, projectType?: string | null) => void;
  switchTemplate: (projectId: string, projectType: string) => void;
  getGoalTree: (projectId: string) => GoalTree | null;
  setParentGoal: (projectId: string, patch: Partial<GoalTree['parentGoal']>) => void;
  updateSubGoal: (projectId: string, subGoalId: string, patch: Partial<SubGoal>) => void;
  updateCriterion: (
    projectId: string,
    subGoalId: string,
    criterionId: string,
    patch: Partial<SuccessCriterion>,
  ) => void;
  addCriterion: (projectId: string, subGoalId: string, criterion: SuccessCriterion) => void;
  removeCriterion: (projectId: string, subGoalId: string, criterionId: string) => void;
  resetToHomesteadTemplate: (projectId: string) => void;
  excludeIntervention: (projectId: string, interventionId: string) => void;
  clearExclusions: (projectId: string) => void;
}

function cloneTemplate(projectType?: string | null): GoalTree {
  const template = projectType
    ? getGoalTreeTemplate(projectType)
    : HOMESTEAD_GOAL_TREE_TEMPLATE;
  return JSON.parse(JSON.stringify(template)) as GoalTree;
}

export const useGoalTreeStore = create<GoalTreeState>()(
  persist(
    (set, get) => ({
      goalTreesByProject: {},
      excludedInterventionsByProject: {},

      ensureDefault: (projectId, projectType) => {
        if (get().goalTreesByProject[projectId]) return;
        set((s) => ({
          goalTreesByProject: {
            ...s.goalTreesByProject,
            [projectId]: cloneTemplate(projectType),
          },
        }));
      },

      switchTemplate: (projectId, projectType) =>
        set((s) => ({
          goalTreesByProject: {
            ...s.goalTreesByProject,
            [projectId]: cloneTemplate(projectType),
          },
        })),

      excludeIntervention: (projectId, interventionId) =>
        set((s) => {
          const cur = s.excludedInterventionsByProject[projectId] ?? [];
          if (cur.includes(interventionId)) return {};
          return {
            excludedInterventionsByProject: {
              ...s.excludedInterventionsByProject,
              [projectId]: [...cur, interventionId],
            },
          };
        }),

      clearExclusions: (projectId) =>
        set((s) => {
          if (!s.excludedInterventionsByProject[projectId]?.length) return {};
          const next = { ...s.excludedInterventionsByProject };
          delete next[projectId];
          return { excludedInterventionsByProject: next };
        }),

      getGoalTree: (projectId) => get().goalTreesByProject[projectId] ?? null,

      setParentGoal: (projectId, patch) =>
        set((s) => {
          const tree = s.goalTreesByProject[projectId];
          if (!tree) return {};
          return {
            goalTreesByProject: {
              ...s.goalTreesByProject,
              [projectId]: {
                ...tree,
                parentGoal: { ...tree.parentGoal, ...patch },
              },
            },
          };
        }),

      updateSubGoal: (projectId, subGoalId, patch) =>
        set((s) => {
          const tree = s.goalTreesByProject[projectId];
          if (!tree) return {};
          return {
            goalTreesByProject: {
              ...s.goalTreesByProject,
              [projectId]: {
                ...tree,
                subGoals: tree.subGoals.map((sg) =>
                  sg.id === subGoalId ? { ...sg, ...patch } : sg,
                ),
              },
            },
          };
        }),

      updateCriterion: (projectId, subGoalId, criterionId, patch) =>
        set((s) => {
          const tree = s.goalTreesByProject[projectId];
          if (!tree) return {};
          return {
            goalTreesByProject: {
              ...s.goalTreesByProject,
              [projectId]: {
                ...tree,
                subGoals: tree.subGoals.map((sg) =>
                  sg.id !== subGoalId
                    ? sg
                    : {
                        ...sg,
                        criteria: sg.criteria.map((c) =>
                          c.id === criterionId ? { ...c, ...patch } : c,
                        ),
                      },
                ),
              },
            },
          };
        }),

      addCriterion: (projectId, subGoalId, criterion) =>
        set((s) => {
          const tree = s.goalTreesByProject[projectId];
          if (!tree) return {};
          return {
            goalTreesByProject: {
              ...s.goalTreesByProject,
              [projectId]: {
                ...tree,
                subGoals: tree.subGoals.map((sg) =>
                  sg.id !== subGoalId ? sg : { ...sg, criteria: [...sg.criteria, criterion] },
                ),
              },
            },
          };
        }),

      removeCriterion: (projectId, subGoalId, criterionId) =>
        set((s) => {
          const tree = s.goalTreesByProject[projectId];
          if (!tree) return {};
          return {
            goalTreesByProject: {
              ...s.goalTreesByProject,
              [projectId]: {
                ...tree,
                subGoals: tree.subGoals.map((sg) =>
                  sg.id !== subGoalId
                    ? sg
                    : { ...sg, criteria: sg.criteria.filter((c) => c.id !== criterionId) },
                ),
              },
            },
          };
        }),

      resetToHomesteadTemplate: (projectId) =>
        set((s) => ({
          goalTreesByProject: { ...s.goalTreesByProject, [projectId]: cloneTemplate() },
        })),
    }),
    {
      name: 'ogden-goal-trees',
      version: 1,
      partialize: (state) => ({
        goalTreesByProject: state.goalTreesByProject,
        excludedInterventionsByProject: state.excludedInterventionsByProject,
      }),
    },
  ),
);

rehydrateWithLogging(useGoalTreeStore);
