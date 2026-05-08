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
 * Schema is intentionally tiny — three optional 8-point compass
 * fields per project. Future expansion (custom sectors, sector
 * arcs / half-widths, polar weather roses) would live as additional
 * optional fields on the same record; bump the persist version when
 * any field becomes required.
 *
 * Selector discipline: subscribers read `state.byProject` and derive
 * their per-project slice via `useMemo` (per
 * `wiki/decisions/2026-04-26-zustand-selector-stability.md`).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Compass8 =
  | 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

/** Steward-authored sectors. Wind / downslope are derived live. */
export interface ProjectSectors {
  fire?: Compass8 | null;
  view?: Compass8 | null;
  noise?: Compass8 | null;
}

type SectorKey = 'fire' | 'view' | 'noise';

interface SectorState {
  /** projectId → { fire, view, noise }. */
  byProject: Record<string, ProjectSectors>;
  /** Set one sector for a project. Pass `null` to clear. */
  setSector: (projectId: string, key: SectorKey, value: Compass8 | null) => void;
  /** Replace all three sectors for a project (used on bulk edit). */
  replaceSectors: (projectId: string, sectors: ProjectSectors) => void;
  /** Remove all sectors for a project. */
  clearProject: (projectId: string) => void;
}

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
          }
          return { byProject: { ...s.byProject, [projectId]: cur } };
        }),
      replaceSectors: (projectId, sectors) =>
        set((s) => {
          const cleaned: ProjectSectors = {};
          if (sectors.fire) cleaned.fire = sectors.fire;
          if (sectors.view) cleaned.view = sectors.view;
          if (sectors.noise) cleaned.noise = sectors.noise;
          return { byProject: { ...s.byProject, [projectId]: cleaned } };
        }),
      clearProject: (projectId) =>
        set((s) => {
          const next = { ...s.byProject };
          delete next[projectId];
          return { byProject: next };
        }),
    }),
    { name: 'ogden-sectors', version: 1 },
  ),
);

useSectorStore.persist.rehydrate();
