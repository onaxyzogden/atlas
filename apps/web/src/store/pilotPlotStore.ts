/**
 * Pilot-plot store — ACT-stage Module 2 (Small-and-Slow piloting).
 *
 * The "Use small and slow solutions" Holmgren principle says: test on a
 * small plot before committing the whole site. This store tracks those
 * experiments — what was tried, what was learned, whether to scale.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PilotStatus = 'running' | 'success' | 'fail' | 'inconclusive';

export interface PilotPlot {
  id: string;
  projectId: string;
  title: string;
  hypothesis: string;
  /** Plot footprint in square metres (steward-entered, no validation). */
  plotSizeM2: number;
  /** ISO date. */
  startDate: string;
  /** ISO date — undefined while pilot is still running. */
  endDate?: string;
  status: PilotStatus;
  /** Free-text takeaways; populated as the pilot progresses. */
  learnings?: string;
}

interface PilotPlotState {
  pilots: PilotPlot[];
  addPilot: (p: PilotPlot) => void;
  updatePilot: (id: string, patch: Partial<PilotPlot>) => void;
  removePilot: (id: string) => void;
}

export const usePilotPlotStore = create<PilotPlotState>()(
  persist(
    (set) => ({
      pilots: [],
      addPilot: (p) => set((s) => ({ pilots: [...s.pilots, p] })),
      updatePilot: (id, patch) =>
        set((s) => ({ pilots: s.pilots.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removePilot: (id) => set((s) => ({ pilots: s.pilots.filter((p) => p.id !== id) })),
    }),
    { name: 'ogden-act-pilots', version: 1 },
  ),
);

usePilotPlotStore.persist.rehydrate();
