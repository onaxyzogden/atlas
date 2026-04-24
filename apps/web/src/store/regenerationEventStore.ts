/**
 * Regeneration event store — per-project cache for §7 timeline events.
 *
 * Shape mirrors siteDataStore: `eventsByProject[projectId] = { events, status, error }`.
 * Mutations (create/update/delete) refetch the project's list on success.
 */

import { create } from 'zustand';
import type { RegenerationEvent, RegenerationEventInput, RegenerationEventUpdateInput } from '@ogden/shared';
import { api } from '../lib/apiClient.js';

export type FetchStatus = 'idle' | 'loading' | 'complete' | 'error';

export interface ProjectEvents {
  events: RegenerationEvent[];
  status: FetchStatus;
  error: string | null;
}

export interface RegenerationEventState {
  eventsByProject: Record<string, ProjectEvents>;

  fetchForProject: (projectId: string) => Promise<void>;
  createEvent: (projectId: string, input: RegenerationEventInput) => Promise<RegenerationEvent>;
  updateEvent: (projectId: string, eventId: string, input: RegenerationEventUpdateInput) => Promise<RegenerationEvent>;
  deleteEvent: (projectId: string, eventId: string) => Promise<void>;
  clearProject: (projectId: string) => void;
}

export const useRegenerationEventStore = create<RegenerationEventState>((set, get) => ({
  eventsByProject: {},

  async fetchForProject(projectId) {
    set((s) => ({
      eventsByProject: {
        ...s.eventsByProject,
        [projectId]: {
          events: s.eventsByProject[projectId]?.events ?? [],
          status: 'loading',
          error: null,
        },
      },
    }));

    try {
      const res = await api.regenerationEvents.list(projectId);
      set((s) => ({
        eventsByProject: {
          ...s.eventsByProject,
          [projectId]: {
            events: res.data,
            status: 'complete',
            error: null,
          },
        },
      }));
    } catch (err) {
      set((s) => ({
        eventsByProject: {
          ...s.eventsByProject,
          [projectId]: {
            events: s.eventsByProject[projectId]?.events ?? [],
            status: 'error',
            error: err instanceof Error ? err.message : String(err),
          },
        },
      }));
    }
  },

  async createEvent(projectId, input) {
    const res = await api.regenerationEvents.create(projectId, input);
    await get().fetchForProject(projectId);
    return res.data;
  },

  async updateEvent(projectId, eventId, input) {
    const res = await api.regenerationEvents.update(projectId, eventId, input);
    await get().fetchForProject(projectId);
    return res.data;
  },

  async deleteEvent(projectId, eventId) {
    await api.regenerationEvents.delete(projectId, eventId);
    await get().fetchForProject(projectId);
  },

  clearProject(projectId) {
    const { [projectId]: _, ...rest } = get().eventsByProject;
    set({ eventsByProject: rest });
  },
}));

export function useRegenerationEvents(projectId: string | undefined): ProjectEvents | null {
  return useRegenerationEventStore((s) => (projectId ? s.eventsByProject[projectId] ?? null : null));
}
