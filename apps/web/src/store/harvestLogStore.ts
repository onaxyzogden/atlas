/**
 * Harvest log store — ACT-stage Module 4 (Yield Tracking).
 *
 * "Obtain a yield" is one of Holmgren's twelve principles. This store
 * captures actual harvests (food / medicine / fuel / fibre) per crop area
 * over time. The `HarvestLogCard` totals quantities by unit per crop area.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type HarvestUnit = 'kg' | 'lb' | 'count' | 'L';
export type HarvestQuality = 'A' | 'B' | 'C';

export interface HarvestEntry {
  id: string;
  projectId: string;
  /** `cropStore.CropArea.id` — the source area for this harvest. */
  cropAreaId: string;
  /** ISO date of harvest. */
  date: string;
  quantity: number;
  unit: HarvestUnit;
  /** Optional grade for sortable, market-bound yields. */
  quality?: HarvestQuality;
  notes?: string;
}

interface HarvestLogState {
  entries: HarvestEntry[];
  addEntry: (e: HarvestEntry) => void;
  updateEntry: (id: string, patch: Partial<HarvestEntry>) => void;
  removeEntry: (id: string) => void;
}

export const useHarvestLogStore = create<HarvestLogState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (e) => set((s) => ({ entries: [...s.entries, e] })),
      updateEntry: (id, patch) =>
        set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    }),
    { name: 'ogden-act-harvest-log', version: 1 },
  ),
);

useHarvestLogStore.persist.rehydrate();
