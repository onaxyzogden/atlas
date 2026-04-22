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
import type { CreateProjectInput, UpdateProjectInput } from '@ogden/shared';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const projectKeys = {
  all: ['projects'] as const,
  list: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
  completeness: (id: string) => [...projectKeys.all, 'completeness', id] as const,
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
