/**
 * Site Profile store — per-project, persisted. Stores facets with
 * provenance stamps (`observe`, `manual`, or null). The Goal Compass
 * Site Profile tab is the read/write surface; the sequencing engine
 * reads through `getSiteProfile`.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import type {
  ConservationOverlay,
  Facet,
  FacetProvenance,
  FloodplainExtent,
  Household,
  LegalAccessStatus,
  SiteProfile,
  SoilCompaction,
  WaterPosture,
  ZoningFit,
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
  | 'firstFrostDate'
  | 'zoningFit'
  | 'legalAccess'
  | 'conservationOverlay'
  | 'floodplainExtent';

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
  zoningFit: ZoningFit;
  legalAccess: LegalAccessStatus;
  conservationOverlay: ConservationOverlay;
  floodplainExtent: FloodplainExtent;
};

const FACET_KEYS: FacetKey[] = [
  'acres',
  'climateZone',
  'primaryLandform',
  'avgSlopePct',
  'currentLandCover',
  'soilCompaction',
  'waterPosture',
  'hazards',
  'household',
  'lastFrostDate',
  'firstFrostDate',
  'zoningFit',
  'legalAccess',
  'conservationOverlay',
  'floodplainExtent',
];

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
        const facets = FACET_KEYS.map(
          (k) => (p as unknown as Record<string, Facet<unknown>>)[k],
        ).filter((f): f is Facet<unknown> => f != null);
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
      version: 3,
      partialize: (state) => ({ profilesByProject: state.profilesByProject }),
      // v3 added the Fit-Gate facets (zoningFit, legalAccess,
      // conservationOverlay, floodplainExtent). The normalizer below is
      // idempotent: it backfills any missing facet against the current key
      // set, so it handles both the v1→ and v2→v3 upgrades uniformly.
      migrate: (persisted: unknown, fromVersion: number) => {
        if (fromVersion >= 3) {
          return persisted as { profilesByProject: Record<string, SiteProfile> };
        }
        const state = (persisted as { profilesByProject?: Record<string, SiteProfile> }) ?? {};
        const profilesByProject = state.profilesByProject ?? {};
        const migrated: Record<string, SiteProfile> = {};
        for (const [pid, profile] of Object.entries(profilesByProject)) {
          const next = { ...emptySiteProfile(pid), ...profile, projectId: pid } as SiteProfile;
          for (const k of FACET_KEYS) {
            const cur = (next as unknown as Record<string, Facet<unknown> | undefined>)[k];
            if (!cur || typeof cur !== 'object' || !('value' in cur)) {
              (next as unknown as Record<string, Facet<unknown>>)[k] = {
                value: null,
                provenance: null,
              };
            }
          }
          migrated[pid] = next;
        }
        return { profilesByProject: migrated };
      },
    },
  ),
);

rehydrateWithLogging(useSiteProfileStore);
