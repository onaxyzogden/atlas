/**
 * Site Data Store — centralizes environmental layer fetching per project.
 * Serves data to all display panels (soil, climate, elevation, etc.).
 */

import { create } from 'zustand';
import { fetchAllLayers, type FetchLayerResults } from '../lib/layerFetcher.js';
import type { AIOutput, AssessmentFlag, EnrichedAssessmentFlag } from '@ogden/shared';
import type { MockLayerResult } from '../lib/mockLayerData.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface AIEnrichmentState {
  status: 'idle' | 'loading' | 'complete' | 'error';
  enrichedFlags?: EnrichedAssessmentFlag[];
  siteSynthesis?: string;
  aiNarrative?: AIOutput;
  designRecommendation?: AIOutput;
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
  fetchForProject: (projectId: string, center: [number, number], country: 'US' | 'CA', bbox?: [number, number, number, number]) => Promise<void>;
  refreshProject: (projectId: string, center: [number, number], country: 'US' | 'CA', bbox?: [number, number, number, number]) => Promise<void>;
  enrichProject: (projectId: string) => Promise<void>;
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

  async fetchForProject(projectId, center, country, bbox?) {
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
      const result: FetchLayerResults = await fetchAllLayers({ center, country, bbox });

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

      // Fire-and-forget AI enrichment after layers arrive
      get().enrichProject(projectId);
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

  async refreshProject(projectId, center, country, bbox?) {
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
      const result: FetchLayerResults = await fetchAllLayers({ center, country, bbox });

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

      // Re-run AI enrichment with fresh layer data
      set((s) => {
        const cur = s.dataByProject[projectId];
        if (!cur) return s;
        return {
          dataByProject: {
            ...s.dataByProject,
            [projectId]: { ...cur, enrichment: undefined },
          },
        };
      });
      get().enrichProject(projectId);
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

  async enrichProject(projectId) {
    const existing = get().dataByProject[projectId];
    if (!existing || existing.status !== 'complete') return;

    // Don't re-enrich if already loading or complete
    if (existing.enrichment?.status === 'loading' || existing.enrichment?.status === 'complete') return;

    set((s) => {
      const cur = s.dataByProject[projectId];
      if (!cur) return s;
      return {
        dataByProject: {
          ...s.dataByProject,
          [projectId]: { ...cur, enrichment: { status: 'loading' as const } },
        },
      };
    });

    try {
      // Lazy import to avoid circular dependencies and keep initial bundle small
      const { generateSiteNarrative, generateDesignRecommendation, enrichAssessmentFlags } =
        await import('../lib/aiEnrichment.js');

      const [narrativeResult, recommendationResult, enrichmentResult] = await Promise.allSettled([
        generateSiteNarrative(projectId),
        generateDesignRecommendation(projectId),
        enrichAssessmentFlags(projectId),
      ]);

      const aiNarrative = narrativeResult.status === 'fulfilled' ? narrativeResult.value : null;
      const designRecommendation = recommendationResult.status === 'fulfilled' ? recommendationResult.value : null;
      const enrichResult = enrichmentResult.status === 'fulfilled' ? enrichmentResult.value : null;

      // At least one succeeded
      const hasAny = aiNarrative || designRecommendation || enrichResult;

      set((s) => {
        const cur = s.dataByProject[projectId];
        if (!cur) return s;
        return {
          dataByProject: {
            ...s.dataByProject,
            [projectId]: {
              ...cur,
              enrichment: {
                status: hasAny ? 'complete' as const : 'error' as const,
                aiNarrative: aiNarrative ?? undefined,
                designRecommendation: designRecommendation ?? undefined,
                enrichedFlags: enrichResult?.enrichedFlags,
                siteSynthesis: enrichResult?.siteSynthesis,
                fetchedAt: Date.now(),
              },
            },
          },
        };
      });
    } catch {
      set((s) => {
        const cur = s.dataByProject[projectId];
        if (!cur) return s;
        return {
          dataByProject: {
            ...s.dataByProject,
            [projectId]: { ...cur, enrichment: { status: 'error' as const } },
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
