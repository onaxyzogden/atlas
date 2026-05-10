/**
 * Livestock store — paddocks, grazing cells, species, stocking density.
 *
 * Phase 2: Draw paddocks on the map, assign species, plan rotational grazing.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';

export type FenceType = 'electric' | 'post_wire' | 'post_rail' | 'woven_wire' | 'temporary' | 'none';
export type LivestockSpecies = 'sheep' | 'cattle' | 'goats' | 'poultry' | 'pigs' | 'horses' | 'ducks_geese' | 'rabbits' | 'bees';

/**
 * Pasture quality (Tier C / C4 stocking-rate helper). Anchors a rough
 * carrying-capacity expectation against which `stockingDensity` (head/ha)
 * can be eyeballed. Persisted so a follow-up helper card can compute and
 * warn on overstocking without a second migration.
 *
 * Indicative AUE/ha by class (cool-temperate humid baseline):
 *   poor      ≈ 0.7   (degraded / drought-stressed / weed-dominant)
 *   fair      ≈ 1.2   (recovering / mixed)
 *   good      ≈ 2.5   (well-managed perennial sward)
 *   excellent ≈ 3.7+  (fertile, irrigated, intensively rotated)
 */
export type PastureQuality = 'poor' | 'fair' | 'good' | 'excellent';

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
  /**
   * Tier C / C4 — pasture quality class for stocking-rate verification.
   * Optional; undefined = not yet assessed.
   */
  pastureQuality?: PastureQuality;
  fencing: FenceType;
  guestSafeBuffer: boolean;
  waterPointNote: string;
  shelterNote: string;
  phase: string;
  notes: string;
  /**
   * PLAN-stage Multi-Enterprise — `enterpriseStore` enterprise id this
   * paddock belongs to. Optional; undefined = unassigned.
   */
  enterprise?: string;
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
    temporal(
      (set) => ({
        paddocks: [],

        addPaddock: (paddock) => set((s) => ({ paddocks: [...s.paddocks, paddock] })),

        updatePaddock: (id, updates) =>
          set((s) => ({
            paddocks: s.paddocks.map((p) =>
              p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p,
            ),
          })),

        deletePaddock: (id) =>
          set((s) => ({ paddocks: s.paddocks.filter((p) => p.id !== id) })),
      }),
      { limit: 200 },
    ),
    { name: 'ogden-livestock', version: 1 },
  ),
);

// Hydrate from localStorage (Zustand v5)
useLivestockStore.persist.rehydrate();
