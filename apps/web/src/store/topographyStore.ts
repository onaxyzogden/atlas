/**
 * Topography store — Scholar-aligned namespace consolidation
 * (plan few-concerns-shiny-quokka.md, ADR
 * 2026-04-30-site-annotations-store-scholar-aligned-namespaces.md).
 *
 * Holds A-B transects (OBSERVE base-map equivalence). Vertical elements
 * pinned along a transect are no longer inline copies (`verticalElements`);
 * they are now `verticalRefs` — discriminated refs into the appropriate
 * domain store (water-systems / polyculture / closed-loop / structures),
 * with a `standalone` fallback for speculative pins.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type VerticalElementType = 'structure' | 'tree' | 'shrub' | 'swale' | 'pond';

/**
 * Speculative pin payload — used when a steward sketches a vertical element
 * on the transect without yet linking it to a real designed element. Carries
 * the same shape as the legacy `VerticalElement` minus the id (which is
 * stored on the parent `TransectVerticalRef`).
 */
export interface StandaloneVerticalMarker {
  type: VerticalElementType;
  /** Element height in metres (above ground at that profile point). */
  heightM: number;
  label?: string;
}

export type TransectVerticalRefKind =
  | 'standalone'
  | 'water-system'
  | 'polyculture'
  | 'closed-loop'
  | 'structure';

export interface TransectVerticalRef {
  id: string;
  /** Distance along the transect in metres from point A. */
  distanceAlongTransectM: number;
  kind: TransectVerticalRefKind;
  /** Domain-store id; required unless `kind === 'standalone'`. */
  refId?: string;
  /** Inline shape; required unless `kind !== 'standalone'`. */
  standalone?: StandaloneVerticalMarker;
}

export interface Transect {
  id: string;
  projectId: string;
  name: string;
  /** [lng, lat] — start point. */
  pointA: [number, number];
  pointB: [number, number];
  /** ISO timestamp when elevation was last sampled along this transect. */
  sampledAt?: string;
  /** Cached sampled elevation profile (metres). */
  elevationProfileM?: number[];
  /** Source label for the cached profile — "synthetic" or e.g. "NRCan HRDEM Lidar DTM (1m)". */
  sourceApi?: string | null;
  /** Confidence reported by the elevation reader; absent for synthetic. */
  confidence?: 'high' | 'medium' | 'low';
  /** Total profile distance in metres (live API only — synthetic profiles are unitless). */
  totalDistanceM?: number;
  notes?: string;
  /**
   * Vertical elements pinned along the transect. Each entry refs a domain
   * element (water-system / polyculture / closed-loop / structure) or
   * carries a speculative `standalone` payload. Replaces legacy inline
   * `verticalElements` (migrated to `kind: 'standalone'` refs).
   */
  verticalRefs?: TransectVerticalRef[];
}

interface TopographyState {
  transects: Transect[];

  addTransect: (t: Transect) => void;
  updateTransect: (id: string, patch: Partial<Transect>) => void;
  removeTransect: (id: string) => void;
}

export const useTopographyStore = create<TopographyState>()(
  persist(
    (set) => ({
      transects: [],

      addTransect: (t) => set((s) => ({ transects: [...s.transects, t] })),
      updateTransect: (id, patch) =>
        set((s) => ({ transects: s.transects.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTransect: (id) => set((s) => ({ transects: s.transects.filter((t) => t.id !== id) })),
    }),
    { name: 'ogden-topography', version: 1 },
  ),
);

useTopographyStore.persist.rehydrate();
