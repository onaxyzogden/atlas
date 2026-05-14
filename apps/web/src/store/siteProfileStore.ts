/**
 * Site Profile store — per-project, persisted. Stores facets with
 * provenance stamps (`observe`, `manual`, or null). The Goal Compass
 * Site Profile tab is the read/write surface; the sequencing engine
 * reads through `getSiteProfile`.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Facet,
  FacetProvenance,
  Household,
  SiteProfile,
  SoilCompaction,
  WaterPosture,
} from '../v3/plan/data/goalCompassTypes.js';
import { emptySiteProfile } from '../v3/plan/data/goalCompassTypes.js';

type FacetKey =
  | 'acres'
  | 'climateZone'
  | 'primaryLandform'
  | 'avgSlopePct'
  | 'currentLandCover'
  | 'soilCompaction'
  | 'waterPosture'
  | 'hazards'
  | 'household'
  | 'lastFrostDate'
  | 'firstFrostDate';

type FacetValueMap = {
  acres: number;
  climateZone: string;
  primaryLandform: string;
  avgSlopePct: number;
  currentLandCover: string;
  soilCompaction: SoilCompaction;
  waterPosture: WaterPosture;
  hazards: string[];
  household: Household;
  lastFrostDate: string;
  firstFrostDate: string;
};

interface SiteProfileState {
  profilesByProject: Record<string, SiteProfile>;

  ensureDefault: (projectId: string) => void;
  getSiteProfile: (projectId: string) => SiteProfile;
  setFacet: <K extends FacetKey>(
    projectId: string,
    key: K,
    value: FacetValueMap[K] | null,
    provenance: FacetProvenance,
    observeFieldRef?: string,
  ) => void;
  clearFacet: (projectId: string, key: FacetKey) => void;
  countFilledFacets: (projectId: string) => { filled: number; manual: number; observe: number };
}

export const useSiteProfileStore = create<SiteProfileState>()(
  persist(
    (set, get) => ({
      profilesByProject: {},

      ensureDefault: (projectId) => {
        if (get().profilesByProject[projectId]) return;
        set((s) => ({
          profilesByProject: {
            ...s.profilesByProject,
            [projectId]: emptySiteProfile(projectId),
          },
        }));
      },

      getSiteProfile: (projectId) =>
        get().profilesByProject[projectId] ?? emptySiteProfile(projectId),

      setFacet: (projectId, key, value, provenance, observeFieldRef) =>
        set((s) => {
          const existing = s.profilesByProject[projectId] ?? emptySiteProfile(projectId);
          const facet: Facet<FacetValueMap[typeof key]> = {
            value,
            provenance,
            observeFieldRef,
            notedAt: new Date().toISOString(),
          };
          return {
            profilesByProject: {
              ...s.profilesByProject,
              [projectId]: { ...existing, [key]: facet } as SiteProfile,
            },
          };
        }),

      clearFacet: (projectId, key) =>
        set((s) => {
          const existing = s.profilesByProject[projectId] ?? emptySiteProfile(projectId);
          const facet: Facet<unknown> = { value: null, provenance: null };
          return {
            profilesByProject: {
              ...s.profilesByProject,
              [projectId]: { ...existing, [key]: facet } as SiteProfile,
            },
          };
        }),

      countFilledFacets: (projectId) => {
        const p = get().profilesByProject[projectId];
        if (!p) return { filled: 0, manual: 0, observe: 0 };
        const facets = [
          p.acres,
          p.climateZone,
          p.primaryLandform,
          p.avgSlopePct,
          p.currentLandCover,
          p.soilCompaction,
          p.waterPosture,
          p.hazards,
          p.household,
          p.lastFrostDate,
          p.firstFrostDate,
        ];
        const filled = facets.filter((f) => f.value !== null);
        return {
          filled: filled.length,
          manual: filled.filter((f) => f.provenance === 'manual').length,
          observe: filled.filter((f) => f.provenance === 'observe').length,
        };
      },
    }),
    {
      name: 'ogden-site-profiles',
      version: 1,
      partialize: (state) => ({ profilesByProject: state.profilesByProject }),
    },
  ),
);

useSiteProfileStore.persist.rehydrate();
