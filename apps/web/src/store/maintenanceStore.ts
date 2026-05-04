/**
 * Maintenance store — ACT-stage Module 3 (Maintenance & Operations).
 *
 * Recurring stewardship tasks bucketed by cadence (daily / weekly / monthly /
 * quarterly / annual). Each task can link to a feature (zone, crop area,
 * structure, path) so the steward can answer "what does this orchard need
 * this week?" rather than scrolling a flat list.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MaintenanceCadence = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
export type MaintenanceSeason = 'winter' | 'spring' | 'summer' | 'fall';

export interface MaintenanceTask {
  id: string;
  projectId: string;
  title: string;
  cadence: MaintenanceCadence;
  /** Optional season constraint (e.g. annual prune in winter). */
  season?: MaintenanceSeason;
  /**
   * Optional id of a feature this task is tied to (zone / crop / structure /
   * path). Free string so we don't couple to any specific store; the linking
   * card is responsible for showing a friendly label.
   */
  linkedFeatureId?: string;
  notes?: string;
  /** ISO timestamp last "Mark done" was clicked. */
  lastDoneAt?: string;
}

interface MaintenanceState {
  tasks: MaintenanceTask[];
  addTask: (t: MaintenanceTask) => void;
  updateTask: (id: string, patch: Partial<MaintenanceTask>) => void;
  removeTask: (id: string) => void;
  markDone: (id: string, isoDate?: string) => void;
}

export const useMaintenanceStore = create<MaintenanceState>()(
  persist(
    (set) => ({
      tasks: [],
      addTask: (t) => set((s) => ({ tasks: [...s.tasks, t] })),
      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      markDone: (id, isoDate) => {
        const stamp = isoDate ?? new Date().toISOString();
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, lastDoneAt: stamp } : t)),
        }));
      },
    }),
    { name: 'ogden-act-maintenance', version: 1 },
  ),
);

useMaintenanceStore.persist.rehydrate();
