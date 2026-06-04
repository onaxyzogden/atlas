/**
 * Financial store — user-configurable inputs for the financial modeling engine.
 *
 * Stores region selection, mission weights, and per-item cost/revenue overrides.
 * Computed results live in the useFinancialModel hook, not here.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import type { CostRange, CostRegion, MissionWeights } from '../features/financial/engine/types.js';
import type { SubstitutionMetaEntry } from '../v3/plan/cards/phasing-budgeting/materialSubstitutionMath.js';

interface FinancialState {
  region: CostRegion;
  /**
   * Steward override for the stewardship-program cashflow cost region.
   * `null` ⇒ auto-derive from the project's location (see `deriveCostRegion`).
   */
  stewardshipCostRegion: CostRegion | null;
  missionWeights: MissionWeights;
  costOverrides: Record<string, Partial<CostRange>>;
  revenueOverrides: Record<string, Partial<CostRange>>;
  /**
   * Non-cost metadata for applied material substitutions (Rec #5 v2), keyed
   * by cost line-item id. Cost still flows through `costOverrides`; this
   * carries the ecological uplift + establishment-time deltas the v2 wiring
   * activates. Additive optional field — old persisted state (v1) simply
   * lacks it and defaults to `{}`. COVENANT: uplift here feeds the ecological
   * mission component only, never financial.
   */
  substitutionMeta: Record<string, SubstitutionMetaEntry>;

  setRegion: (region: CostRegion) => void;
  setStewardshipCostRegion: (region: CostRegion | null) => void;
  setMissionWeights: (weights: MissionWeights) => void;
  setCostOverride: (itemId: string, override: Partial<CostRange>) => void;
  clearCostOverride: (itemId: string) => void;
  setRevenueOverride: (streamId: string, override: Partial<CostRange>) => void;
  setSubstitutionMeta: (itemId: string, entry: SubstitutionMetaEntry) => void;
  clearSubstitutionMeta: (itemId: string) => void;
  clearOverrides: () => void;
}

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set) => ({
      region: 'ca-ontario',
      stewardshipCostRegion: null,
      missionWeights: { financial: 0.4, ecological: 0.25, spiritual: 0.2, community: 0.15 },
      costOverrides: {},
      revenueOverrides: {},
      substitutionMeta: {},

      setRegion: (region) => set({ region }),
      setStewardshipCostRegion: (stewardshipCostRegion) => set({ stewardshipCostRegion }),
      setMissionWeights: (missionWeights) => set({ missionWeights }),
      setCostOverride: (itemId, override) =>
        set((s) => ({ costOverrides: { ...s.costOverrides, [itemId]: override } })),
      clearCostOverride: (itemId) =>
        set((s) => {
          if (!(itemId in s.costOverrides)) return s;
          const next = { ...s.costOverrides };
          delete next[itemId];
          return { costOverrides: next };
        }),
      setRevenueOverride: (streamId, override) =>
        set((s) => ({ revenueOverrides: { ...s.revenueOverrides, [streamId]: override } })),
      setSubstitutionMeta: (itemId, entry) =>
        set((s) => ({ substitutionMeta: { ...s.substitutionMeta, [itemId]: entry } })),
      clearSubstitutionMeta: (itemId) =>
        set((s) => {
          if (!(itemId in s.substitutionMeta)) return s;
          const next = { ...s.substitutionMeta };
          delete next[itemId];
          return { substitutionMeta: next };
        }),
      clearOverrides: () => set({ costOverrides: {}, revenueOverrides: {}, substitutionMeta: {} }),
    }),
    {
      name: 'ogden-financial',
      // v1→v2: additive `substitutionMeta` field only. No data migration —
      // the passthrough preserves old keys and the default {} fills in the
      // new one on rehydrate of v1 state.
      version: 2,
      migrate: (persisted) => persisted as never,
      partialize: (state) => ({
        region: state.region,
        stewardshipCostRegion: state.stewardshipCostRegion,
        missionWeights: state.missionWeights,
        costOverrides: state.costOverrides,
        revenueOverrides: state.revenueOverrides,
        substitutionMeta: state.substitutionMeta,
      }),
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
rehydrateWithLogging(useFinancialStore);
