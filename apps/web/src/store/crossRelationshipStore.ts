/**
 * Cross-project relationship store (Portfolio Home §5).
 *
 * Backed by the backend API; NOT persisted to localStorage (server is the
 * source of truth, mirrors `memberStore`). Keyed `byProject` so the Portfolio
 * Map / rail can read the relationships touching the selected project.
 *
 * Relationships are symmetric (§5.3): a relationship between A and B appears in
 * BOTH `byProject[A]` and `byProject[B]`. After a create/delete that changes
 * one project's list, the other involved project is re-fetched so both stay
 * consistent.
 */

import { create } from 'zustand';
import { api } from '../lib/apiClient.js';
import type { CrossRelationship, CreateCrossRelationshipInput } from '@ogden/shared';

const EMPTY: readonly CrossRelationship[] = [];

interface CrossRelationshipState {
  byProject: Record<string, CrossRelationship[]>;

  getByProject: (projectId: string) => readonly CrossRelationship[];

  fetchForProject: (projectId: string) => Promise<void>;
  createRelationship: (
    projectAId: string,
    input: CreateCrossRelationshipInput,
  ) => Promise<CrossRelationship | null>;
  deleteRelationship: (projectId: string, relationshipId: string) => Promise<void>;

  reset: () => void;
}

export const useCrossRelationshipStore = create<CrossRelationshipState>()((set, get) => ({
  byProject: {},

  getByProject: (projectId: string) => get().byProject[projectId] ?? EMPTY,

  fetchForProject: async (projectId: string) => {
    try {
      const { data } = await api.crossRelationships.list(projectId);
      if (data) {
        set((s) => ({ byProject: { ...s.byProject, [projectId]: data } }));
      }
    } catch (err) {
      console.warn('[OGDEN] Failed to fetch cross-project relationships:', err);
    }
  },

  createRelationship: async (
    projectAId: string,
    input: CreateCrossRelationshipInput,
  ) => {
    try {
      const { data } = await api.crossRelationships.create(projectAId, input);
      if (data) {
        // Re-fetch both involved projects so the symmetric rows (with each
        // side's "other project name") surface consistently.
        await Promise.all([
          get().fetchForProject(projectAId),
          get().fetchForProject(input.projectBId),
        ]);
        return data;
      }
      return null;
    } catch (err) {
      console.warn('[OGDEN] Failed to create cross-project relationship:', err);
      throw err; // Re-throw so the UI can surface the error (e.g. 409 duplicate)
    }
  },

  deleteRelationship: async (projectId: string, relationshipId: string) => {
    // Find the relationship first so we know the other side to refresh, then
    // optimistically drop it from this project's list.
    const removed = get().byProject[projectId]?.find((r) => r.id === relationshipId);
    set((s) => ({
      byProject: {
        ...s.byProject,
        [projectId]: (s.byProject[projectId] ?? []).filter((r) => r.id !== relationshipId),
      },
    }));
    try {
      await api.crossRelationships.delete(projectId, relationshipId);
      // Keep the other side consistent.
      if (removed) {
        const otherId =
          removed.projectAId === projectId ? removed.projectBId : removed.projectAId;
        await get().fetchForProject(otherId);
      }
    } catch (err) {
      console.warn('[OGDEN] Failed to delete cross-project relationship:', err);
      // Revert by re-fetching the authoritative list.
      get().fetchForProject(projectId);
    }
  },

  reset: () => set({ byProject: {} }),
}));
