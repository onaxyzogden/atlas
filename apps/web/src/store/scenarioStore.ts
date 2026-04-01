/**
 * Scenario store — manages what-if scenarios for design comparison.
 * Each scenario is a named snapshot of zone/structure/paddock/crop configuration
 * with optional cost and revenue overrides.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Scenario {
  id: string;
  projectId: string;
  name: string;
  description: string;
  isBaseline: boolean;
  createdAt: string;
  // Snapshot counts
  zoneCount: number;
  structureCount: number;
  paddockCount: number;
  cropCount: number;
  // Computed totals
  totalInvestmentLow: number;
  totalInvestmentHigh: number;
  annualRevenueLow: number;
  annualRevenueHigh: number;
  breakEvenYear: number;
}

interface ScenarioState {
  scenarios: Scenario[];
  activeScenarioId: string | null;

  addScenario: (scenario: Scenario) => void;
  updateScenario: (id: string, updates: Partial<Scenario>) => void;
  deleteScenario: (id: string) => void;
  setActiveScenario: (id: string | null) => void;
}

export const useScenarioStore = create<ScenarioState>()(
  persist(
    (set) => ({
      scenarios: [],
      activeScenarioId: null,

      addScenario: (scenario) => set((s) => ({ scenarios: [...s.scenarios, scenario] })),
      updateScenario: (id, updates) =>
        set((s) => ({ scenarios: s.scenarios.map((sc) => (sc.id === id ? { ...sc, ...updates } : sc)) })),
      deleteScenario: (id) => set((s) => ({ scenarios: s.scenarios.filter((sc) => sc.id !== id) })),
      setActiveScenario: (activeScenarioId) => set({ activeScenarioId }),
    }),
    { name: 'ogden-scenarios', version: 1 },
  ),
);

// Hydrate from localStorage (Zustand v5)
useScenarioStore.persist.rehydrate();
