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
  fetchForProject: (projectId: string, center: [number, number], country: string, bbox?: [number, number, number, number]) => Promise<void>;
  refreshProject: (projectId: string, center: [number, number], country: string, bbox?: [number, number, number, number]) => Promise<void>;
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

// ── Sprint BJ: per-project AbortController registry ──────────────────────────
// When a new fetch starts for a project that still has an in-flight fetch,
// abort the previous one so the store's outer race can resolve immediately.
// (Individual HTTP requests continue in the background — see layerFetcher.ts
// FetchLayerOptions.signal docstring.)

const activeControllers = new Map<string, AbortController>();

function takeController(projectId: string): AbortController {
  const prev = activeControllers.get(projectId);
  if (prev) prev.abort();
  const next = new AbortController();
  activeControllers.set(projectId, next);
  return next;
}

function releaseController(projectId: string, controller: AbortController) {
  if (activeControllers.get(projectId) === controller) {
    activeControllers.delete(projectId);
  }
}

/** Sprint BJ: abort any in-flight fetch for a project (called from
 * ProjectPage unmount/cleanup to avoid wasted background work when the user
 * navigates away before fetch completion). */
export function abortFetchForProject(projectId: string): void {
  const ctrl = activeControllers.get(projectId);
  if (ctrl) {
    ctrl.abort();
    activeControllers.delete(projectId);
  }
}

// ── Store ─────────────────────────────────────────────────────────────────

export const useSiteDataStore = create<SiteDataState>((set, get) => ({
  dataByProject: {},

  async fetchForProject(projectId, center, country, bbox?) {
    const existing = get().dataByProject[projectId];
    // Sprint BJ: only short-circuit on 'complete' — if a fetch is already
    // loading, we now REPLACE it (abort old + start new) so rapid boundary
    // edits land the latest result rather than being dropped on the floor.
    if (existing && existing.status === 'complete') {
      return;
    }

    const gen = nextGen(projectId);
    const controller = takeController(projectId);

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
      const result: FetchLayerResults = await fetchAllLayers({ center, country, bbox, signal: controller.signal });

      // Sprint BJ: outer race saw an abort — bail without touching state.
      if (result.aborted) return;

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
    } finally {
      releaseController(projectId, controller);
    }
  },

  async refreshProject(projectId, center, country, bbox?) {
    // Clear the layer fetcher's localStorage cache to bypass 24h TTL
    try {
      localStorage.removeItem('ogden-layer-cache');
    } catch { /* SSR safety */ }

    const gen = nextGen(projectId);
    const controller = takeController(projectId);

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
      const result: FetchLayerResults = await fetchAllLayers({ center, country, bbox, signal: controller.signal });

      if (result.aborted) return;
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
    } finally {
      releaseController(projectId, controller);
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
  return data.layers.find((l) => l.layerType === type);
}

export function getLayerSummary<T = Record<string, unknown>>(data: SiteData, type: string): T | null {
  const layer = getLayer(data, type);
  return layer ? (layer.summary as T) : null;
}
