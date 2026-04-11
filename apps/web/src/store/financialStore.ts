/**
 * Financial store — user-configurable inputs for the financial modeling engine.
 *
 * Stores region selection, mission weights, and per-item cost/revenue overrides.
 * Computed results live in the useFinancialModel hook, not here.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CostRange, CostRegion, MissionWeights } from '../features/financial/engine/types.js';

interface FinancialState {
  region: CostRegion;
  missionWeights: MissionWeights;
  costOverrides: Record<string, Partial<CostRange>>;
  revenueOverrides: Record<string, Partial<CostRange>>;

  setRegion: (region: CostRegion) => void;
  setMissionWeights: (weights: MissionWeights) => void;
  setCostOverride: (itemId: string, override: Partial<CostRange>) => void;
  setRevenueOverride: (streamId: string, override: Partial<CostRange>) => void;
  clearOverrides: () => void;
}

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set) => ({
      region: 'ca-ontario',
      missionWeights: { financial: 0.4, ecological: 0.25, spiritual: 0.2, community: 0.15 },
      costOverrides: {},
      revenueOverrides: {},

      setRegion: (region) => set({ region }),
      setMissionWeights: (missionWeights) => set({ missionWeights }),
      setCostOverride: (itemId, override) =>
        set((s) => ({ costOverrides: { ...s.costOverrides, [itemId]: override } })),
      setRevenueOverride: (streamId, override) =>
        set((s) => ({ revenueOverrides: { ...s.revenueOverrides, [streamId]: override } })),
      clearOverrides: () => set({ costOverrides: {}, revenueOverrides: {} }),
    }),
    {
      name: 'ogden-financial',
      version: 1,
      partialize: (state) => ({
        region: state.region,
        missionWeights: state.missionWeights,
        costOverrides: state.costOverrides,
        revenueOverrides: state.revenueOverrides,
      }),
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
useFinancialStore.persist.rehydrate();
