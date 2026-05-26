/**
 * observeHowChecksStore — per-project per-domain checklist state for the
 * Observe right-rail GuidanceCard "How" steps (slice 3b+3c: rebased onto
 * UniversalDomain).
 *
 * Persist v1→v2: collapses legacy 7-id ObserveModule keys to the 16
 * UniversalDomain ids. Observe is collision-free, so the mergeFn is a
 * pass-through (always called with parts.length === 1).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UniversalDomain } from '@ogden/shared';
import { migrateByProjectModuleKeys, type MergeFn } from '@ogden/shared';
import type { ObserveModule } from '../v3/observe/types.js';

type ModuleChecks = Partial<Record<ObserveModule, number[]>>;

/**
 * HOW-step counts at the moment of the v1→v2 cutover. Immutable migration
 * constants — must NOT drift if MODULE_GUIDANCE.how is edited later.
 */
const HOW_STEP_COUNTS: Record<string, number> = {
  'human-context': 3,
  'built-environment': 4,
  'macroclimate-hazards': 2,
  'topography': 3,
  'earth-water-ecology': 3,
  'sectors-zones': 2,
  'swot-synthesis': 2,
};

const howChecksMergeFn: MergeFn<number[]> = (_domain, parts) => {
  const out: number[] = [];
  let offset = 0;
  for (const { moduleId, value } of parts) {
    for (const idx of value) out.push(idx + offset);
    offset += HOW_STEP_COUNTS[moduleId] ?? 0;
  }
  return out.sort((a, b) => a - b);
};

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
      version: 2,
      migrate: (persisted, version) => {
        if (version < 2) {
          const migrated = migrateByProjectModuleKeys<number[]>(
            persisted,
            'observe',
            howChecksMergeFn,
          );
          if (migrated) {
            return {
              ...(persisted as object),
              byProject: migrated.byProject,
            } as ObserveHowChecksState;
          }
          return { byProject: {} } as ObserveHowChecksState;
        }
        return persisted as ObserveHowChecksState;
      },
    },
  ),
);
