/**
 * landDesignStore — persisted Zustand store for non-structure Plan-stage
 * design elements (paddock, pond, swale, orchard, path, road, gate,
 * bridge, turnaround, …).
 *
 * Extracted 2026-05-12 from `designElementsStore.ts`'s previously
 * module-private `useNonStructureStore` per the BE V2 unification ADR
 * (`wiki/decisions/2026-05-10-atlas-built-environment-unification.md`).
 *
 * Background: the original V1 `useDesignElementsStore` held ALL design
 * kinds (water polygons, access lines, grazing paddocks, structures,
 * machinery, amenities) in a single persisted byProject map. Phase 2
 * of the unification migrated structure-class kinds (cabin, yurt, barn,
 * shed, machinery-shed, fuel-station, equipment-yard, water-tank,
 * parking, prayer-pavilion, fire-circle, compost, greenhouse) into
 * `builtEnvironmentStoreV2`. The remaining non-structure kinds —
 * landform earthworks (pond, swale), access (path, road, gate, bridge,
 * turnaround), and grazing/horticulture surfaces (paddock, orchard) —
 * stayed in a module-private store inside `designElementsStore.ts`
 * until now.
 *
 * Extracting them into this top-level module is the first step toward
 * deleting the `useDesignElementsStore` V1 facade: callers can now read
 * non-structure kinds directly from `useLandDesignStore` instead of
 * routing through the merge-aware facade. The facade currently still
 * delegates here for backward compatibility; once every consumer has
 * migrated, the facade file deletes.
 *
 * Persistence: same localStorage key (`'ogden-atlas-design-elements'`)
 * and version (2) as the legacy `useNonStructureStore` so existing
 * project data continues to load without migration.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import type { DesignElement } from './designElementsStore.js';

export interface LandDesignState {
  byProject: Record<string, DesignElement[]>;
  add: (projectId: string, el: DesignElement) => void;
  addMany: (projectId: string, elements: DesignElement[]) => void;
  remove: (projectId: string, id: string) => void;
  clear: (projectId: string) => void;
  update: (
    projectId: string,
    id: string,
    patch: Partial<Omit<DesignElement, 'id'>>,
  ) => void;
}

export const useLandDesignStore = create<LandDesignState>()(
  persist(
    (set) => ({
      byProject: {},
      add: (projectId, el) =>
        set((s) => {
          const list = s.byProject[projectId] ?? [];
          const next: DesignElement = { view: 'current', ...el };
          return { byProject: { ...s.byProject, [projectId]: [...list, next] } };
        }),
      addMany: (projectId, elements) =>
        set((s) => {
          if (elements.length === 0) return s;
          const list = s.byProject[projectId] ?? [];
          const stamped = elements.map(
            (el) => ({ view: 'current', ...el }) as DesignElement,
          );
          return {
            byProject: {
              ...s.byProject,
              [projectId]: [...list, ...stamped],
            },
          };
        }),
      remove: (projectId, id) =>
        set((s) => {
          const list = s.byProject[projectId] ?? [];
          return {
            byProject: {
              ...s.byProject,
              [projectId]: list.filter((e) => e.id !== id),
            },
          };
        }),
      clear: (projectId) =>
        set((s) => {
          const next = { ...s.byProject };
          delete next[projectId];
          return { byProject: next };
        }),
      update: (projectId, id, patch) =>
        set((s) => {
          const list = s.byProject[projectId] ?? [];
          let changed = false;
          const updated = list.map((e) => {
            if (e.id !== id) return e;
            changed = true;
            return { ...e, ...patch } as DesignElement;
          });
          if (!changed) return s;
          return { byProject: { ...s.byProject, [projectId]: updated } };
        }),
    }),
    {
      name: 'ogden-atlas-design-elements',
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      version: 2,
      migrate: (persisted, fromVersion) => {
        // v1 -> v2: backfill `view: 'current'` on every existing element so
        // the per-view filter in DesignElementLayers keeps legacy records
        // visible on Current (and read-only on non-Current views).
        const state = persisted as
          | { byProject?: Record<string, DesignElement[]> }
          | undefined;
        if (!state || !state.byProject) return persisted as never;
        if (fromVersion >= 2) return persisted as never;
        const migrated: Record<string, DesignElement[]> = {};
        for (const [projectId, list] of Object.entries(state.byProject)) {
          migrated[projectId] = list.map((e) =>
            e.view ? e : { ...e, view: 'current' },
          );
        }
        return { ...state, byProject: migrated } as never;
      },
    },
  ),
);

rehydrateWithLogging(useLandDesignStore);
