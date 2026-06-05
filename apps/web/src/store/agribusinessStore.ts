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
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
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
 * `setSizing(projectId, patch)` upserts. Type, defaults, and the
 * `computePeakWeekKg` helper live in `agribusinessSizing.ts` so they
 * can be unit-tested without the `persist` middleware.
 */
export {
  DEFAULT_SIZING,
  computePeakWeekKg,
  computeColdChainVerdict,
  computeMarketVerdict,
  computeCentroid,
  computeDriveTime,
  type AgribusinessSizing,
  type ColdChainVerdict,
  type ColdChainInputs,
  type MarketVerdict,
  type MarketInputs,
  type DriveTimeInputs,
  type DriveTime,
} from './agribusinessSizing.js';
import type { AgribusinessSizing } from './agribusinessSizing.js';
import { DEFAULT_SIZING } from './agribusinessSizing.js';

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
    {
      name: 'ogden-agribusiness',
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      // v2 added the `sizingByProject` slice; missing-key zustand merge
      // leaves it `undefined` and consumers fall back to DEFAULT_SIZING,
      // so v1 → v2 migration is a no-op.
      version: 2,
      migrate: (persisted) => persisted as AgribusinessState,
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
rehydrateWithLogging(useAgribusinessStore);
