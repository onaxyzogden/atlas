/**
 * objectiveSummaryStore — per-stage, per-project, per-module free-text summary
 * note for the unified objective card.
 *
 * Plan (a design stage) completes objectives with a checklist + a short summary
 * note rather than photo evidence. This store persists that note. It is
 * deliberately stage-generic (`byStage → byProject → byModule → string`) so the
 * Act stage can reuse it verbatim once its objective workspace is wired — the
 * only stage-specific knowledge is the `stage` key passed by each adapter.
 *
 * Module ids differ per stage (PlanModule / ObserveModule / ActModule), so the
 * module key is typed as a plain string here; callers pass their own module id.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ObjectiveStage = 'plan' | 'observe' | 'act';

type ModuleSummaries = Record<string, string>;
type ProjectSummaries = Record<string, ModuleSummaries>;

export interface ObjectiveSummaryState {
  byStage: Partial<Record<ObjectiveStage, ProjectSummaries>>;
  getSummary: (
    stage: ObjectiveStage,
    projectId: string,
    module: string,
  ) => string;
  setSummary: (
    stage: ObjectiveStage,
    projectId: string,
    module: string,
    text: string,
  ) => void;
  reset: (
    stage: ObjectiveStage,
    projectId: string,
    module?: string,
  ) => void;
}

export const useObjectiveSummaryStore = create<ObjectiveSummaryState>()(
  persist(
    (set, get) => ({
      byStage: {},
      getSummary: (stage, projectId, module) =>
        get().byStage[stage]?.[projectId]?.[module] ?? '',
      setSummary: (stage, projectId, module, text) =>
        set((s) => {
          const stageMap = s.byStage[stage] ?? {};
          const project = stageMap[projectId] ?? {};
          return {
            byStage: {
              ...s.byStage,
              [stage]: {
                ...stageMap,
                [projectId]: { ...project, [module]: text },
              },
            },
          };
        }),
      reset: (stage, projectId, module) =>
        set((s) => {
          const stageMap = s.byStage[stage];
          if (!stageMap || !stageMap[projectId]) return s;
          if (!module) {
            const nextStage = { ...stageMap };
            delete nextStage[projectId];
            return { byStage: { ...s.byStage, [stage]: nextStage } };
          }
          const nextProject = { ...stageMap[projectId] };
          delete nextProject[module];
          return {
            byStage: {
              ...s.byStage,
              [stage]: { ...stageMap, [projectId]: nextProject },
            },
          };
        }),
    }),
    {
      name: 'ogden-atlas-objective-summaries',
      version: 1,
      migrate: (persisted) => persisted as ObjectiveSummaryState,
    },
  ),
);
