/**
 * React Query hooks for project data.
 *
 * These hooks are the bridge between the API client and React components.
 * They're opt-in — the app currently uses Zustand stores for local-first
 * operation. When the backend is available, these hooks can replace
 * direct store reads for server-authoritative data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/apiClient.js';
import { toast } from '../components/Toast.js';
import type { AssessmentResponse, BasemapTerrainResponse, CreateProjectInput, HydrologyWaterResponse, LayerType, UpdateProjectInput } from '@ogden/shared';

export interface ProjectLayerRow {
  id: string;
  projectId: string;
  layerType: LayerType;
  sourceApi: string | null;
  fetchStatus: 'pending' | 'fetching' | 'complete' | 'failed' | 'unavailable';
  confidence: 'high' | 'medium' | 'low' | null;
  dataDate: string | null;
  attributionText: string | null;
  geojsonData: unknown | null;
  summaryData: Record<string, unknown> | null;
  rasterUrl: string | null;
  wmsUrl: string | null;
  wmsLayers: string | null;
  metadata: Record<string, unknown> | null;
  fetchedAt: string | null;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const projectKeys = {
  all: ['projects'] as const,
  list: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
  completeness: (id: string) => [...projectKeys.all, 'completeness', id] as const,
  assessment: (id: string) => [...projectKeys.all, 'assessment', id] as const,
  hydrologyWater: (id: string) => [...projectKeys.all, 'hydrologyWater', id] as const,
  basemapTerrain: (id: string) => [...projectKeys.all, 'basemapTerrain', id] as const,
  layers: (id: string) => [...projectKeys.all, 'layers', id] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: async () => {
      const { data } = await api.projects.list();
      return data;
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.projects.get(id);
      return data;
    },
    enabled: !!id,
  });
}

export function useCompleteness(projectId: string) {
  return useQuery({
    queryKey: projectKeys.completeness(projectId),
    queryFn: async () => {
      const { data } = await api.projects.completeness(projectId);
      return data;
    },
    enabled: !!projectId,
  });
}

/**
 * Fetches the persisted `site_assessments` row for a project.
 *
 * Surfaces three states the UI needs to distinguish:
 *  - `isLoading`             — request in flight
 *  - `isNotReady`            — Tier-3 writer hasn't fired yet (server returns
 *                              `{ error: { code: 'NOT_READY' } }`)
 *  - `data`                  — current assessment row, includes `overall_score`,
 *                              `computed_at`, `score_breakdown`, terrain block
 *
 * `NOT_READY` is an expected non-error state — caller shows local preview.
 * Any other failure propagates as a React Query error.
 */
export function useAssessment(projectId: string) {
  const query = useQuery<AssessmentResponse | null, Error>({
    queryKey: projectKeys.assessment(projectId),
    queryFn: async () => {
      try {
        const { data } = await api.projects.assessment(projectId);
        return data;
      } catch (err) {
        if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'NOT_READY') {
          return null;
        }
        throw err;
      }
    },
    enabled: !!projectId,
    // Tier-3 writes are infrequent but fresh reads matter when they happen;
    // 60s stale window keeps the dashboard responsive without thrashing.
    staleTime: 60_000,
  });
  return {
    ...query,
    isNotReady: query.data === null && !query.isLoading && !query.isError,
  };
}

/**
 * Section 5 — hydrology & water systems summary for a project.
 *
 * Returns a typed `HydrologyWaterResponse` discriminated union:
 *  - `status: 'ready'`     — Tier-3 pipeline's `watershed_derived` layer
 *                            is persisted; caller renders summary + geojson
 *  - `status: 'not_ready'` — boundary missing or pipeline pending/failed;
 *                            caller shows an explanatory banner
 */
export function useHydrologyWater(projectId: string) {
  return useQuery<HydrologyWaterResponse, Error>({
    queryKey: projectKeys.hydrologyWater(projectId),
    queryFn: async () => {
      const { data } = await api.hydrologyWater.get(projectId);
      return data;
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

/**
 * Section 2 — Basemap & Terrain.
 * Reads `GET /api/v1/basemap-terrain/:projectId`, returns a typed
 * `BasemapTerrainResponse` discriminated union.
 */
export function useBasemapTerrain(projectId: string) {
  return useQuery<BasemapTerrainResponse, Error>({
    queryKey: projectKeys.basemapTerrain(projectId),
    queryFn: async () => {
      const { data } = await api.basemapTerrain.get(projectId);
      return data;
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

/**
 * Section 3 — Site Data Layers catalog.
 * Reads `GET /api/v1/layers/project/:projectId`, returns every `project_layers`
 * row hydrated by the Tier-1 pipeline (plus Tier-2/3 derived rows when present).
 */
export function useProjectLayers(projectId: string) {
  return useQuery<ProjectLayerRow[], Error>({
    queryKey: projectKeys.layers(projectId),
    queryFn: async () => {
      const { data } = await api.layers.list(projectId);
      return data as ProjectLayerRow[];
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useRefreshLayer(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (layerType: string) => api.layers.refresh(projectId, layerType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.layers(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.completeness(projectId) });
      toast.success('Layer refresh queued');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => api.projects.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list() });
      toast.success('Project created');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<UpdateProjectInput> }) =>
      api.projects.update(id, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.list() });
      toast.success('Project updated');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useSetBoundary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, geojson }: { id: string; geojson: unknown }) =>
      api.projects.setBoundary(id, geojson),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.completeness(id) });
      toast.success('Boundary updated');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
