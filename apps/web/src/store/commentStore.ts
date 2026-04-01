/**
 * Comment store — comments tied to map coordinates or specific features.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Comment {
  id: string;
  projectId: string;
  author: string;
  text: string;
  location: [number, number] | null; // [lng, lat] — null if attached to feature
  featureId: string | null; // zone/structure/paddock ID
  featureType: string | null; // 'zone' | 'structure' | 'paddock' | etc.
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CommentState {
  comments: Comment[];
  authorName: string;

  addComment: (comment: Comment) => void;
  updateComment: (id: string, updates: Partial<Comment>) => void;
  deleteComment: (id: string) => void;
  resolveComment: (id: string) => void;
  setAuthorName: (name: string) => void;
}

export const useCommentStore = create<CommentState>()(
  persist(
    (set) => ({
      comments: [],
      authorName: 'Designer',

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
    }),
    { name: 'ogden-comments', version: 1 },
  ),
);

// Hydrate from localStorage (Zustand v5)
useCommentStore.persist.rehydrate();
