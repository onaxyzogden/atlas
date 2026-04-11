/**
 * Scenario store — manages what-if scenarios for design comparison.
 * Each scenario is a named snapshot of zone/structure/paddock/crop configuration
 * with computed financial values from the engine and variant config metadata.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ScenarioVariantConfig {
  /** Project type override for this scenario (null = use project default) */
  projectType?: string | null;
  /** Cost/revenue region used when snapshot was taken */
  region?: string;
  /** Mission weighting preset used when snapshot was taken */
  missionFocus?: 'balanced' | 'financial' | 'ecological' | 'spiritual';
}

export interface ScenarioMissionScore {
  overall: number;
  financial: number;
  ecological: number;
  spiritual: number;
  community: number;
}

export interface Scenario {
  id: string;
  projectId: string;
  name: string;
  description: string;
  isBaseline: boolean;
  createdAt: string;

  /** Variant config — settings active when this snapshot was taken */
  variantConfig: ScenarioVariantConfig;

  // ── Design snapshot counts ─────────────────────────────────────────
  zoneCount: number;
  structureCount: number;
  paddockCount: number;
  cropCount: number;

  // ── Design snapshot detail (for diff) ─────────────────────────────
  /** Zone counts by category, e.g. { pasture: 2, food_forest: 1 } */
  zoneCategories: Record<string, number>;
  /** Structure counts by type, e.g. { cabin: 2, barn: 1 } */
  structureTypes: Record<string, number>;
  /** Detected enterprise types at snapshot time */
  enterprises: string[];

  // ── Financial snapshot — all from engine, never hardcoded ─────────
  /** Mid-scenario total capital required (full dollars) */
  totalCapitalMid: number;
  /** Mid-scenario break-even year (null = beyond 10yr) */
  breakEvenYear: number | null;
  /** Cumulative cashflow at Year 5, mid scenario */
  year5Cashflow: number;
  /** Cumulative cashflow at Year 10, mid scenario */
  year10Cashflow: number;
  /** 10-year ROI percentage, mid scenario */
  tenYearROI: number;
  /** Annual revenue at maturity, mid scenario */
  annualRevenueMid: number;
  /** Mission alignment scores (computed with variant weights) */
  missionScore: ScenarioMissionScore;
}

interface ScenarioState {
  scenarios: Scenario[];
  activeScenarioId: string | null;

  addScenario: (scenario: Scenario) => void;
  updateScenario: (id: string, updates: Partial<Scenario>) => void;
  deleteScenario: (id: string) => void;
  setActiveScenario: (id: string | null) => void;
}

// ── Migration from v1 (legacy field names) ───────────────────────────

function migrateScenarioV1(old: Record<string, unknown>): Scenario {
  return {
    id: String(old['id'] ?? crypto.randomUUID()),
    projectId: String(old['projectId'] ?? ''),
    name: String(old['name'] ?? 'Unnamed'),
    description: String(old['description'] ?? ''),
    isBaseline: Boolean(old['isBaseline'] ?? false),
    createdAt: String(old['createdAt'] ?? new Date().toISOString()),
    variantConfig: {},
    zoneCount: Number(old['zoneCount'] ?? 0),
    structureCount: Number(old['structureCount'] ?? 0),
    paddockCount: Number(old['paddockCount'] ?? 0),
    cropCount: Number(old['cropCount'] ?? 0),
    zoneCategories: {},
    structureTypes: {},
    enterprises: [],
    // v1 stored values in $K — convert to full dollars
    totalCapitalMid: Number(old['totalInvestmentHigh'] ?? 0) * 1000,
    breakEvenYear: Number(old['breakEvenYear'] ?? 0) || null,
    year5Cashflow: 0,
    year10Cashflow: 0,
    tenYearROI: 0,
    annualRevenueMid: Number(old['annualRevenueHigh'] ?? 0) * 1000,
    missionScore: { overall: 50, financial: 50, ecological: 50, spiritual: 50, community: 50 },
  };
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
    {
      name: 'ogden-scenarios',
      version: 2,
      migrate: (persistedState: unknown, fromVersion: number) => {
        const state = persistedState as { scenarios?: unknown[]; activeScenarioId?: string | null };
        if (fromVersion < 2) {
          return {
            activeScenarioId: state.activeScenarioId ?? null,
            scenarios: (state.scenarios ?? []).map((sc) =>
              migrateScenarioV1(sc as Record<string, unknown>),
            ),
          };
        }
        return state;
      },
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
useScenarioStore.persist.rehydrate();
