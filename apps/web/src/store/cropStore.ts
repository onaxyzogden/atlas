/**
 * Crop store — orchards, gardens, food forests, agroforestry bands.
 *
 * Phase 2: Draw crop areas on the map, assign species, plan spacing.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  /** Computed annual irrigation demand (US gal/yr) — derived from area × waterDemand class. */
  waterGalYr?: number;
  /** Market-garden bundle id (see marketGardenBundles.ts); set only when type === 'market_garden'. */
  marketGardenBundle?: string;
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
    (set) => ({
      cropAreas: [],

      addCropArea: (area) => set((s) => ({ cropAreas: [...s.cropAreas, area] })),

      updateCropArea: (id, updates) =>
        set((s) => ({
          cropAreas: s.cropAreas.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c,
          ),
        })),

      deleteCropArea: (id) => set((s) => ({ cropAreas: s.cropAreas.filter((c) => c.id !== id) })),
    }),
    { name: 'ogden-crops', version: 1 },
  ),
);

// Hydrate from localStorage (Zustand v5)
useCropStore.persist.rehydrate();
