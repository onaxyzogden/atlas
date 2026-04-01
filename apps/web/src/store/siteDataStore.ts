/**
 * Site Data Store — centralizes environmental layer fetching per project.
 * Serves data to all display panels (soil, climate, elevation, etc.).
 */

import { create } from 'zustand';
import { fetchAllLayers, type FetchLayerResults } from '../lib/layerFetcher.js';
import type { MockLayerResult } from '../lib/mockLayerData.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface SiteData {
  layers: MockLayerResult[];
  isLive: boolean;
  liveCount: number;
  fetchedAt: number;
  status: 'idle' | 'loading' | 'complete' | 'error';
}

export interface SiteDataState {
  dataByProject: Record<string, SiteData>;

  // Actions
  fetchForProject: (projectId: string, center: [number, number], country: 'US' | 'CA') => Promise<void>;
  refreshProject: (projectId: string, center: [number, number], country: 'US' | 'CA') => Promise<void>;
  clearProject: (projectId: string) => void;
}

// ── Store ─────────────────────────────────────────────────────────────────

export const useSiteDataStore = create<SiteDataState>((set, get) => ({
  dataByProject: {},

  async fetchForProject(projectId, center, country) {
    const existing = get().dataByProject[projectId];
    if (existing && (existing.status === 'loading' || existing.status === 'complete')) {
      return;
    }

    set((s) => ({
      dataByProject: {
        ...s.dataByProject,
        [projectId]: {
          layers: [],
          isLive: false,
          liveCount: 0,
          fetchedAt: 0,
          status: 'loading',
        },
      },
    }));

    try {
      const result: FetchLayerResults = await fetchAllLayers({ center, country });

      set((s) => ({
        dataByProject: {
          ...s.dataByProject,
          [projectId]: {
            layers: result.layers,
            isLive: result.isLive,
            liveCount: result.liveCount,
            fetchedAt: Date.now(),
            status: 'complete',
          },
        },
      }));
    } catch {
      set((s) => ({
        dataByProject: {
          ...s.dataByProject,
          [projectId]: {
            ...s.dataByProject[projectId],
            status: 'error',
          },
        },
      }));
    }
  },

  async refreshProject(projectId, center, country) {
    // Remove cached entry so we get fresh data
    const { [projectId]: _, ...rest } = get().dataByProject;
    set({ dataByProject: rest });

    // Clear the layer fetcher's localStorage cache to bypass 24h TTL
    try {
      localStorage.removeItem('ogden-layer-cache');
    } catch { /* SSR safety */ }

    // Re-fetch from scratch
    await get().fetchForProject(projectId, center, country);
  },

  clearProject(projectId) {
    const { [projectId]: _, ...rest } = get().dataByProject;
    set({ dataByProject: rest });
  },
}));

// ── Selector hook ─────────────────────────────────────────────────────────

export function useSiteData(projectId: string | undefined): SiteData | null {
  return useSiteDataStore((s) => projectId ? s.dataByProject[projectId] ?? null : null);
}

// ── Helper functions ──────────────────────────────────────────────────────

export function getLayer(data: SiteData, type: string): MockLayerResult | undefined {
  return data.layers.find((l) => l.layer_type === type);
}

export function getLayerSummary<T = Record<string, unknown>>(data: SiteData, type: string): T | null {
  const layer = getLayer(data, type);
  return layer ? (layer.summary as T) : null;
}
