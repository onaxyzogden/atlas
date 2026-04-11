/**
 * Siting weight store — user-adjustable priority weights per rule category.
 *
 * Weights affect how rule violations are classified:
 * high weights (>=70) escalate violations, low weights (<=30) de-escalate them.
 *
 * Persisted to localStorage. Follows Atlas Zustand + persist pattern.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RuleWeightCategory } from '../features/rules/SitingRules.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type WeightMap = Record<RuleWeightCategory, number>;

interface SitingWeightState {
  weights: WeightMap;
  setWeight: (category: RuleWeightCategory, value: number) => void;
  resetDefaults: () => void;
  applyPreset: (projectType: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Defaults & presets                                                 */
/* ------------------------------------------------------------------ */

const DEFAULT_WEIGHTS: WeightMap = {
  ecological: 50,
  hydrological: 50,
  structural: 50,
  agricultural: 50,
  experiential: 50,
  spiritual: 50,
};

const PRESETS: Record<string, Partial<WeightMap>> = {
  conservation:       { ecological: 80, hydrological: 70, agricultural: 40, experiential: 30, structural: 40, spiritual: 40 },
  regenerative_farm:  { agricultural: 80, ecological: 70, hydrological: 65, structural: 50, experiential: 30, spiritual: 40 },
  retreat_center:     { experiential: 80, spiritual: 75, structural: 60, ecological: 50, hydrological: 50, agricultural: 30 },
  moontrance:         { spiritual: 85, experiential: 80, ecological: 60, hydrological: 55, structural: 55, agricultural: 30 },
  homestead:          { structural: 70, hydrological: 60, agricultural: 60, ecological: 50, experiential: 40, spiritual: 40 },
  educational_farm:   { agricultural: 70, experiential: 65, ecological: 60, structural: 55, hydrological: 55, spiritual: 40 },
  multi_enterprise:   { structural: 65, agricultural: 60, hydrological: 60, ecological: 55, experiential: 50, spiritual: 40 },
};

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useSitingWeightStore = create<SitingWeightState>()(
  persist(
    (set) => ({
      weights: { ...DEFAULT_WEIGHTS },

      setWeight: (category, value) =>
        set((s) => ({
          weights: { ...s.weights, [category]: Math.max(0, Math.min(100, value)) },
        })),

      resetDefaults: () =>
        set({ weights: { ...DEFAULT_WEIGHTS } }),

      applyPreset: (projectType) => {
        const preset = PRESETS[projectType];
        if (!preset) return;
        set({ weights: { ...DEFAULT_WEIGHTS, ...preset } });
      },
    }),
    {
      name: 'ogden-siting-weights',
      version: 1,
      partialize: (state) => ({ weights: state.weights }),
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
useSitingWeightStore.persist.rehydrate();
