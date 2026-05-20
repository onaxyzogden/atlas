/**
 * Crop store â€” orchards, gardens, food forests, agroforestry bands.
 *
 * Phase 2: Draw crop areas on the map, assign species, plan spacing.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';
import { resolveSpeciesId } from '../data/plantCatalogAliases.js';

export type CropAreaType = 'orchard' | 'row_crop' | 'garden_bed' | 'food_forest' | 'windbreak' | 'shelterbelt' | 'silvopasture' | 'nursery' | 'market_garden' | 'pollinator_strip';

/**
 * B5.1 — Cover-crop window scheduled on a CropArea. One CropArea may carry
 * multiple windows (e.g. winter rye Oct–Mar + buckwheat Jun–Aug). Months are
 * 1..12 inclusive; if `endMonth < startMonth` the window wraps the year
 * boundary (e.g. start=10, end=3 = Oct–Mar).
 */
export interface CropCoverWindow {
  /** PLANT_CATALOG species id. */
  speciesId: string;
  /** 1..12 inclusive (wraps at year boundary). */
  startMonth: number;
  endMonth: number;
  /** Cover-crop functional role (see coverCropCatalog.ts). */
  role:
    | 'green_manure'
    | 'living_mulch'
    | 'winter_cover'
    | 'scavenger'
    | 'smother'
    | 'biofumigant';
}

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
  /**
   * Optional encoded host id (`<source>:<rawId>`, see
   * `features/agroforestry/silvopastureHosts.ts`) pinning this crop
   * area to a specific silvopasture host. Used only when
   * `type === 'orchard'`; ignored on other types.
   */
  silvopastureId?: string;
  /**
   * B5.1 — cover-crop windows scheduled on this area. Empty/undefined =
   * no plan. Drives the LivingRootsCard audit + `living-roots-coverage-pct`
   * goal-tree criterion. Strictly soil-vitality (months of living roots),
   * never a financial or yield-as-return notion.
   */
  coverCropPlan?: CropCoverWindow[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Persist migration for the `ogden-crops` blob. Exported for testing.
 * Idempotent on already-current rows. Returns the migrated CropState shape.
 *
 * - v1→v2 (2026-05-14): legacy pl-XXX species id → snake_case canonical.
 * - v2→v3 (2026-05-19, B5.1): adds optional `coverCropPlan?` field — no-op
 *   for data that already carries it; sets it explicit on legacy rows.
 */
export function migrateCropStore(
  persisted: unknown,
  version: number,
): { cropAreas: CropArea[] } {
  const s = ((persisted as Partial<{ cropAreas: CropArea[] }>) ?? {}) as Partial<{
    cropAreas: CropArea[];
  }>;
  let cropAreas: CropArea[] = s.cropAreas ?? [];
  if (version < 2) {
    cropAreas = cropAreas.map((c) => ({
      ...c,
      species: (c.species ?? []).map((id) => resolveSpeciesId(id)),
    }));
  }
  if (version < 3) {
    cropAreas = cropAreas.map((c) => ({
      ...c,
      coverCropPlan: c.coverCropPlan,
    }));
  }
  return { cropAreas };
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
    {
      name: 'ogden-crops',
      version: 3,
      migrate: (persisted, version) => migrateCropStore(persisted, version) as CropState,
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
useCropStore.persist.rehydrate();
