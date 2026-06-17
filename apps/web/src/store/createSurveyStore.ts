/**
 * createSurveyStore -- domain-neutral factory for a Plan-stage "reception
 * survey" draw layer (the Tier-2 / Stratum-3 Systems-Reading restructure,
 * 2026-06-16).
 *
 * Lifted from `slopeSurveyStore` (s2-terrain-c2) -- the established byProject
 * survey-store pattern -- so each of the five reception surveys (water,
 * soil, nutrient cycling, pest pressure, livestock water) holds its DRAWN
 * features in the SAME persisted-byProject + ephemeral-takeover shape without
 * five hand-copied stores. The slope/vegetation stores stay as they are (their
 * test suites pin them); this factory is for the new reception layer only.
 *
 * Two slices per created store, exactly mirroring slopeSurveyStore:
 *   - persisted `byProject` (SYNCED project data; each instance registered in
 *     syncManifest as `ogden-<name>-survey`, byProject blob).
 *   - ephemeral session UI (`active` / `activeProjectId`) -- the rail-takeover
 *     flag, NOT persisted (partialize emits byProject only).
 *
 * Domain variation is injected through `SurveyStoreConfig`:
 *   - persist key, feature-id prefix, draw-tool prefix, source objective id
 *   - the class palette (`classes`: key + label + colour), keyed by a string
 *     union `C` so a missing/renamed class fails the compiler
 *   - the geometry kinds the survey draws (`kinds`: poly | line | point).
 *
 * Unlike the slope store there is no fixed 6-class union baked in -- each survey
 * declares its own classes. The armed map tool encodes the class for the next
 * feature (TOOL_BY_CLASS / CLASS_BY_TOOL), same as slope (no in-panel arming).
 *
 * Production code may use crypto.randomUUID() / new Date().toISOString() (the
 * Date.now()/Math.random() ban is scripts-only).
 */

import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';

/** Geometry kinds a survey can draw. `measure` is acres (poly), length in
 *  metres (line), or 1 (point) -- the draw host computes it before addFeature. */
export type SurveyFeatureKind = 'poly' | 'line' | 'point';

/** One class in a survey palette: the union key, a display label, the
 *  fill/line/swatch colour shared by panel + map layer + draw preview, and the
 *  geometry kind the class's draw tool produces (e.g. a flow path is a line, a
 *  wet zone a polygon). */
export interface SurveyClassDef<C extends string> {
  key: C;
  label: string;
  color: string;
  kind: SurveyFeatureKind;
}

/** Domain wiring for one concrete reception-survey store. */
export interface SurveyStoreConfig<C extends string> {
  /** Zustand persist key (IndexedDB backend), e.g. `ogden-recep-hydrology-survey`. */
  persistName: string;
  /** Feature-id prefix; id = `${idPrefix}-${uuid}`, e.g. `recep-hydrology`. */
  idPrefix: string;
  /** Draw-tool id prefix; per-class tool = `${toolPrefix}-${classKey}`. */
  toolPrefix: string;
  /** The resolved Stratum-3 objective this survey captures for. */
  sourceObjectiveId: string;
  /** The class palette (order preserved for the panel + sequencing). Each class
   *  declares its own geometry kind; the distinct set is exposed as `kinds`. */
  classes: readonly SurveyClassDef<C>[];
  /** Persist version (default 1). */
  version?: number;
}

export interface SurveyFeature<C extends string> {
  id: string;
  /** Plan objective active when this feature was drawn (provenance stamp). */
  sourceObjectiveId?: string;
  /** Which class the feature joins (encoded by the armed draw tool). */
  surveyClass: C;
  /** Geometry kind -- the render discriminator for the layer's sublayers. */
  kind: SurveyFeatureKind;
  geometry: GeoJSON.Geometry;
  /** acres (poly) | length metres (line) | 1 (point). Computed by the host. */
  measure: number;
  createdAt: string;
}

type FeaturesById<C extends string> = Record<string, SurveyFeature<C>>;

export interface SurveyStoreState<C extends string> {
  // ---- persisted project data ----
  byProject: Record<string, FeaturesById<C>>;

  /** All drawn features for a project (insertion order). */
  listForProject: (projectId: string) => SurveyFeature<C>[];
  /** Add a drawn feature (measure already computed by the draw host). */
  addFeature: (
    projectId: string,
    feature: Omit<SurveyFeature<C>, 'id' | 'createdAt'> &
      Partial<Pick<SurveyFeature<C>, 'id' | 'createdAt'>>,
  ) => SurveyFeature<C>;
  /** Delete one drawn feature. */
  removeFeature: (projectId: string, featureId: string) => void;
  /** Replace a feature's geometry + recomputed measure (vertex edit). */
  updateGeometry: (
    projectId: string,
    featureId: string,
    geometry: GeoJSON.Geometry,
    measure: number,
  ) => void;
  /** Change a feature's class (reclassify). Geometry/measure untouched. */
  updateClass: (
    projectId: string,
    featureId: string,
    surveyClass: C,
  ) => void;
  /** Locate a feature by id across every project (ids are globally unique).
   *  Mirrors the slope/design-element global-find pattern. */
  findFeatureGlobal: (
    featureId: string,
  ) => { projectId: string; feature: SurveyFeature<C> } | null;

  // ---- ephemeral session UI (NOT persisted) ----
  /** Is the survey rail-takeover open. */
  active: boolean;
  activeProjectId: string | null;
  /** Open the survey takeover for a project (forces the map). */
  open: (projectId: string) => void;
  /** Close the takeover. */
  close: () => void;
}

/** The bound zustand hook a created survey store exposes. Written explicitly as
 *  `UseBoundStore<StoreApi<...>>` rather than `ReturnType<typeof create<...>>`:
 *  zustand v5's `create` is curried, so that ReturnType resolves to the inner
 *  curried factory (`<Mos>(init) => UseBoundStore`) instead of the bound store,
 *  which strips `getState`/`setState` and the `(selector) => U` overload. */
export type SurveyStoreHook<C extends string> = UseBoundStore<
  StoreApi<SurveyStoreState<C>>
>;

/** Everything a created survey store hands back: the hook plus the derived
 *  palette/tool maps the layer/host/panel need. */
export interface SurveyStoreBundle<C extends string> {
  config: SurveyStoreConfig<C>;
  useStore: SurveyStoreHook<C>;
  /** Stable frozen empty register for reactive selectors. */
  EMPTY_FEATURES: Readonly<FeaturesById<C>>;
  /** classKey -> colour (panel swatch + map fill/line + draw preview). */
  CLASS_COLORS: Record<C, string>;
  /** classKey -> display label (reclassify picker). */
  CLASS_LABELS: Record<C, string>;
  /** classKey -> armed draw-tool id. */
  TOOL_BY_CLASS: Record<C, string>;
  /** armed draw-tool id -> classKey (DrawHost tags the completed feature). */
  CLASS_BY_TOOL: Record<string, C>;
  /** classKey -> geometry kind the class's draw tool produces. */
  KIND_BY_CLASS: Record<C, SurveyFeatureKind>;
  /** The class keys in authored order. */
  classKeys: C[];
  /** The distinct geometry kinds this survey draws (for the layer's sublayers). */
  kinds: SurveyFeatureKind[];
}

function now(): string {
  return new Date().toISOString();
}

/**
 * Build one concrete reception-survey store from its config. Called once at
 * module scope per survey (so `rehydrateWithLogging` runs exactly once per
 * persisted store). Returns the hook + the derived palette/tool maps.
 */
export function createSurveyStore<C extends string>(
  config: SurveyStoreConfig<C>,
): SurveyStoreBundle<C> {
  const { persistName, idPrefix, toolPrefix, version = 1 } = config;

  const classKeys = config.classes.map((c) => c.key);
  const CLASS_COLORS = Object.fromEntries(
    config.classes.map((c) => [c.key, c.color]),
  ) as Record<C, string>;
  const CLASS_LABELS = Object.fromEntries(
    config.classes.map((c) => [c.key, c.label]),
  ) as Record<C, string>;
  const TOOL_BY_CLASS = Object.fromEntries(
    config.classes.map((c) => [c.key, `${toolPrefix}-${c.key}`]),
  ) as Record<C, string>;
  const CLASS_BY_TOOL = Object.fromEntries(
    config.classes.map((c) => [`${toolPrefix}-${c.key}`, c.key]),
  ) as Record<string, C>;
  const KIND_BY_CLASS = Object.fromEntries(
    config.classes.map((c) => [c.key, c.kind]),
  ) as Record<C, SurveyFeatureKind>;
  const kinds = [...new Set(config.classes.map((c) => c.kind))];

  const EMPTY_FEATURES: Readonly<FeaturesById<C>> = Object.freeze({});

  const newId = (): string => `${idPrefix}-${crypto.randomUUID()}`;

  const useStore = create<SurveyStoreState<C>>()(
    persist(
      (set, get) => {
        const mutate = (
          projectId: string,
          featureId: string,
          fn: (existing: SurveyFeature<C>) => SurveyFeature<C>,
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
            const feature: SurveyFeature<C> = {
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

          updateGeometry: (projectId, featureId, geometry, measure) =>
            mutate(projectId, featureId, (existing) => ({
              ...existing,
              geometry,
              measure,
            })),

          updateClass: (projectId, featureId, surveyClass) =>
            mutate(projectId, featureId, (existing) => ({
              ...existing,
              surveyClass,
            })),

          findFeatureGlobal: (featureId) => {
            for (const [projectId, rows] of Object.entries(get().byProject)) {
              const feature = rows[featureId];
              if (feature) return { projectId, feature };
            }
            return null;
          },

          // ---- ephemeral session UI ----
          active: false,
          activeProjectId: null,

          open: (projectId) =>
            set({ active: true, activeProjectId: projectId }),
          close: () => set({ active: false, activeProjectId: null }),
        };
      },
      {
        name: persistName,
        version,
        // Synced project data lives in IndexedDB, same backend as every other
        // byProject store. Node-safe (degrades to localStorage/null).
        storage: idbPersistStorage,
        // Persist project data only -- the takeover flag is session-ephemeral.
        partialize: (state) => ({ byProject: state.byProject }),
      },
    ),
  );

  rehydrateWithLogging(useStore);

  return {
    config,
    useStore,
    EMPTY_FEATURES,
    CLASS_COLORS,
    CLASS_LABELS,
    TOOL_BY_CLASS,
    CLASS_BY_TOOL,
    KIND_BY_CLASS,
    classKeys,
    kinds,
  };
}

// ---------------------------------------------------------------------------
// Pure selector -- per-class summed measure + (for area surveys) % of site,
// plus the "unclassified / not yet surveyed" remainder. Generalised from
// selectSlopeSurveyTotals: `measure` replaces `acres`, and a `featureCount` is
// added so the reception record-count can sum feature counts directly.
//
// For polygon surveys pass the resolved site acres (resolveSiteAcres) so `pct`
// is % of site and `unclassifiedPct` the remainder. For line/point surveys the
// site-relative pct is not meaningful -- pass 0 and read `measure`/`count` only.
// ---------------------------------------------------------------------------

export interface SurveyClassTotal {
  measure: number;
  pct: number;
  count: number;
}

export interface SurveyTotals {
  byClass: Record<string, SurveyClassTotal>;
  totalMeasure: number;
  /** Number of features summed (all classes). */
  featureCount: number;
  /** 100 - sum(class pct), clamped to >= 0 (meaningful for area surveys). */
  unclassifiedPct: number;
}

export function selectSurveyTotals(
  features: readonly SurveyFeature<string>[],
  siteAcres: number,
): SurveyTotals {
  const byClass: Record<string, SurveyClassTotal> = {};
  let totalMeasure = 0;
  let featureCount = 0;
  for (const f of features) {
    const measure =
      Number.isFinite(f.measure) && f.measure > 0 ? f.measure : 0;
    totalMeasure += measure;
    featureCount += 1;
    const entry = byClass[f.surveyClass] ?? { measure: 0, pct: 0, count: 0 };
    entry.measure += measure;
    entry.count += 1;
    byClass[f.surveyClass] = entry;
  }
  const safeSite = Number.isFinite(siteAcres) && siteAcres > 0 ? siteAcres : 0;
  let sumPct = 0;
  for (const entry of Object.values(byClass)) {
    entry.pct = safeSite > 0 ? (entry.measure / safeSite) * 100 : 0;
    sumPct += entry.pct;
  }
  const unclassifiedPct = Math.max(0, 100 - sumPct);
  return { byClass, totalMeasure, featureCount, unclassifiedPct };
}
