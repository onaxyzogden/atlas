/**
 * Crop store â€” orchards, gardens, food forests, agroforestry bands.
 *
 * Phase 2: Draw crop areas on the map, assign species, plan spacing.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';

export type CropAreaType = 'orchard' | 'row_crop' | 'garden_bed' | 'food_forest' | 'windbreak' | 'shelterbelt' | 'silvopasture' | 'nursery' | 'market_garden' | 'pollinator_strip';

export interface CropArea {
  id: string;
  projectId: string;
  name: string;
  color: string;
  type: CropAreaType;
  geometry: GeoJSON.Polygon;
  areaM2: number;
  species: string[];
  treeSpacingM: number | null;
  rowSpacingM: number | null;
  waterDemand: 'low' | 'medium' | 'high';
  irrigationType: 'drip' | 'sprinkler' | 'flood' | 'rain_fed' | 'none';
  phase: string;
  notes: string;
  /** Computed annual irrigation demand (US gal/yr) â€” derived from area Ã— waterDemand class. */
  waterGalYr?: number;
  /** Market-garden bundle id (see marketGardenBundles.ts); set only when type === 'market_garden'. */
  marketGardenBundle?: string;
  /** Optional bed length override (m) for market-garden bed-count math; falls back to ASSUMED_BED_LENGTH_M (30 m) when undefined. */
  marketGardenBedLengthM?: number;
  /**
   * ACT-stage Module 2 â€” current irrigation operating mode. Tracks the
   * transition from active watering at install time to passive
   * (rain-fed / swale-fed) operation as perennial systems establish.
   * Optional, additive; legacy crop areas load with `irrigationMode`
   * undefined (treated as `active` by `IrrigationManagerCard`).
   */
  irrigationMode?: 'active' | 'transitioning' | 'passive';
  /** ISO date when the steward began the activeâ†’passive transition. */
  transitionStartDate?: string;
  /**
   * PLAN-stage Multi-Enterprise â€” `enterpriseStore` enterprise id this
   * crop area belongs to. Optional; undefined = unassigned.
   */
  enterprise?: string;
  createdAt: string;
  updatedAt: string;
}

interface CropState {
  cropAreas: CropArea[];

  addCropArea: (area: CropArea) => void;
  updateCropArea: (id: string, updates: Partial<CropArea>) => void;
  deleteCropArea: (id: string) => void;
}

export const useCropStore = create<CropState>()(
  persist(
    temporal(
      (set) => ({
        cropAreas: [],

        addCropArea: (area) => set((s) => ({ cropAreas: [...s.cropAreas, area] })),

        updateCropArea: (id, updates) =>
          set((s) => ({
            cropAreas: s.cropAreas.map((c) =>
              c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c,
            ),
          })),

        deleteCropArea: (id) =>
          set((s) => ({ cropAreas: s.cropAreas.filter((c) => c.id !== id) })),
      }),
      { limit: 200 },
    ),
    { name: 'ogden-crops', version: 1, migrate: (persisted) => persisted as never },
  ),
);

// Hydrate from localStorage (Zustand v5)
useCropStore.persist.rehydrate();
