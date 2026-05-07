/**
 * Water Systems store — Scholar-aligned namespace consolidation
 * (plan few-concerns-shiny-quokka.md, ADR
 * 2026-04-30-site-annotations-store-scholar-aligned-namespaces.md).
 *
 * Holds earthworks (movement) + storage infrastructure (storage). Yeomans
 * Keyline Scales: water is one foundational layer; movement and storage are
 * halves of the hydrological respiratory system. Per Holmgren P8.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Earthworks (swales / drains / diversions) ───────────────────────────────

export type EarthworkType = 'swale' | 'diversion' | 'french_drain';

export interface Earthwork {
  id: string;
  projectId: string;
  type: EarthworkType;
  geometry: GeoJSON.LineString;
  lengthM: number;
  notes?: string;
  createdAt: string;
}

// ── Storage infrastructure (point placements) ───────────────────────────────

export type StorageInfraType = 'cistern' | 'pond' | 'rain_garden';

export interface StorageInfra {
  id: string;
  projectId: string;
  type: StorageInfraType;
  /** [lng, lat] — point placement. */
  center: [number, number];
  /** Capacity in litres (cisterns/ponds). Optional for rain gardens. */
  capacityL?: number;
  notes?: string;
  createdAt: string;
}

// ── Watercourses (natural drainage — distinct from built earthworks) ────────

export type WatercourseKind = 'stream' | 'creek' | 'ditch' | 'other';

export interface Watercourse {
  id: string;
  projectId: string;
  geometry: GeoJSON.LineString;
  kind: WatercourseKind;
  perennial?: boolean;
  notes?: string;
  createdAt: string;
}

interface WaterSystemsState {
  earthworks: Earthwork[];
  storageInfra: StorageInfra[];
  watercourses: Watercourse[];

  addEarthwork: (e: Earthwork) => void;
  updateEarthwork: (id: string, patch: Partial<Earthwork>) => void;
  removeEarthwork: (id: string) => void;

  addStorageInfra: (i: StorageInfra) => void;
  updateStorageInfra: (id: string, patch: Partial<StorageInfra>) => void;
  removeStorageInfra: (id: string) => void;

  addWatercourse: (w: Watercourse) => void;
  updateWatercourse: (id: string, patch: Partial<Watercourse>) => void;
  removeWatercourse: (id: string) => void;
}

export const useWaterSystemsStore = create<WaterSystemsState>()(
  persist(
    (set) => ({
      earthworks: [],
      storageInfra: [],
      watercourses: [],

      addEarthwork: (e) => set((s) => ({ earthworks: [...s.earthworks, e] })),
      updateEarthwork: (id, patch) =>
        set((s) => ({ earthworks: s.earthworks.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeEarthwork: (id) => set((s) => ({ earthworks: s.earthworks.filter((e) => e.id !== id) })),

      addStorageInfra: (i) => set((s) => ({ storageInfra: [...s.storageInfra, i] })),
      updateStorageInfra: (id, patch) =>
        set((s) => ({ storageInfra: s.storageInfra.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      removeStorageInfra: (id) => set((s) => ({ storageInfra: s.storageInfra.filter((i) => i.id !== id) })),

      addWatercourse: (w) => set((s) => ({ watercourses: [...s.watercourses, w] })),
      updateWatercourse: (id, patch) =>
        set((s) => ({
          watercourses: s.watercourses.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        })),
      removeWatercourse: (id) =>
        set((s) => ({ watercourses: s.watercourses.filter((w) => w.id !== id) })),
    }),
    {
      name: 'ogden-water-systems',
      version: 2,
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<WaterSystemsState>;
        return { ...p, watercourses: p.watercourses ?? [] } as WaterSystemsState;
      },
    },
  ),
);

useWaterSystemsStore.persist.rehydrate();
