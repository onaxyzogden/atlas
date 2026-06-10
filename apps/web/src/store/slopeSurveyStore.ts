/**
 * slopeSurveyStore -- persisted project-level register of DRAWN slope-class
 * polygons for the s2-terrain-c2 ("Slope gradients & aspects") objective.
 *
 * Replaces the old hand-typed percent-per-slope-class entry (TerrainCapture
 * slope mode) with a draw-on-map survey: the steward draws each slope class's
 * extent on the Act map and the per-class % of site is computed automatically
 * from polygon acreage. These polygons are semantically "observed terrain" and
 * live in their OWN layer -- deliberately NOT the Plan designElementsStore (so
 * they never render as designed elements). Direct sibling of
 * vegetationSurveyStore (s2-ecology-c1); same shape, different domain.
 *
 * Two slices in one store:
 *   - persisted `byProject` (SYNCED project data; registered in syncManifest as
 *     ogden-slope-survey). Mirrors vegetationSurveyStore's byProject shape.
 *   - ephemeral session UI state (`active` / `activeProjectId`) -- the
 *     rail-takeover flag. NOT persisted (partialize emits byProject only).
 *
 * Unlike the vegetation survey there is NO `activeClass`: the slope feature
 * exposes one bottom-rail draw tool PER class, so the armed map tool itself
 * encodes which class the next polygon joins (see SLOPE_TOOL_BY_CLASS).
 *
 * Production code may use crypto.randomUUID() / new Date().toISOString() (the
 * Date.now()/Math.random() ban is scripts-only).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';

/** The 6 slope class keys -- single source of truth shared with the
 *  TerrainCapture SLOPE_CLASSES list (same string keys, same order). */
export type SlopeClassKey =
  | 'flat'
  | 'gentle'
  | 'moderate'
  | 'steep'
  | 'vsteep'
  | 'extreme';

/** Per-class fill/line colour: a graduated low->high ramp (cool/safe flat ->
 *  hot/hazard extreme), shared by the panel swatches, the map layer (fill +
 *  line + label), and the in-progress draw preview tint. Keyed by the
 *  SlopeClassKey union so a missing/renamed key fails the compiler. */
export const SLOPE_CLASS_COLORS: Record<SlopeClassKey, string> = {
  flat: '#2c7bb6',
  gentle: '#7cc4a4',
  moderate: '#d9d362',
  steep: '#f3a14b',
  vsteep: '#e25b3a',
  extreme: '#d7191c',
};

/** Map tool id armed by each per-class bottom-rail draw tool. The active map
 *  tool encodes the class for the next polygon -- there is no in-panel class
 *  arming. Each id is mirrored as a literal in the MapToolId union
 *  (useMapToolStore) and in ACT_TOOL_CATALOG. */
export const SLOPE_TOOL_BY_CLASS: Record<SlopeClassKey, string> = {
  flat: 'act.terrain.slope-flat',
  gentle: 'act.terrain.slope-gentle',
  moderate: 'act.terrain.slope-moderate',
  steep: 'act.terrain.slope-steep',
  vsteep: 'act.terrain.slope-vsteep',
  extreme: 'act.terrain.slope-extreme',
};

/** Reverse lookup: armed map tool id -> slope class. Used by the DrawHost to
 *  tag a completed polygon with the class whose tool is active. */
export const SLOPE_CLASS_BY_TOOL: Record<string, SlopeClassKey> =
  Object.fromEntries(
    (Object.entries(SLOPE_TOOL_BY_CLASS) as [SlopeClassKey, string][]).map(
      ([cls, tool]) => [tool, cls],
    ),
  );

export interface SlopeSurveyFeature {
  id: string;
  slopeClass: SlopeClassKey;
  geometry: GeoJSON.Polygon;
  /** acres -- turf.area(geom) * 0.000247105 (same constant as design elements). */
  acreage: number;
  createdAt: string;
}

type FeaturesById = Record<string, SlopeSurveyFeature>;

/** Stable frozen empty register for reactive selectors (Zustand v5 snapshot
 *  stability -- avoid returning a fresh object each render). */
export const EMPTY_SLOPE_FEATURES: Readonly<FeaturesById> = Object.freeze({});

const PERSIST_KEY = 'ogden-slope-survey';

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `slope-survey-${crypto.randomUUID()}`;
}

interface SlopeSurveyState {
  // ---- persisted project data ----
  byProject: Record<string, FeaturesById>;

  /** All drawn features for a project (insertion order). */
  listForProject: (projectId: string) => SlopeSurveyFeature[];
  /** Add a drawn polygon (acreage already computed by the draw host). */
  addFeature: (
    projectId: string,
    feature: Omit<SlopeSurveyFeature, 'id' | 'createdAt'> &
      Partial<Pick<SlopeSurveyFeature, 'id' | 'createdAt'>>,
  ) => SlopeSurveyFeature;
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
  /** Open the survey takeover for a project (ActTierShell forces the map). */
  open: (projectId: string) => void;
  /** Close the takeover. */
  close: () => void;
}

export const useSlopeSurveyStore = create<SlopeSurveyState>()(
  persist(
    (set, get) => {
      const mutate = (
        projectId: string,
        featureId: string,
        fn: (existing: SlopeSurveyFeature) => SlopeSurveyFeature,
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
          const feature: SlopeSurveyFeature = {
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

        open: (projectId) => set({ active: true, activeProjectId: projectId }),
        close: () => set({ active: false, activeProjectId: null }),
      };
    },
    {
      name: PERSIST_KEY,
      version: 1,
      // Persist project data only -- the takeover flag is session-ephemeral
      // (mirror vegetationSurveyStore: never persisted).
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(useSlopeSurveyStore);

// ---------------------------------------------------------------------------
// Pure selector -- per-class summed acres + % of site, plus the
// "unclassified / not yet surveyed" remainder. siteAcres is the canonical
// project.location.acreage (acres). Percentages are NOT rounded here (display
// rounds); the remainder is 100 - sum(pct), clamped >= 0.
// ---------------------------------------------------------------------------

export interface SlopeClassTotal {
  acres: number;
  pct: number;
  count: number;
}

export interface SlopeSurveyTotals {
  byClass: Record<string, SlopeClassTotal>;
  totalAcres: number;
  /** 100 - sum(class pct), clamped to >= 0. */
  unclassifiedPct: number;
}

export function selectSlopeSurveyTotals(
  features: SlopeSurveyFeature[],
  siteAcres: number,
): SlopeSurveyTotals {
  const byClass: Record<string, SlopeClassTotal> = {};
  let totalAcres = 0;
  for (const f of features) {
    const acres = Number.isFinite(f.acreage) && f.acreage > 0 ? f.acreage : 0;
    totalAcres += acres;
    const entry = byClass[f.slopeClass] ?? { acres: 0, pct: 0, count: 0 };
    entry.acres += acres;
    entry.count += 1;
    byClass[f.slopeClass] = entry;
  }
  const safeSite = Number.isFinite(siteAcres) && siteAcres > 0 ? siteAcres : 0;
  let sumPct = 0;
  // Object.values yields the same entry references stored in byClass, so
  // mutating `pct` here updates the returned map (and sidesteps the
  // noUncheckedIndexedAccess `byClass[key]` possibly-undefined narrowing).
  for (const entry of Object.values(byClass)) {
    entry.pct = safeSite > 0 ? (entry.acres / safeSite) * 100 : 0;
    sumPct += entry.pct;
  }
  const unclassifiedPct = Math.max(0, 100 - sumPct);
  return { byClass, totalAcres, unclassifiedPct };
}
