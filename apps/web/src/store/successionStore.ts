/**
 * Succession store — ACT-stage Module 4 (Ecological Monitoring & Yield).
 *
 * Multi-year canopy / pioneer-species milestones per zone. Permaculture
 * systems evolve from pioneer → mid → climax over decades; this store
 * captures the steward's dated observations so the `SuccessionTrackerCard`
 * can render a vertical timeline per zone.
 *
 * Photos are stored inline as data-URLs in v1 (small, single-user). A
 * future ADR will move to object storage if photo volume grows.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SuccessionPhase = 'pioneer' | 'mid' | 'climax';

export interface SuccessionMilestone {
  id: string;
  projectId: string;
  /** `zoneStore.Zone.id` — optional so site-wide milestones are possible. */
  zoneId?: string;
  /** Year of observation (e.g. 2028). Free integer, no validation. */
  year: number;
  phase: SuccessionPhase;
  observation: string;
  /** Optional inline photo (data-URL). */
  photoDataUrl?: string;
}

interface SuccessionState {
  milestones: SuccessionMilestone[];
  addMilestone: (m: SuccessionMilestone) => void;
  updateMilestone: (id: string, patch: Partial<SuccessionMilestone>) => void;
  removeMilestone: (id: string) => void;
}

export const useSuccessionStore = create<SuccessionState>()(
  persist(
    (set) => ({
      milestones: [],
      addMilestone: (m) => set((s) => ({ milestones: [...s.milestones, m] })),
      updateMilestone: (id, patch) =>
        set((s) => ({
          milestones: s.milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      removeMilestone: (id) =>
        set((s) => ({ milestones: s.milestones.filter((m) => m.id !== id) })),
    }),
    { name: 'ogden-act-succession', version: 1 },
  ),
);

useSuccessionStore.persist.rehydrate();
