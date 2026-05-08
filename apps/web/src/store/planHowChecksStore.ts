/**
 * planHowChecksStore — per-project per-module checklist state for the
 * Plan right-rail GuidanceCard "How" steps.
 *
 * Mirrors observeHowChecksStore. Each Plan module has a fixed-length list
 * of How steps (defined in PlanChecklistAside.tsx → PLAN_MODULE_GUIDANCE);
 * this store persists which step indices the user has marked complete.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PlanModule } from '../v3/plan/types.js';

type ModuleChecks = Partial<Record<PlanModule, number[]>>;

export interface PlanHowChecksState {
  byProject: Record<string, ModuleChecks>;
  toggle: (
    projectId: string,
    module: PlanModule,
    stepIndex: number,
  ) => void;
  isChecked: (
    projectId: string,
    module: PlanModule,
    stepIndex: number,
  ) => boolean;
  reset: (projectId: string, module?: PlanModule) => void;
}

export const usePlanHowChecksStore = create<PlanHowChecksState>()(
  persist(
    (set, get) => ({
      byProject: {},
      toggle: (projectId, module, stepIndex) =>
        set((s) => {
          const project = s.byProject[projectId] ?? {};
          const list = project[module] ?? [];
          const next = list.includes(stepIndex)
            ? list.filter((i) => i !== stepIndex)
            : [...list, stepIndex].sort((a, b) => a - b);
          return {
            byProject: {
              ...s.byProject,
              [projectId]: { ...project, [module]: next },
            },
          };
        }),
      isChecked: (projectId, module, stepIndex) => {
        const list = get().byProject[projectId]?.[module];
        return Array.isArray(list) && list.includes(stepIndex);
      },
      reset: (projectId, module) =>
        set((s) => {
          const project = s.byProject[projectId];
          if (!project) return s;
          if (!module) {
            const next = { ...s.byProject };
            delete next[projectId];
            return { byProject: next };
          }
          const nextProject = { ...project };
          delete nextProject[module];
          return {
            byProject: { ...s.byProject, [projectId]: nextProject },
          };
        }),
    }),
    {
      name: 'ogden-atlas-plan-how-checks',
      version: 1,
      migrate: (persisted) => persisted as PlanHowChecksState,
    },
  ),
);
