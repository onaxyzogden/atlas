/**
 * Livestock store — paddocks, grazing cells, species, stocking density.
 *
 * Phase 2: Draw paddocks on the map, assign species, plan rotational grazing.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FenceType = 'electric' | 'post_wire' | 'post_rail' | 'woven_wire' | 'temporary' | 'none';
export type LivestockSpecies = 'sheep' | 'cattle' | 'goats' | 'poultry' | 'pigs' | 'horses' | 'ducks_geese' | 'rabbits' | 'bees';

export interface Paddock {
  id: string;
  projectId: string;
  name: string;
  color: string;
  geometry: GeoJSON.Polygon;
  areaM2: number;
  grazingCellGroup: string | null;
  species: LivestockSpecies[];
  /**
   * Optional per-species Manitoba Schedule A subcategory id (see
   * `features/livestock/scheduleA.ts`). When undefined for a given species
   * the AU rollup falls back to `AU_FACTORS[species]` so existing paddocks
   * remain unchanged.
   */
  scheduleASubcategoryBySpecies?: Partial<Record<LivestockSpecies, string>>;
  stockingDensity: number | null; // head per hectare
  fencing: FenceType;
  guestSafeBuffer: boolean;
  waterPointNote: string;
  shelterNote: string;
  phase: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface LivestockState {
  paddocks: Paddock[];

  addPaddock: (paddock: Paddock) => void;
  updatePaddock: (id: string, updates: Partial<Paddock>) => void;
  deletePaddock: (id: string) => void;
}

export const useLivestockStore = create<LivestockState>()(
  persist(
    (set) => ({
      paddocks: [],

      addPaddock: (paddock) => set((s) => ({ paddocks: [...s.paddocks, paddock] })),

      updatePaddock: (id, updates) =>
        set((s) => ({
          paddocks: s.paddocks.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p,
          ),
        })),

      deletePaddock: (id) => set((s) => ({ paddocks: s.paddocks.filter((p) => p.id !== id) })),
    }),
    { name: 'ogden-livestock', version: 1 },
  ),
);

// Hydrate from localStorage (Zustand v5)
useLivestockStore.persist.rehydrate();
