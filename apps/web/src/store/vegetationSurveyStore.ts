/**
 * vegetationSurveyStore -- persisted project-level register of DRAWN vegetation
 * community polygons for the s2-ecology-c1 ("Vegetation survey") objective.
 *
 * Replaces the old hand-typed percent-of-site entry (EcologyCapture vegetation
 * mode) with a draw-on-map survey: the steward draws each community's extent on
 * the Act map and the per-community % of site is computed automatically from
 * polygon acreage. These polygons are semantically "observed existing
 * vegetation" and live in their OWN layer -- deliberately NOT the Plan
 * designElementsStore (so they never render as designed elements).
 *
 * Two slices in one store:
 *   - persisted `byProject` (SYNCED project data; registered in syncManifest as
 *     ogden-vegetation-survey). Mirrors stakeholderRegisterStore's byProject
 *     shape + mutate helper.
 *   - ephemeral session UI state (`active` / `activeProjectId` /
 *     `activeCommunity`) -- the rail-takeover flag, mirrors
 *     actSectorsEditorStore. NOT persisted (partialize emits byProject only).
 *
 * Production code may use crypto.randomUUID() / new Date().toISOString() (the
 * Date.now()/Math.random() ban is scripts-only).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';

/** The 7 vegetation community keys -- single source of truth shared with the
 *  EcologyCapture VEG_COMMUNITIES list (same string keys). */
export type VegCommunityKey =
  | 'cleared'
  | 'native-grass'
  | 'grassy-woodland'
  | 'riparian'
  | 'dense-woodland'
  | 'shrubland'
  | 'wetland';

/** Per-community fill/line colour, shared by the panel swatches, the map layer
 *  (fill + line + label), and the in-progress draw preview tint. Keyed by the
 *  same VegCommunityKey union so a missing/renamed key fails the compiler. */
export const VEG_COMMUNITY_COLORS: Record<VegCommunityKey, string> = {
  cleared: '#c9b079',
  'native-grass': '#9bbf5a',
  'grassy-woodland': '#7aa05a',
  riparian: '#5b9aa8',
  'dense-woodland': '#3f6b3f',
  shrubland: '#b08a4a',
  wetland: '#5f7fa8',
};

export interface VegetationSurveyFeature {
  id: string;
  community: VegCommunityKey;
  geometry: GeoJSON.Polygon;
  /** acres -- turf.area(geom) * 0.000247105 (same constant as design elements). */
  acreage: number;
  createdAt: string;
}

type FeaturesById = Record<string, VegetationSurveyFeature>;

/** Stable frozen empty register for reactive selectors (Zustand v5 snapshot
 *  stability -- avoid returning a fresh object each render). */
export const EMPTY_SURVEY_FEATURES: Readonly<FeaturesById> = Object.freeze({});

const PERSIST_KEY = 'ogden-vegetation-survey';

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `veg-survey-${crypto.randomUUID()}`;
}

interface VegetationSurveyState {
  // ---- persisted project data ----
  byProject: Record<string, FeaturesById>;

  /** All drawn features for a project (insertion order). */
  listForProject: (projectId: string) => VegetationSurveyFeature[];
  /** Add a drawn polygon (acreage already computed by the draw host). */
  addFeature: (
    projectId: string,
    feature: Omit<VegetationSurveyFeature, 'id' | 'createdAt'> &
      Partial<Pick<VegetationSurveyFeature, 'id' | 'createdAt'>>,
  ) => VegetationSurveyFeature;
  /** Delete one drawn polygon. */
  removeFeature: (projectId: string, featureId: string) => void;
  /** Replace a polygon's geometry + recomputed acreage (vertex edit). */
  updateGeometry: (
    projectId: string,
    featureId: string,
    geometry: GeoJSON.Polygon,
    acreage: number,
  ) => void;

  // ---- ephemeral session UI (NOT persisted) ----
  /** Is the survey rail-takeover open. */
  active: boolean;
  activeProjectId: string | null;
  activeCommunity: VegCommunityKey | null;
  /** Open the survey takeover for a project (ActTierShell forces the map). */
  open: (projectId: string) => void;
  /** Close the takeover and clear the armed community. */
  close: () => void;
  /** Select the community whose polygons the next draw appends to. */
  setActiveCommunity: (community: VegCommunityKey | null) => void;
}

export const useVegetationSurveyStore = create<VegetationSurveyState>()(
  persist(
    (set, get) => {
      const mutate = (
        projectId: string,
        featureId: string,
        fn: (existing: VegetationSurveyFeature) => VegetationSurveyFeature,
      ) => {
        set((s) => {
          const project = s.byProject[projectId];
          const existing = project?.[featureId];
          if (!existing) return s;
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...project,
                [featureId]: fn(existing),
              },
            },
          };
        });
      };

      return {
        byProject: {},

        listForProject: (projectId) =>
          Object.values(get().byProject[projectId] ?? {}),

        addFeature: (projectId, seed) => {
          const feature: VegetationSurveyFeature = {
            ...seed,
            id: seed.id ?? newId(),
            createdAt: seed.createdAt ?? now(),
          };
          set((s) => ({
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...(s.byProject[projectId] ?? {}),
                [feature.id]: feature,
              },
            },
          }));
          return feature;
        },

        removeFeature: (projectId, featureId) =>
          set((s) => {
            const project = s.byProject[projectId];
            if (!project) return s;
            const { [featureId]: _dropped, ...rest } = project;
            return { byProject: { ...s.byProject, [projectId]: rest } };
          }),

        updateGeometry: (projectId, featureId, geometry, acreage) =>
          mutate(projectId, featureId, (existing) => ({
            ...existing,
            geometry,
            acreage,
          })),

        // ---- ephemeral session UI ----
        active: false,
        activeProjectId: null,
        activeCommunity: null,

        open: (projectId) =>
          set({ active: true, activeProjectId: projectId, activeCommunity: null }),
        close: () =>
          set({ active: false, activeProjectId: null, activeCommunity: null }),
        setActiveCommunity: (community) => set({ activeCommunity: community }),
      };
    },
    {
      name: PERSIST_KEY,
      version: 1,
      // Persist project data only -- the takeover flag + armed community are
      // session-ephemeral (mirror actSectorsEditorStore: never persisted).
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(useVegetationSurveyStore);

// ---------------------------------------------------------------------------
// Pure selector -- per-community summed acres + % of site, plus the
// "unclassified / not yet surveyed" remainder. siteAcres is the canonical
// project.acreage (acres). Percentages are NOT rounded here (display rounds);
// the remainder is 100 - sum(pct), clamped >= 0.
// ---------------------------------------------------------------------------

export interface CommunityTotal {
  acres: number;
  pct: number;
  count: number;
}

export interface VegetationSurveyTotals {
  byCommunity: Record<string, CommunityTotal>;
  totalAcres: number;
  /** 100 - sum(community pct), clamped to >= 0. */
  unclassifiedPct: number;
}

export function selectVegetationSurveyTotals(
  features: VegetationSurveyFeature[],
  siteAcres: number,
): VegetationSurveyTotals {
  const byCommunity: Record<string, CommunityTotal> = {};
  let totalAcres = 0;
  for (const f of features) {
    const acres = Number.isFinite(f.acreage) && f.acreage > 0 ? f.acreage : 0;
    totalAcres += acres;
    const entry = byCommunity[f.community] ?? { acres: 0, pct: 0, count: 0 };
    entry.acres += acres;
    entry.count += 1;
    byCommunity[f.community] = entry;
  }
  const safeSite = Number.isFinite(siteAcres) && siteAcres > 0 ? siteAcres : 0;
  let sumPct = 0;
  for (const key of Object.keys(byCommunity)) {
    const entry = byCommunity[key];
    if (!entry) continue;
    entry.pct = safeSite > 0 ? (entry.acres / safeSite) * 100 : 0;
    sumPct += entry.pct;
  }
  const unclassifiedPct = Math.max(0, 100 - sumPct);
  return { byCommunity, totalAcres, unclassifiedPct };
}
