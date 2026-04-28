import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EdgeSchema, type Edge } from '@ogden/shared/relationships';

/**
 * Project-scoped graph of `Edge`s between placed entities. Every edge is
 * validated through `EdgeSchema.parse` on insert so an invalid edge can
 * never reach the persisted store.
 *
 * Edges are keyed by `projectId` so switching projects loads the right
 * graph without a migration. Phase 2: localStorage-only; DB sync lands
 * in Phase 3.
 */

interface RelationshipsState {
  edgesByProject: Record<string, Edge[]>;
  viewActive: boolean;

  edgesFor: (projectId: string) => Edge[];
  addEdge: (projectId: string, edge: Edge) => { ok: true } | { ok: false; reason: string };
  removeEdge: (
    projectId: string,
    predicate: (e: Edge) => boolean,
  ) => void;
  clearProject: (projectId: string) => void;
  setViewActive: (active: boolean) => void;
}

export const useRelationshipsStore = create<RelationshipsState>()(
  persist(
    (set, get) => ({
      edgesByProject: {},
      viewActive: false,

      edgesFor: (projectId) => get().edgesByProject[projectId] ?? [],

      addEdge: (projectId, edge) => {
        const parsed = EdgeSchema.safeParse(edge);
        if (!parsed.success) {
          return { ok: false as const, reason: parsed.error.issues[0]?.message ?? 'invalid edge' };
        }
        set((s) => {
          const existing = s.edgesByProject[projectId] ?? [];
          const dupe = existing.some(
            (e) =>
              e.fromId === parsed.data.fromId &&
              e.fromOutput === parsed.data.fromOutput &&
              e.toId === parsed.data.toId &&
              e.toInput === parsed.data.toInput,
          );
          if (dupe) return s;
          return {
            edgesByProject: { ...s.edgesByProject, [projectId]: [...existing, parsed.data] },
          };
        });
        return { ok: true as const };
      },

      removeEdge: (projectId, predicate) =>
        set((s) => {
          const existing = s.edgesByProject[projectId] ?? [];
          return {
            edgesByProject: {
              ...s.edgesByProject,
              [projectId]: existing.filter((e) => !predicate(e)),
            },
          };
        }),

      clearProject: (projectId) =>
        set((s) => {
          const next = { ...s.edgesByProject };
          delete next[projectId];
          return { edgesByProject: next };
        }),

      setViewActive: (active) => set({ viewActive: active }),
    }),
    {
      name: 'ogden-relationships',
      version: 1,
      partialize: (state) => ({ edgesByProject: state.edgesByProject }),
    },
  ),
);

if (typeof window !== 'undefined') {
  useRelationshipsStore.persist.rehydrate();
}
