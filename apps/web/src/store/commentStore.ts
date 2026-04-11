/**
 * Comment store — comments tied to map coordinates or specific features.
 *
 * Dual-layer: localStorage (offline cache) + backend sync when authenticated.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/apiClient.js';
import { syncQueue } from '../lib/syncQueue.js';
import type { CommentRecord, CreateCommentInput } from '@ogden/shared';

export interface Comment {
  id: string;
  serverId?: string;        // backend UUID — set after sync
  projectId: string;
  author: string;
  authorId?: string;        // user ID — set for backend-synced comments
  text: string;
  location: [number, number] | null; // [lng, lat] — null if attached to feature
  featureId: string | null;
  featureType: string | null;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CommentState {
  comments: Comment[];
  authorName: string;
  isLoading: boolean;

  // Local-only actions (preserved for offline/legacy)
  addComment: (comment: Comment) => void;
  updateComment: (id: string, updates: Partial<Comment>) => void;
  deleteComment: (id: string) => void;
  resolveComment: (id: string) => void;
  setAuthorName: (name: string) => void;

  // Backend-synced actions
  fetchComments: (projectId: string) => Promise<void>;
  createComment: (projectId: string, input: CreateCommentInput, authorName: string) => Promise<Comment | null>;
  resolveCommentRemote: (projectId: string, commentId: string) => Promise<void>;
  deleteCommentRemote: (projectId: string, commentId: string) => Promise<void>;
}

/** Convert a backend CommentRecord to our local Comment shape */
function fromRecord(r: CommentRecord): Comment {
  return {
    id: r.id,
    serverId: r.id,
    projectId: r.projectId,
    author: r.authorName ?? r.authorEmail,
    authorId: r.authorId,
    text: r.text,
    location: r.location,
    featureId: r.featureId,
    featureType: r.featureType,
    resolved: r.resolved,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export const useCommentStore = create<CommentState>()(
  persist(
    (set, get) => ({
      comments: [],
      authorName: 'Designer',
      isLoading: false,

      // ─── Local-only actions ──────────────────────────────────────────────
      addComment: (comment) => set((s) => ({ comments: [...s.comments, comment] })),

      updateComment: (id, updates) =>
        set((s) => ({
          comments: s.comments.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c,
          ),
        })),

      deleteComment: (id) => set((s) => ({ comments: s.comments.filter((c) => c.id !== id) })),

      resolveComment: (id) =>
        set((s) => ({
          comments: s.comments.map((c) =>
            c.id === id ? { ...c, resolved: true, updatedAt: new Date().toISOString() } : c,
          ),
        })),

      setAuthorName: (authorName) => set({ authorName }),

      // ─── Backend-synced actions ──────────────────────────────────────────

      fetchComments: async (projectId: string) => {
        set({ isLoading: true });
        try {
          const { data } = await api.comments.list(projectId);
          if (!data) return;

          // Replace local comments for this project with backend data
          const otherProjectComments = get().comments.filter((c) => c.projectId !== projectId);
          const backendComments = data.map(fromRecord);
          set({ comments: [...otherProjectComments, ...backendComments] });
        } catch (err) {
          console.warn('[OGDEN] Failed to fetch comments from backend:', err);
          // Keep local comments as fallback
        } finally {
          set({ isLoading: false });
        }
      },

      createComment: async (projectId: string, input: CreateCommentInput, authorName: string) => {
        try {
          const { data } = await api.comments.create(projectId, input);
          if (!data) return null;

          const comment = fromRecord(data);
          set((s) => ({ comments: [...s.comments, comment] }));
          return comment;
        } catch (err) {
          console.warn('[OGDEN] Failed to create comment on backend, saving locally:', err);
          // Fallback: save locally without serverId
          const fallback: Comment = {
            id: crypto.randomUUID(),
            projectId,
            author: authorName,
            text: input.text,
            location: input.location ?? null,
            featureId: input.featureId ?? null,
            featureType: input.featureType ?? null,
            resolved: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          set((s) => ({ comments: [...s.comments, fallback] }));

          // Queue for sync on reconnect
          if (!navigator.onLine) {
            syncQueue.enqueue({
              storeType: 'comment',
              action: 'create',
              localId: fallback.id,
              payload: { projectId, input, authorName, localId: fallback.id },
            }).catch((qErr) => console.warn('[OGDEN] Failed to queue comment:', qErr));
          }

          return fallback;
        }
      },

      resolveCommentRemote: async (projectId: string, commentId: string) => {
        // Optimistic update
        set((s) => ({
          comments: s.comments.map((c) =>
            (c.id === commentId || c.serverId === commentId)
              ? { ...c, resolved: true, updatedAt: new Date().toISOString() }
              : c,
          ),
        }));

        try {
          await api.comments.update(projectId, commentId, { resolved: true });
        } catch (err) {
          console.warn('[OGDEN] Failed to resolve comment on backend:', err);
        }
      },

      deleteCommentRemote: async (projectId: string, commentId: string) => {
        // Optimistic removal
        set((s) => ({
          comments: s.comments.filter((c) => c.id !== commentId && c.serverId !== commentId),
        }));

        try {
          await api.comments.delete(projectId, commentId);
        } catch (err) {
          console.warn('[OGDEN] Failed to delete comment on backend:', err);
        }
      },
    }),
    { name: 'ogden-comments', version: 2 },
  ),
);

// Hydrate from localStorage (Zustand v5)
useCommentStore.persist.rehydrate();
