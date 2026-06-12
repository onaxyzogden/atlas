/**
 * Livestock store — paddocks, grazing cells, species, stocking density.
 *
 * Phase 2: Draw paddocks on the map, assign species, plan rotational grazing.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import { temporal } from 'zundo';
import type { PlacementAcknowledgment } from '@ogden/shared/placementRules';

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
  /** Plan objective active in the Act tier when this feature was drawn (Phase-5 provenance stamp); undefined for legacy or non-objective draws. */
  sourceObjectiveId?: string;
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
  /**
   * Optional encoded host id (`<source>:<rawId>`, see
   * `features/agroforestry/silvopastureHosts.ts`) pinning this paddock
   * to a specific silvopasture polygon. When set, overrides the
   * spatial-overlap fallback used by `resolveMembers`.
   */
  silvopastureId?: string;
  /**
   * Auto-Design draft plumbing (ADR 2026-05-14). `draft: true` paddocks
   * are emitted by `runAutoDesign` and await steward review; `generationId`
   * links them to one generation run for cascade accept/discard.
   */
  draft?: boolean;
  generationId?: string;
  /** Draw-time placement-gate acknowledgments (warn-severity, steward-confirmed). */
  placementAcknowledgments?: PlacementAcknowledgment[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Fence-line mobility — added per Farm-Scholar (Newman) ADR 2026-05-10. Strip
 * and mob grazing depend on temporary, frequently-moved electric wire that
 * the polygon `Paddock` tool cannot represent. `permanent` fences anchor
 * paddock perimeters; `temporary-strip` fences are the moveable wire used
 * for daily / hourly subdivisions.
 */
export type FenceLineMobility = 'permanent' | 'temporary-strip';

export interface FenceLine {
  id: string;
  projectId: string;
  /** Plan objective active in the Act tier when this feature was drawn (Phase-5 provenance stamp); undefined for legacy or non-objective draws. */
  sourceObjectiveId?: string;
  name: string;
  geometry: GeoJSON.LineString;
  fenceType: FenceType;
  mobility: FenceLineMobility;
  /** Optional parent paddock id — pure pointer, no schema enforcement. */
  paddockId?: string;
  /** Auto-Design draft plumbing (ADR 2026-05-14). See `Paddock.draft`. */
  draft?: boolean;
  generationId?: string;
  phase: string;
  notes: string;
  /** Draw-time placement-gate acknowledgments (warn-severity, steward-confirmed). */
  placementAcknowledgments?: PlacementAcknowledgment[];
  createdAt: string;
  updatedAt: string;
}

interface LivestockState {
  paddocks: Paddock[];
  fenceLines: FenceLine[];

  addPaddock: (paddock: Paddock) => void;
  updatePaddock: (id: string, updates: Partial<Paddock>) => void;
  deletePaddock: (id: string) => void;

  addFenceLine: (line: FenceLine) => void;
  updateFenceLine: (id: string, updates: Partial<FenceLine>) => void;
  deleteFenceLine: (id: string) => void;
}

export const useLivestockStore = create<LivestockState>()(
  persist(
    temporal(
      (set) => ({
        paddocks: [],
        // Default `[]` so existing canvases hydrated under v1 are unaffected.
        // Farm-Scholar (Newman) ADR 2026-05-10 added fence-line linear tool;
        // version bump from 1 → 2 to claim the new slice.
        fenceLines: [],

        addPaddock: (paddock) => set((s) => ({ paddocks: [...s.paddocks, paddock] })),

        updatePaddock: (id, updates) =>
          set((s) => ({
            paddocks: s.paddocks.map((p) =>
              p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p,
            ),
          })),

        deletePaddock: (id) =>
          set((s) => ({ paddocks: s.paddocks.filter((p) => p.id !== id) })),

        addFenceLine: (line) =>
          set((s) => ({ fenceLines: [...s.fenceLines, line] })),

        updateFenceLine: (id, updates) =>
          set((s) => ({
            fenceLines: s.fenceLines.map((f) =>
              f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f,
            ),
          })),

        deleteFenceLine: (id) =>
          set((s) => ({ fenceLines: s.fenceLines.filter((f) => f.id !== id) })),
      }),
      { limit: 200 },
    ),
    // Version retained at 1 — `fenceLines: []` is supplied by the initializer
    // and Zustand's default shallow merge fills it in for canvases hydrated
    // before this slice existed, so no migration step is needed.
    { name: 'ogden-livestock', storage: idbPersistStorage, version: 1, migrate: (persisted) => persisted as never },
  ),
);

// Hydrate from localStorage (Zustand v5)
rehydrateWithLogging(useLivestockStore);
