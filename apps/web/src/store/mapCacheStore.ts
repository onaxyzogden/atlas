/**
 * mapCacheStore — per-project, per-basemap offline-tile cache status.
 *
 * The service worker (Workbox) and tilePrecache.ts do the actual caching; this
 * store is the VISIBILITY layer over that work. It records, for each project and
 * each basemap, whether its tiles have been warmed ('ready'), are warming
 * ('caching'), failed ('error'), or were never attempted ('uncached'), plus a
 * tile count and a last-cached timestamp.
 *
 * Read by the BaseMapCard cache chip, the Fieldwork "Offline Maps" panel, and
 * the graceful-fallback effect (offline + active basemap not 'ready' → satellite).
 *
 * Persisted via idbPersistStorage so status survives reload. Timestamps are
 * passed in by callers (no Date.now() inside actions, per project norms — keeps
 * actions pure and the store resume-safe).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import type { BasemapKey } from '../v3/observe/components/measure/useMapToolStore.js';

export type BasemapCacheStatus = 'uncached' | 'caching' | 'ready' | 'error';

export interface BasemapEntry {
  status: BasemapCacheStatus;
  tilesCached: number;
  lastCachedAt: string | null;
}

/** Rollup over all of a project's basemaps, for the passive status chip. */
export interface ProjectCacheStatus {
  /** Every known basemap entry is 'ready'. */
  allReady: boolean;
  /** At least one basemap is currently 'caching'. */
  anyCaching: boolean;
  /** At least one basemap is 'ready'. */
  anyReady: boolean;
  /** Sum of tilesCached across basemaps. */
  totalTiles: number;
  /** Oldest lastCachedAt across ready basemaps (ISO-8601), or null. */
  oldestCachedAt: string | null;
}

export interface MapCacheState {
  byProject: Record<string, Partial<Record<BasemapKey, BasemapEntry>>>;

  /** Set a basemap's lifecycle status (does not touch count/timestamp). */
  setBasemapStatus: (
    projectId: string,
    basemap: BasemapKey,
    status: BasemapCacheStatus,
  ) => void;
  /** Record a completed cache run: status→'ready', count + timestamp written. */
  recordCacheResult: (
    projectId: string,
    basemap: BasemapKey,
    tilesCached: number,
    ts: string,
  ) => void;
  /** Read a single basemap entry (undefined → never attempted). */
  getBasemapEntry: (
    projectId: string,
    basemap: BasemapKey,
  ) => BasemapEntry | undefined;
  /** Roll a project's basemaps up into a single status for the chip. */
  getProjectStatus: (projectId: string) => ProjectCacheStatus;
}

function emptyRollup(): ProjectCacheStatus {
  return {
    allReady: false,
    anyCaching: false,
    anyReady: false,
    totalTiles: 0,
    oldestCachedAt: null,
  };
}

export const useMapCacheStore = create<MapCacheState>()(
  persist(
    (set, get) => ({
      byProject: {},

      setBasemapStatus: (projectId, basemap, status) =>
        set((s) => {
          const project = s.byProject[projectId] ?? {};
          const prev = project[basemap] ?? {
            status: 'uncached' as BasemapCacheStatus,
            tilesCached: 0,
            lastCachedAt: null,
          };
          return {
            byProject: {
              ...s.byProject,
              [projectId]: { ...project, [basemap]: { ...prev, status } },
            },
          };
        }),

      recordCacheResult: (projectId, basemap, tilesCached, ts) =>
        set((s) => {
          const project = s.byProject[projectId] ?? {};
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...project,
                [basemap]: {
                  status: 'ready' as BasemapCacheStatus,
                  tilesCached,
                  lastCachedAt: ts,
                },
              },
            },
          };
        }),

      getBasemapEntry: (projectId, basemap) =>
        get().byProject[projectId]?.[basemap],

      getProjectStatus: (projectId) => {
        const project = get().byProject[projectId];
        if (!project) return emptyRollup();
        const entries = Object.values(project).filter(
          (e): e is BasemapEntry => e !== undefined,
        );
        if (entries.length === 0) return emptyRollup();

        let totalTiles = 0;
        let anyCaching = false;
        let anyReady = false;
        let allReady = true;
        let oldestCachedAt: string | null = null;

        for (const e of entries) {
          totalTiles += e.tilesCached;
          if (e.status === 'caching') anyCaching = true;
          if (e.status === 'ready') {
            anyReady = true;
            if (
              e.lastCachedAt &&
              (oldestCachedAt === null || e.lastCachedAt < oldestCachedAt)
            ) {
              oldestCachedAt = e.lastCachedAt;
            }
          } else {
            allReady = false;
          }
        }

        return { allReady, anyCaching, anyReady, totalTiles, oldestCachedAt };
      },
    }),
    {
      name: 'ogden-map-cache',
      version: 1,
      storage: idbPersistStorage,
      // Only the cache ledger is durable; nothing else lives in this store.
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);
