import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EdgeSchema, type Edge } from '@ogden/shared/relationships';

/**
 * Project-scoped graph of `Edge`s between placed entities. Every edge is
 * validated through `EdgeSchema.parse` on insert so an invalid edge can
 * never reach the persisted store.
 *
 * Phase 3 (server-of-record):
 *   - The server owns the canonical edge set; we hydrate from it and tag
 *     each edge with the server-issued `id` once known.
 *   - Local mutations are applied optimistically and queued in
 *     `pendingByProject` until the sync hook drains them. localStorage is
 *     the canonical write-buffer; server reads are eventual-consistent.
 *   - See wiki/decisions/2026-04-28-needs-yields-dependency-graph.md.
 */

export type StoredEdge = Edge & {
  /** Server-issued id once the edge has been confirmed by the API. */
  serverId?: string;
};

export type PendingMutation =
  | { kind: 'add'; edge: Edge }
  | { kind: 'delete'; serverId: string };

interface RelationshipsState {
  edgesByProject: Record<string, StoredEdge[]>;
  pendingByProject: Record<string, PendingMutation[]>;
  viewActive: boolean;

  edgesFor: (projectId: string) => StoredEdge[];
  pendingFor: (projectId: string) => PendingMutation[];
  addEdge: (
    projectId: string,
    edge: Edge,
  ) => { ok: true } | { ok: false; reason: string };
  removeEdge: (
    projectId: string,
    predicate: (e: StoredEdge) => boolean,
  ) => void;
  clearProject: (projectId: string) => void;
  setViewActive: (active: boolean) => void;

  /** Replace local edges with server-confirmed list (drops local-only adds; preserves pending queue). */
  hydrateFromServer: (
    projectId: string,
    serverEdges: Array<Edge & { id: string }>,
  ) => void;
  markEdgeSynced: (projectId: string, edge: Edge, serverId: string) => void;
  shiftPending: (projectId: string) => PendingMutation | undefined;
  unshiftPending: (projectId: string, mutation: PendingMutation) => void;
}

function edgeKey(e: { fromId: string; fromOutput: string; toId: string; toInput: string }) {
  return `${e.fromId}>${e.fromOutput}>${e.toId}>${e.toInput}`;
}

export const useRelationshipsStore = create<RelationshipsState>()(
  persist(
    (set, get) => ({
      edgesByProject: {},
      pendingByProject: {},
      viewActive: false,

      edgesFor: (projectId) => get().edgesByProject[projectId] ?? [],
      pendingFor: (projectId) => get().pendingByProject[projectId] ?? [],

      addEdge: (projectId, edge) => {
        const parsed = EdgeSchema.safeParse(edge);
        if (!parsed.success) {
          return { ok: false as const, reason: parsed.error.issues[0]?.message ?? 'invalid edge' };
        }
        set((s) => {
          const existing = s.edgesByProject[projectId] ?? [];
          const dupe = existing.some((e) => edgeKey(e) === edgeKey(parsed.data));
          if (dupe) return s;
          const pending = s.pendingByProject[projectId] ?? [];
          return {
            edgesByProject: {
              ...s.edgesByProject,
              [projectId]: [...existing, parsed.data],
            },
            pendingByProject: {
              ...s.pendingByProject,
              [projectId]: [...pending, { kind: 'add', edge: parsed.data }],
            },
          };
        });
        return { ok: true as const };
      },

      removeEdge: (projectId, predicate) =>
        set((s) => {
          const existing = s.edgesByProject[projectId] ?? [];
          const removed = existing.filter(predicate);
          const kept = existing.filter((e) => !predicate(e));
          const pending = s.pendingByProject[projectId] ?? [];
          const newPending: PendingMutation[] = [...pending];
          for (const e of removed) {
            if (e.serverId) {
              newPending.push({ kind: 'delete', serverId: e.serverId });
            } else {
              // Edge never reached the server — strip its pending add so we don't ghost-create it.
              const idx = newPending.findIndex(
                (m) => m.kind === 'add' && edgeKey(m.edge) === edgeKey(e),
              );
              if (idx >= 0) newPending.splice(idx, 1);
            }
          }
          return {
            edgesByProject: { ...s.edgesByProject, [projectId]: kept },
            pendingByProject: { ...s.pendingByProject, [projectId]: newPending },
          };
        }),

      clearProject: (projectId) =>
        set((s) => {
          const nextEdges = { ...s.edgesByProject };
          delete nextEdges[projectId];
          const nextPending = { ...s.pendingByProject };
          delete nextPending[projectId];
          return { edgesByProject: nextEdges, pendingByProject: nextPending };
        }),

      setViewActive: (active) => set({ viewActive: active }),

      hydrateFromServer: (projectId, serverEdges) =>
        set((s) => {
          const stored: StoredEdge[] = serverEdges.map(({ id, ...e }) => ({ ...e, serverId: id }));
          const storedKeys = new Set(stored.map(edgeKey));
          const pending = s.pendingByProject[projectId] ?? [];
          // Preserve local-only adds that haven't synced yet (still queued).
          const localOnly = (s.edgesByProject[projectId] ?? []).filter(
            (e) =>
              !e.serverId &&
              !storedKeys.has(edgeKey(e)) &&
              pending.some((m) => m.kind === 'add' && edgeKey(m.edge) === edgeKey(e)),
          );
          return {
            edgesByProject: {
              ...s.edgesByProject,
              [projectId]: [...stored, ...localOnly],
            },
          };
        }),

      markEdgeSynced: (projectId, edge, serverId) =>
        set((s) => {
          const existing = s.edgesByProject[projectId] ?? [];
          const k = edgeKey(edge);
          return {
            edgesByProject: {
              ...s.edgesByProject,
              [projectId]: existing.map((e) =>
                edgeKey(e) === k ? { ...e, serverId } : e,
              ),
            },
          };
        }),

      shiftPending: (projectId) => {
        const queue = get().pendingByProject[projectId] ?? [];
        if (queue.length === 0) return undefined;
        const [head, ...rest] = queue;
        set((s) => ({
          pendingByProject: { ...s.pendingByProject, [projectId]: rest },
        }));
        return head;
      },

      unshiftPending: (projectId, mutation) =>
        set((s) => {
          const queue = s.pendingByProject[projectId] ?? [];
          return {
            pendingByProject: {
              ...s.pendingByProject,
              [projectId]: [mutation, ...queue],
            },
          };
        }),
    }),
    {
      name: 'ogden-relationships',
      version: 2,
      partialize: (state) => ({
        edgesByProject: state.edgesByProject,
        pendingByProject: state.pendingByProject,
      }),
    },
  ),
);

if (typeof window !== 'undefined') {
  useRelationshipsStore.persist.rehydrate();
}
