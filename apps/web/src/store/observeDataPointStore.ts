/**
 * observeDataPointStore — Phase 4 Slice 4.1 substrate for the OLOS
 * Observe Dashboard (Dashboard Spec §2 + §4).
 *
 * Per project, we keep a flat append-only list of `ObserveDataPoint`
 * rows. New captures auto-compute supersession against same-domain
 * neighbours within the per-domain proximity radius
 * (`OBSERVE_DOMAIN_CATALOG[d].supersessionProximityMeters` falling
 * back to `DEFAULT_SUPERSESSION_PROXIMITY_METERS` — 10m). The "Not a
 * replacement" CTA round-trips both points back to active.
 *
 * This store is the formal Phase 4 substrate. It coexists with the
 * Phase 3 `observeFeedStore` (retained per no-deletion rule); the
 * Dashboard reads the union via the `routeToDataPoint` adapter
 * shipped in Slice 4.3.
 *
 * Persistence: Zustand `persist` middleware, key `ogden-observe-
 * data-points`. Registered as `versioned-blob` `byProject` in
 * `syncManifest.ts`. Rehydration logged via `rehydrateWithLogging`.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import {
  computeSupersession,
  DEFAULT_SUPERSESSION_PROXIMITY_METERS,
  OBSERVE_DOMAIN_CATALOG,
  type ObserveDataPoint,
} from '@ogden/shared';

const PERSIST_KEY = 'ogden-observe-data-points';

type ByProject = Record<string, ObserveDataPoint[]>;

const EMPTY_POINTS: readonly ObserveDataPoint[] = Object.freeze([]);

interface ObserveDataPointState {
  byProject: ByProject;

  // --- selectors ---
  getByProject: (projectId: string) => readonly ObserveDataPoint[];
  getActiveByProject: (projectId: string) => readonly ObserveDataPoint[];
  getByDomain: (
    projectId: string,
    domainId: ObserveDataPoint['domainId'],
  ) => readonly ObserveDataPoint[];
  getActiveByDomain: (
    projectId: string,
    domainId: ObserveDataPoint['domainId'],
  ) => readonly ObserveDataPoint[];
  getByObjective: (
    projectId: string,
    objectiveId: string,
  ) => readonly ObserveDataPoint[];
  getActiveByObjective: (
    projectId: string,
    objectiveId: string,
  ) => readonly ObserveDataPoint[];

  // --- mutators ---
  /** Insert a new data point. Computes supersession against existing
   *  same-domain rows in proximity and flips them to superseded. */
  recordDataPoint: (point: ObserveDataPoint) => void;
  /** "Not a replacement" — restore both the previously-superseded
   *  point and the point that superseded it. */
  restorePair: (
    projectId: string,
    supersededPointId: string,
    supersedingPointId: string,
  ) => void;
  /** Remove a data point entirely (used by tests + admin tooling). */
  removeDataPoint: (projectId: string, pointId: string) => void;
  /** Steward acknowledged a data point (e.g. "Apply to design" or "Keep
   *  plan" on the Plan reconciliation card). Flips it to superseded so it
   *  drops out of the active selectors and stops forcing the Plan revision
   *  flag, while preserving the row (no hard delete). */
  acknowledgeDataPoint: (projectId: string, pointId: string) => void;
  /** Overwrite the project's points wholesale (used by import flows
   *  + tests; bypasses supersession). */
  setProjectPoints: (
    projectId: string,
    points: readonly ObserveDataPoint[],
  ) => void;
  clearForProject: (projectId: string) => void;
}

function resolveRadius(domainId: ObserveDataPoint['domainId']): number {
  return (
    OBSERVE_DOMAIN_CATALOG[domainId]?.supersessionProximityMeters ??
    DEFAULT_SUPERSESSION_PROXIMITY_METERS
  );
}

/**
 * Persist migration for the data-point store. Persisted points are not
 * re-parsed on rehydrate, so backfill new nullable fields to keep stored
 * data consistent with the schema's output type. Cumulative — any pre-v3
 * blob gets both backfills:
 *   v2: ObserveDataPoint gained sourceObjectiveId.
 *   v3: ObserveDataPoint gained sourceFeatureRef (as-built deviations).
 * Exported for direct unit testing (mirrors migrateCropStore).
 */
export function migrateObserveDataPointStore(
  persisted: unknown,
  version: number,
): { byProject: ByProject } {
  const state = persisted as { byProject?: ByProject } | undefined;
  if (!state) return { byProject: {} };
  if (version >= 3) return { byProject: state.byProject ?? {} };
  const byProject = state.byProject ?? {};
  const next: ByProject = {};
  for (const [projectId, points] of Object.entries(byProject)) {
    next[projectId] = (points ?? []).map((p) => ({
      ...p,
      sourceObjectiveId: p.sourceObjectiveId ?? null,
      sourceFeatureRef: p.sourceFeatureRef ?? null,
    }));
  }
  return { byProject: next };
}

export const useObserveDataPointStore = create<ObserveDataPointState>()(
  persist(
    (set, get) => ({
      byProject: {},

      getByProject: (projectId) =>
        get().byProject[projectId] ?? EMPTY_POINTS,

      getActiveByProject: (projectId) =>
        (get().byProject[projectId] ?? []).filter((p) => !p.isSuperseded),

      getByDomain: (projectId, domainId) =>
        (get().byProject[projectId] ?? []).filter(
          (p) => p.domainId === domainId,
        ),

      getActiveByDomain: (projectId, domainId) =>
        (get().byProject[projectId] ?? []).filter(
          (p) => p.domainId === domainId && !p.isSuperseded,
        ),

      getByObjective: (projectId, objectiveId) =>
        (get().byProject[projectId] ?? []).filter(
          (p) => p.sourceObjectiveId === objectiveId,
        ),

      getActiveByObjective: (projectId, objectiveId) =>
        (get().byProject[projectId] ?? []).filter(
          (p) => p.sourceObjectiveId === objectiveId && !p.isSuperseded,
        ),

      recordDataPoint: (point) =>
        set((s) => {
          const existing = s.byProject[point.projectId] ?? [];
          const decision = computeSupersession(point, existing, {
            proximityMeters: resolveRadius(point.domainId),
          });
          const supersededSet = new Set(decision.supersededPointIds);
          const next: ObserveDataPoint[] = existing.map((p) =>
            supersededSet.has(p.id)
              ? { ...p, isSuperseded: true, supersededBy: point.id }
              : p,
          );
          next.push(point);
          return {
            byProject: { ...s.byProject, [point.projectId]: next },
          };
        }),

      restorePair: (projectId, supersededPointId, supersedingPointId) =>
        set((s) => {
          const list = s.byProject[projectId];
          if (!list) return s;
          const ids = new Set([supersededPointId, supersedingPointId]);
          let changed = false;
          const next = list.map((p) => {
            if (!ids.has(p.id)) return p;
            if (!p.isSuperseded && p.supersededBy === null) return p;
            changed = true;
            return { ...p, isSuperseded: false, supersededBy: null };
          });
          if (!changed) return s;
          return {
            byProject: { ...s.byProject, [projectId]: next },
          };
        }),

      removeDataPoint: (projectId, pointId) =>
        set((s) => {
          const list = s.byProject[projectId];
          if (!list) return s;
          const next = list.filter((p) => p.id !== pointId);
          if (next.length === list.length) return s;
          return {
            byProject: { ...s.byProject, [projectId]: next },
          };
        }),

      acknowledgeDataPoint: (projectId, pointId) =>
        set((s) => {
          const list = s.byProject[projectId];
          if (!list) return s;
          let changed = false;
          const next = list.map((p) => {
            if (p.id !== pointId) return p;
            if (p.isSuperseded) return p;
            changed = true;
            return { ...p, isSuperseded: true };
          });
          if (!changed) return s;
          return {
            byProject: { ...s.byProject, [projectId]: next },
          };
        }),

      setProjectPoints: (projectId, points) =>
        set((s) => ({
          byProject: { ...s.byProject, [projectId]: [...points] },
        })),

      clearForProject: (projectId) =>
        set((s) => {
          if (!(projectId in s.byProject)) return s;
          const { [projectId]: _dropped, ...rest } = s.byProject;
          return { byProject: rest };
        }),
    }),
    {
      name: PERSIST_KEY,
      version: 3,
      partialize: (state) => ({ byProject: state.byProject }),
      migrate: (persisted, version) =>
        migrateObserveDataPointStore(persisted, version),
    },
  ),
);

rehydrateWithLogging(useObserveDataPointStore);

/** Stable accessor mirroring the observeFeedStore pattern. */
export function selectObserveDataPointsForProject(
  state: ObserveDataPointState,
  projectId: string,
): readonly ObserveDataPoint[] {
  return state.byProject[projectId] ?? EMPTY_POINTS;
}
