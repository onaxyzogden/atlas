/**
 * Sector store — PLAN-stage Module 3 (Zones), Sector overlay tab.
 *
 * Persists the editable fire / view / noise compass directions the
 * steward marks in `SectorOverlayCard`. Wind and downslope-aspect
 * sectors are derived live from the climate / elevation layers and
 * are *not* persisted here — only the three steward-authored sectors
 * are. Holmgren P1 (*Observe and Interact*): the steward's read of
 * fire approach, view aperture, and noise source is a site-specific
 * observation that survives a page reload.
 *
 * Schema is intentionally small — three optional 8-point compass
 * fields plus three optional arc half-widths per project. Future
 * expansion (custom sectors beyond fire/view/noise, polar weather
 * roses) would live as additional optional fields on the same record;
 * bump the persist version when any field becomes required.
 *
 * Selector discipline: subscribers read `state.byProject` and derive
 * their per-project slice via `useMemo` (per
 * `wiki/decisions/2026-04-26-zustand-selector-stability.md`).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';

export type Compass8 =
  | 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

/** Steward-authored sectors. Wind / downslope are derived live. */
export interface ProjectSectors {
  fire?: Compass8 | null;
  view?: Compass8 | null;
  noise?: Compass8 | null;
  /**
   * Optional per-sector arc half-widths, in degrees. A wildfire arrives
   * across a wide arc (often 60–80°); a borrowed view through a saddle
   * may be a narrow 10–15° aperture. Defaults applied at render time
   * when undefined: fire 30°, view 30°, noise 25°. Holmgren P1
   * (*Observe and Interact*): the steward's read of how *wide* a
   * sector enters is part of the same observation as *which* compass
   * direction it enters from.
   */
  fireHalfWidth?: number;
  viewHalfWidth?: number;
  noiseHalfWidth?: number;
}

type SectorKey = 'fire' | 'view' | 'noise';
type HalfWidthKey = 'fireHalfWidth' | 'viewHalfWidth' | 'noiseHalfWidth';

interface SectorState {
  /** projectId → { fire, view, noise, *HalfWidth }. */
  byProject: Record<string, ProjectSectors>;
  /** Set one sector for a project. Pass `null` to clear. */
  setSector: (projectId: string, key: SectorKey, value: Compass8 | null) => void;
  /** Set one sector's arc half-width (degrees). Pass `null` to revert to default. */
  setSectorHalfWidth: (projectId: string, key: SectorKey, halfWidth: number | null) => void;
  /** Replace all three sectors for a project (used on bulk edit). */
  replaceSectors: (projectId: string, sectors: ProjectSectors) => void;
  /** Remove all sectors for a project. */
  clearProject: (projectId: string) => void;
}

const HALF_WIDTH_KEY: Record<SectorKey, HalfWidthKey> = {
  fire: 'fireHalfWidth',
  view: 'viewHalfWidth',
  noise: 'noiseHalfWidth',
};

export const useSectorStore = create<SectorState>()(
  persist(
    (set) => ({
      byProject: {},
      setSector: (projectId, key, value) =>
        set((s) => {
          const cur: ProjectSectors = { ...(s.byProject[projectId] ?? {}) };
          if (value) {
            cur[key] = value;
          } else {
            delete cur[key];
            // Clearing the direction also drops any custom half-width —
            // the next time the sector is set, the steward starts from
            // the default arc.
            delete cur[HALF_WIDTH_KEY[key]];
          }
          return { byProject: { ...s.byProject, [projectId]: cur } };
        }),
      setSectorHalfWidth: (projectId, key, halfWidth) =>
        set((s) => {
          const cur: ProjectSectors = { ...(s.byProject[projectId] ?? {}) };
          const hwKey = HALF_WIDTH_KEY[key];
          if (halfWidth == null || !Number.isFinite(halfWidth)) {
            delete cur[hwKey];
          } else {
            // Clamp to (0, 90] — half-widths beyond 90° produce a wedge
            // that wraps past the orthogonal cardinals and stops being
            // legible as a directional sector.
            cur[hwKey] = Math.max(1, Math.min(90, Math.round(halfWidth)));
          }
          return { byProject: { ...s.byProject, [projectId]: cur } };
        }),
      replaceSectors: (projectId, sectors) =>
        set((s) => {
          const cleaned: ProjectSectors = {};
          if (sectors.fire) cleaned.fire = sectors.fire;
          if (sectors.view) cleaned.view = sectors.view;
          if (sectors.noise) cleaned.noise = sectors.noise;
          if (Number.isFinite(sectors.fireHalfWidth)) cleaned.fireHalfWidth = sectors.fireHalfWidth;
          if (Number.isFinite(sectors.viewHalfWidth)) cleaned.viewHalfWidth = sectors.viewHalfWidth;
          if (Number.isFinite(sectors.noiseHalfWidth)) cleaned.noiseHalfWidth = sectors.noiseHalfWidth;
          return { byProject: { ...s.byProject, [projectId]: cleaned } };
        }),
      clearProject: (projectId) =>
        set((s) => {
          const next = { ...s.byProject };
          delete next[projectId];
          return { byProject: next };
        }),
    }),
    { name: 'ogden-sectors', storage: idbPersistStorage, version: 1, migrate: (persisted) => persisted as never },
  ),
);

rehydrateWithLogging(useSectorStore);
