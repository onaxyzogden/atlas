/**
 * Agribusiness store — Broiler Product Map (Plan Module 7).
 *
 * Post-farm-gate value chain: slaughter → cold chain → market /
 * distribution. Newman, *First Generation Farming*: a farm designed in
 * isolation from the agribusiness interface is "a ticking timebomb."
 *
 * Separate from `livestockStore` per
 * wiki/decisions/2026-05-10-atlas-plan-module7-broiler-product-map.md:
 * `livestockStore` answers "what animals on what land?";
 * `agribusinessStore` answers "how does the product leave the gate?"
 *
 * Schema is additive — default `[]` for every slice so existing canvases
 * hydrated before this store existed are unaffected.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';

export type SlaughterKind = 'mobile' | 'on-farm' | 'shared' | 'contract';
export type ColdChainKind = 'freezer' | 'chiller' | 'blast' | 'reefer';
export type MarketKind = 'farmstand' | 'wholesale' | 'restaurant' | 'csa-dropoff';

export interface SlaughterPoint {
  id: string;
  projectId: string;
  name: string;
  geometry: GeoJSON.Point;
  kind: SlaughterKind;
  /** Throughput ceiling at this station, head/day. */
  capacityBirdsPerDay: number;
  phase: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ColdChainUnit {
  id: string;
  projectId: string;
  name: string;
  geometry: GeoJSON.Point;
  kind: ColdChainKind;
  /** Internal cold-storage volume, m³. */
  capacityM3: number;
  phase: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketNode {
  id: string;
  projectId: string;
  name: string;
  geometry: GeoJSON.Point;
  kind: MarketKind;
  /** Steady-state weekly product demand at this node, kg. */
  weeklyDemandKg: number;
  phase: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Per-project sizing inputs shared across the three Module 7 diagnostic
 * cards. Lives in the store (not card-local `useState`) so that:
 *   - inputs persist across slide-up open/close and across reloads
 *     (same `persist` boundary as the entities themselves),
 *   - the three cards derive consistent rollups (peak-week pack,
 *     weekly product throughput) from one canonical input rather than
 *     each holding its own copy that silently goes stale.
 *
 * `getSizing(projectId)` returns DEFAULT_SIZING for unknown projects;
 * `setSizing(projectId, patch)` upserts. Defaults match the 2,000-bird
 * pastured viability floor named in the ADR.
 */
export interface AgribusinessSizing {
  /** Annual head count produced through this line. */
  annualHead: number;
  /** Average dressed weight per bird, kg. */
  dressedKg: number;
  /** Processing days per year (i.e. days the slaughter line actually runs). */
  processingDays: number;
  /** Carton/freezer pack density, kg/m³. */
  packDensityKgPerM3: number;
  /** Detour multiplier for drive-time rollup (great-circle → road km). */
  detourMultiplier: number;
  /** Average drive speed for drive-time rollup, km/h. */
  avgSpeedKmh: number;
}

export const DEFAULT_SIZING: AgribusinessSizing = {
  annualHead: 2000,
  dressedKg: 1.8,
  processingDays: 40,
  packDensityKgPerM3: 250,
  detourMultiplier: 1.3,
  avgSpeedKmh: 60,
};

interface AgribusinessState {
  slaughterPoints: SlaughterPoint[];
  coldChainUnits: ColdChainUnit[];
  marketNodes: MarketNode[];
  sizingByProject: Record<string, AgribusinessSizing>;

  addSlaughterPoint: (p: SlaughterPoint) => void;
  updateSlaughterPoint: (id: string, updates: Partial<SlaughterPoint>) => void;
  deleteSlaughterPoint: (id: string) => void;

  addColdChainUnit: (u: ColdChainUnit) => void;
  updateColdChainUnit: (id: string, updates: Partial<ColdChainUnit>) => void;
  deleteColdChainUnit: (id: string) => void;

  addMarketNode: (n: MarketNode) => void;
  updateMarketNode: (id: string, updates: Partial<MarketNode>) => void;
  deleteMarketNode: (id: string) => void;

  getSizing: (projectId: string) => AgribusinessSizing;
  setSizing: (projectId: string, patch: Partial<AgribusinessSizing>) => void;
}

export const useAgribusinessStore = create<AgribusinessState>()(
  persist(
    temporal(
      (set, get) => ({
        slaughterPoints: [],
        coldChainUnits: [],
        marketNodes: [],
        sizingByProject: {},

        addSlaughterPoint: (p) =>
          set((s) => ({ slaughterPoints: [...s.slaughterPoints, p] })),
        updateSlaughterPoint: (id, updates) =>
          set((s) => ({
            slaughterPoints: s.slaughterPoints.map((x) =>
              x.id === id ? { ...x, ...updates, updatedAt: new Date().toISOString() } : x,
            ),
          })),
        deleteSlaughterPoint: (id) =>
          set((s) => ({ slaughterPoints: s.slaughterPoints.filter((x) => x.id !== id) })),

        addColdChainUnit: (u) =>
          set((s) => ({ coldChainUnits: [...s.coldChainUnits, u] })),
        updateColdChainUnit: (id, updates) =>
          set((s) => ({
            coldChainUnits: s.coldChainUnits.map((x) =>
              x.id === id ? { ...x, ...updates, updatedAt: new Date().toISOString() } : x,
            ),
          })),
        deleteColdChainUnit: (id) =>
          set((s) => ({ coldChainUnits: s.coldChainUnits.filter((x) => x.id !== id) })),

        addMarketNode: (n) =>
          set((s) => ({ marketNodes: [...s.marketNodes, n] })),
        updateMarketNode: (id, updates) =>
          set((s) => ({
            marketNodes: s.marketNodes.map((x) =>
              x.id === id ? { ...x, ...updates, updatedAt: new Date().toISOString() } : x,
            ),
          })),
        deleteMarketNode: (id) =>
          set((s) => ({ marketNodes: s.marketNodes.filter((x) => x.id !== id) })),

        getSizing: (projectId) =>
          get().sizingByProject[projectId] ?? DEFAULT_SIZING,
        setSizing: (projectId, patch) =>
          set((s) => ({
            sizingByProject: {
              ...s.sizingByProject,
              [projectId]: {
                ...(s.sizingByProject[projectId] ?? DEFAULT_SIZING),
                ...patch,
              },
            },
          })),
      }),
      { limit: 200 },
    ),
    { name: 'ogden-agribusiness', version: 2 },
  ),
);

// Hydrate from localStorage (Zustand v5)
useAgribusinessStore.persist.rehydrate();
