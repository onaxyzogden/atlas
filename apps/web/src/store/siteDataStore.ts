/**
 * Site Data Store — centralizes environmental layer fetching per project.
 * Serves data to all display panels (soil, climate, elevation, etc.).
 */

import { create } from 'zustand';
import { fetchAllLayers, type FetchLayerResults } from '../lib/layerFetcher.js';
import type { AssessmentFlag } from '@ogden/shared';
import type { MockLayerResult } from '../lib/mockLayerData.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface AIEnrichmentState {
  status: 'idle' | 'loading' | 'complete' | 'error';
  enrichedFlags?: AssessmentFlag[];
  siteSynthesis?: string;
  fetchedAt?: number;
}

export interface SiteData {
  layers: MockLayerResult[];
  isLive: boolean;
  liveCount: number;
  fetchedAt: number;
  status: 'idle' | 'loading' | 'complete' | 'error';
  /** Phase 3: AI-enriched assessment data */
  enrichment?: AIEnrichmentState;
}

export interface SiteDataState {
  dataByProject: Record<string, SiteData>;

  // Actions
  fetchForProject: (projectId: string, center: [number, number], country: 'US' | 'CA') => Promise<void>;
  refreshProject: (projectId: string, center: [number, number], country: 'US' | 'CA') => Promise<void>;
  clearProject: (projectId: string) => void;
}

// ── Request tracking (prevents stale responses from overwriting fresh data) ──

const fetchGeneration = new Map<string, number>();

function nextGen(projectId: string): number {
  const gen = (fetchGeneration.get(projectId) ?? 0) + 1;
  fetchGeneration.set(projectId, gen);
  return gen;
}

function isStale(projectId: string, gen: number): boolean {
  return (fetchGeneration.get(projectId) ?? 0) !== gen;
}

// ── Store ─────────────────────────────────────────────────────────────────

export const useSiteDataStore = create<SiteDataState>((set, get) => ({
  dataByProject: {},

  async fetchForProject(projectId, center, country) {
    const existing = get().dataByProject[projectId];
    if (existing && (existing.status === 'loading' || existing.status === 'complete')) {
      return;
    }

    const gen = nextGen(projectId);

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

      // Discard if a newer request was started while this one was in-flight
      if (isStale(projectId, gen)) return;

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
      if (isStale(projectId, gen)) return;

      set((s) => {
        const existing = s.dataByProject[projectId];
        return {
          dataByProject: {
            ...s.dataByProject,
            [projectId]: {
              layers: existing?.layers ?? [],
              isLive: existing?.isLive ?? false,
              liveCount: existing?.liveCount ?? 0,
              fetchedAt: existing?.fetchedAt ?? 0,
              status: 'error' as const,
            },
          },
        };
      });
    }
  },

  async refreshProject(projectId, center, country) {
    // Clear the layer fetcher's localStorage cache to bypass 24h TTL
    try {
      localStorage.removeItem('ogden-layer-cache');
    } catch { /* SSR safety */ }

    const gen = nextGen(projectId);

    // Mark as loading but keep existing layers visible during refresh
    const existing = get().dataByProject[projectId];
    set((s) => ({
      dataByProject: {
        ...s.dataByProject,
        [projectId]: {
          layers: existing?.layers ?? [],
          isLive: existing?.isLive ?? false,
          liveCount: existing?.liveCount ?? 0,
          fetchedAt: existing?.fetchedAt ?? 0,
          status: 'loading',
        },
      },
    }));

    try {
      const result: FetchLayerResults = await fetchAllLayers({ center, country });

      if (isStale(projectId, gen)) return;

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
      if (isStale(projectId, gen)) return;

      set((s) => {
        const existing = s.dataByProject[projectId];
        return {
          dataByProject: {
            ...s.dataByProject,
            [projectId]: {
              layers: existing?.layers ?? [],
              isLive: existing?.isLive ?? false,
              liveCount: existing?.liveCount ?? 0,
              fetchedAt: existing?.fetchedAt ?? 0,
              status: 'error' as const,
            },
          },
        };
      });
    }
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
