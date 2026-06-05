/**
 * machineryInventoryStore — per-project machinery / equipment inventory for
 * the Plan stage Machinery module.
 *
 * Mirrors planProjectTypeChecklistStore's persist/shape pattern. Each item
 * captures a tractor, implement, mower, hand tool, or other piece of rolling
 * stock with its width / turn radius (used by the Access-fit card to
 * stress-test against drawn paths/gates) and its housing assignment (used by
 * the Housing & fuel card to surface orphans).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';

export type MachineryKind =
  | 'tractor'
  | 'implement'
  | 'mower'
  | 'hand-tool'
  | 'other';

export type MachineryFrequency =
  | 'daily'
  | 'weekly'
  | 'seasonal'
  | 'standby';

export type MachineryFuelType =
  | 'diesel'
  | 'petrol'
  | 'electric'
  | 'human-powered'
  | 'other';

export interface MachineryItem {
  id: string;
  name: string;
  kind: MachineryKind;
  purpose: string;
  frequency: MachineryFrequency;
  requiredWidthM?: number;
  requiredTurnRadiusM?: number;
  fuelType: MachineryFuelType;
  /** designElementsStore id (machinery-shed | equipment-yard | barn | shed). */
  housingElementId?: string;
  /** Year the item was acquired — feeds Phase C replacement-schedule math. */
  acquisitionYear?: number;
  /** Estimated useful lifespan in years — feeds Phase C replacement-schedule math. */
  lifecycleYearsEstimate?: number;
}

export interface MachineryInventoryState {
  byProject: Record<string, MachineryItem[]>;
  add: (projectId: string, item: MachineryItem) => void;
  update: (projectId: string, id: string, patch: Partial<MachineryItem>) => void;
  remove: (projectId: string, id: string) => void;
  assignHousing: (
    projectId: string,
    id: string,
    housingElementId: string | null,
  ) => void;
}

export const useMachineryInventoryStore = create<MachineryInventoryState>()(
  persist(
    (set) => ({
      byProject: {},
      add: (projectId, item) =>
        set((s) => {
          const list = s.byProject[projectId] ?? [];
          return {
            byProject: {
              ...s.byProject,
              [projectId]: [...list, item],
            },
          };
        }),
      update: (projectId, id, patch) =>
        set((s) => {
          const list = s.byProject[projectId] ?? [];
          return {
            byProject: {
              ...s.byProject,
              [projectId]: list.map((it) =>
                it.id === id ? { ...it, ...patch } : it,
              ),
            },
          };
        }),
      remove: (projectId, id) =>
        set((s) => {
          const list = s.byProject[projectId] ?? [];
          return {
            byProject: {
              ...s.byProject,
              [projectId]: list.filter((it) => it.id !== id),
            },
          };
        }),
      assignHousing: (projectId, id, housingElementId) =>
        set((s) => {
          const list = s.byProject[projectId] ?? [];
          return {
            byProject: {
              ...s.byProject,
              [projectId]: list.map((it) =>
                it.id === id
                  ? {
                      ...it,
                      housingElementId: housingElementId ?? undefined,
                    }
                  : it,
              ),
            },
          };
        }),
    }),
    {
      name: 'ogden-atlas-machinery-inventory-v1',
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      version: 1,
      migrate: (persisted) => persisted as MachineryInventoryState,
    },
  ),
);

export function newMachineryId(): string {
  // UUID so the same id round-trips to the backend `machinery_items` table.
  return crypto.randomUUID();
}
