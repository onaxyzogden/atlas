/**
 * planHowChecksStore — per-project per-domain checklist state for the
 * Plan right-rail GuidanceCard "How" steps (slice 3b+3c: rebased onto
 * UniversalDomain).
 *
 * Persist v1→v2: collapses legacy 15-id PlanModule keys to the 16
 * UniversalDomain ids. Three collision groups apply concat-with-offset.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import { migrateByProjectModuleKeys, type MergeFn } from '@ogden/shared';
import type { PlanModule } from '../v3/plan/types.js';

type ModuleChecks = Partial<Record<PlanModule, number[]>>;

/**
 * HOW-step counts at the moment of the v1→v2 cutover. Plan: every legacy
 * module = 3. Immutable migration constants.
 */
const HOW_STEP_COUNTS: Record<string, number> = {
  'goal-compass': 3,
  'dynamic-layering': 3,
  'water-management': 3,
  'zone-circulation': 3,
  'structures-subsystems': 3,
  'machinery': 3,
  'livestock': 3,
  'plant-systems': 3,
  'soil-fertility': 3,
  'cross-section-solar': 3,
  'phasing-budgeting': 3,
  'principle-verification': 3,
  'regeneration-monitor': 3,
  'habitat-allocation': 3,
  'biodiversity-monitor': 3,
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
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      version: 2,
      migrate: (persisted, version) => {
        if (version < 2) {
          const migrated = migrateByProjectModuleKeys<number[]>(
            persisted,
            'plan',
            howChecksMergeFn,
          );
          if (migrated) {
            return {
              ...(persisted as object),
              byProject: migrated.byProject,
            } as PlanHowChecksState;
          }
          return { byProject: {} } as PlanHowChecksState;
        }
        return persisted as PlanHowChecksState;
      },
    },
  ),
);
