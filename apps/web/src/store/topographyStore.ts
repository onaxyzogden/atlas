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
import { rehydrateWithLogging } from './persistRehydrate.js';
import { temporal } from 'zundo';

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

/**
 * Section-level annotation kinds — orthodox cross-section overlays per
 * OSU PDC Assignment 15 (added 2026-05-07 per Permaculture Scholar verdict
 * `2026-05-07-atlas-plan-cross-section-scholar-keep-atlas.md`):
 *
 *   - `microclimate`     — bracket label like "Shady, dry, warm"
 *   - `succession`       — early/mid/late succession band
 *   - `slope`            — slope-% / elevation-delta callout
 *   - `sector-response`  — wind / overland-flow deflection commentary
 */
export type SectionAnnotationKind =
  | 'microclimate'
  | 'succession'
  | 'slope'
  | 'sector-response';

export interface SectionAnnotation {
  id: string;
  kind: SectionAnnotationKind;
  /** Free-text label drawn under the bracket. */
  label: string;
  /** Bracket start distance (m from point A). */
  startM: number;
  /** Bracket end distance (m from point A). Must be >= startM. */
  endM: number;
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
  /**
   * Section-level overlay brackets (microclimate / succession / slope /
   * sector-response). Optional; legacy transects load with this undefined.
   * Added 2026-05-07 per Module 6 Scholar follow-up #1–#4.
   */
  sectionAnnotations?: SectionAnnotation[];
}

// ── Module 3 (Topography) annotations ───────────────────────────────────────

export interface Contour {
  id: string;
  projectId: string;
  geometry: GeoJSON.LineString;
  /** Optional sampled elevation in metres (mean along the line). */
  elevationM?: number;
  notes?: string;
  createdAt: string;
}

export type HighPointKind = 'high' | 'low';

export interface HighPoint {
  id: string;
  projectId: string;
  /** [lng, lat] */
  position: [number, number];
  kind: HighPointKind;
  /** Optional sampled elevation in metres. */
  elevationM?: number;
  label?: string;
  notes?: string;
  createdAt: string;
}

export interface DrainageLine {
  id: string;
  projectId: string;
  geometry: GeoJSON.LineString;
  notes?: string;
  createdAt: string;
}

export type ErosionSeverity = 'low' | 'medium' | 'high';
export type ErosionType = 'sheet' | 'rill' | 'gully' | 'bank';

/** Point flag marking observed soil erosion (OSU PDC Screen 4 erosion log). */
export interface ErosionFlag {
  id: string;
  projectId: string;
  /** [lng, lat] */
  position: [number, number];
  severity: ErosionSeverity;
  type: ErosionType;
  notes?: string;
  createdAt: string;
}

export type RunoffFlowCondition = 'dry' | 'light' | 'active' | 'severe';

/** Line tracing observed overland runoff (OSU PDC Screen 4 runoff path). */
export interface RunoffPath {
  id: string;
  projectId: string;
  geometry: GeoJSON.LineString;
  /** Where the flow originates (free-text landmark). */
  from?: string;
  /** Where the flow terminates (free-text landmark). */
  to?: string;
  flowCondition: RunoffFlowCondition;
  notes?: string;
  createdAt: string;
}

interface TopographyState {
  transects: Transect[];
  contours: Contour[];
  highPoints: HighPoint[];
  drainageLines: DrainageLine[];
  erosionFlags: ErosionFlag[];
  runoffPaths: RunoffPath[];

  addTransect: (t: Transect) => void;
  updateTransect: (id: string, patch: Partial<Transect>) => void;
  removeTransect: (id: string) => void;

  addContour: (c: Contour) => void;
  updateContour: (id: string, patch: Partial<Contour>) => void;
  removeContour: (id: string) => void;

  addHighPoint: (h: HighPoint) => void;
  updateHighPoint: (id: string, patch: Partial<HighPoint>) => void;
  removeHighPoint: (id: string) => void;

  addDrainageLine: (d: DrainageLine) => void;
  updateDrainageLine: (id: string, patch: Partial<DrainageLine>) => void;
  removeDrainageLine: (id: string) => void;

  addErosionFlag: (e: ErosionFlag) => void;
  updateErosionFlag: (id: string, patch: Partial<ErosionFlag>) => void;
  removeErosionFlag: (id: string) => void;

  addRunoffPath: (r: RunoffPath) => void;
  updateRunoffPath: (id: string, patch: Partial<RunoffPath>) => void;
  removeRunoffPath: (id: string) => void;
}

export const useTopographyStore = create<TopographyState>()(
  persist(
    temporal((set) => ({
      transects: [],
      contours: [],
      highPoints: [],
      drainageLines: [],
      erosionFlags: [],
      runoffPaths: [],

      addTransect: (t) => set((s) => ({ transects: [...s.transects, t] })),
      updateTransect: (id, patch) =>
        set((s) => ({ transects: s.transects.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTransect: (id) => set((s) => ({ transects: s.transects.filter((t) => t.id !== id) })),

      addContour: (c) => set((s) => ({ contours: [...s.contours, c] })),
      updateContour: (id, patch) =>
        set((s) => ({ contours: s.contours.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      removeContour: (id) => set((s) => ({ contours: s.contours.filter((c) => c.id !== id) })),

      addHighPoint: (h) => set((s) => ({ highPoints: [...s.highPoints, h] })),
      updateHighPoint: (id, patch) =>
        set((s) => ({ highPoints: s.highPoints.map((h) => (h.id === id ? { ...h, ...patch } : h)) })),
      removeHighPoint: (id) =>
        set((s) => ({ highPoints: s.highPoints.filter((h) => h.id !== id) })),

      addDrainageLine: (d) => set((s) => ({ drainageLines: [...s.drainageLines, d] })),
      updateDrainageLine: (id, patch) =>
        set((s) => ({
          drainageLines: s.drainageLines.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),
      removeDrainageLine: (id) =>
        set((s) => ({ drainageLines: s.drainageLines.filter((d) => d.id !== id) })),

      addErosionFlag: (e) => set((s) => ({ erosionFlags: [...s.erosionFlags, e] })),
      updateErosionFlag: (id, patch) =>
        set((s) => ({
          erosionFlags: s.erosionFlags.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      removeErosionFlag: (id) =>
        set((s) => ({ erosionFlags: s.erosionFlags.filter((e) => e.id !== id) })),

      addRunoffPath: (r) => set((s) => ({ runoffPaths: [...s.runoffPaths, r] })),
      updateRunoffPath: (id, patch) =>
        set((s) => ({
          runoffPaths: s.runoffPaths.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      removeRunoffPath: (id) =>
        set((s) => ({ runoffPaths: s.runoffPaths.filter((r) => r.id !== id) })),
    }), { limit: 200 }),
    {
      name: 'ogden-topography',
      version: 2,
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<TopographyState>;
        return {
          ...p,
          contours: p.contours ?? [],
          highPoints: p.highPoints ?? [],
          drainageLines: p.drainageLines ?? [],
          erosionFlags: p.erosionFlags ?? [],
          runoffPaths: p.runoffPaths ?? [],
        } as TopographyState;
      },
    },
  ),
);

rehydrateWithLogging(useTopographyStore);
