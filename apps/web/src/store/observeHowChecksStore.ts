/**
 * observeHowChecksStore — per-project per-module checklist state for the
 * Observe right-rail GuidanceCard "How" steps.
 *
 * Each module has a fixed-length list of How steps (defined in
 * ObserveChecklistAside.tsx → MODULE_GUIDANCE). This store persists which
 * step indices the user has marked complete. Data is local-only; pattern
 * mirrors homesteadStore.ts.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ObserveModule } from '../v3/observe/types.js';

type ModuleChecks = Partial<Record<ObserveModule, number[]>>;

export interface ObserveHowChecksState {
  byProject: Record<string, ModuleChecks>;
  toggle: (
    projectId: string,
    module: ObserveModule,
    stepIndex: number,
  ) => void;
  isChecked: (
    projectId: string,
    module: ObserveModule,
    stepIndex: number,
  ) => boolean;
  reset: (projectId: string, module?: ObserveModule) => void;
}

export const useObserveHowChecksStore = create<ObserveHowChecksState>()(
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
      name: 'ogden-atlas-observe-how-checks',
      version: 1,
      migrate: (persisted) => persisted as ObserveHowChecksState,
    },
  ),
);
