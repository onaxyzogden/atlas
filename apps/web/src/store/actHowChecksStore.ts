/**
 * actHowChecksStore — per-project per-domain checklist state for the
 * Act right-rail GuidanceCard "How" steps (slice 3b+3c: rebased onto
 * UniversalDomain).
 *
 * Persist v1→v2: collapses legacy 8-id ActModule keys to the 16
 * UniversalDomain ids. Two collision groups apply concat-with-offset:
 *   built-infrastructure ← build + maintain
 *   monitoring-records   ← tracker + review
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import { migrateByProjectModuleKeys, type MergeFn } from '@ogden/shared';
import type { ActModule } from '../v3/act/types.js';

type ModuleChecks = Partial<Record<ActModule, number[]>>;

/**
 * HOW-step counts at the moment of the v1→v2 cutover. Act: every legacy
 * module = 3. Immutable migration constants.
 */
const HOW_STEP_COUNTS: Record<string, number> = {
  'tracker': 3,
  'build': 3,
  'maintain': 3,
  'livestock': 3,
  'harvest': 3,
  'review': 3,
  'network': 3,
  'schedule': 3,
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

export interface ActHowChecksState {
  byProject: Record<string, ModuleChecks>;
  toggle: (
    projectId: string,
    module: ActModule,
    stepIndex: number,
  ) => void;
  isChecked: (
    projectId: string,
    module: ActModule,
    stepIndex: number,
  ) => boolean;
  reset: (projectId: string, module?: ActModule) => void;
}

export const useActHowChecksStore = create<ActHowChecksState>()(
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
      name: 'ogden-atlas-act-how-checks',
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      version: 2,
      migrate: (persisted, version) => {
        if (version < 2) {
          const migrated = migrateByProjectModuleKeys<number[]>(
            persisted,
            'act',
            howChecksMergeFn,
          );
          if (migrated) {
            return {
              ...(persisted as object),
              byProject: migrated.byProject,
            } as ActHowChecksState;
          }
          return { byProject: {} } as ActHowChecksState;
        }
        return persisted as ActHowChecksState;
      },
    },
  ),
);
