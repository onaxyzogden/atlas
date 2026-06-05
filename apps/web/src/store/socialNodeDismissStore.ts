/**
 * socialNodeDismissStore — session-only dismissals for Social-node
 * opportunities (Rec #6 v2).
 *
 * The SocialNodesCard surfaces Z1/Z2 path-intersection "social node
 * opportunities" (the Scholar's "nets in the flow"). A steward may judge a
 * given intersection a non-opportunity (e.g. it abuts a building) and wave it
 * off. Those dismissals are **advisory and intentionally ephemeral** — they are
 * NOT project data: not persisted, not synced, not per-view. A page reload
 * brings every opportunity back, which is the desired behaviour for a planning
 * suggestion (unlike a placed bench, which IS data and lives in landDesignStore).
 *
 * Keyed by project id so switching projects doesn't leak dismissals across
 * sites. Pure UI state — no `persist` middleware by design.
 */

import { create } from 'zustand';

export interface SocialNodeDismissState {
  /** Dismissed opportunity ids, per project. */
  byProject: Record<string, string[]>;
  dismiss: (projectId: string, opportunityId: string) => void;
  restore: (projectId: string, opportunityId: string) => void;
  clear: (projectId: string) => void;
}

export const useSocialNodeDismissStore = create<SocialNodeDismissState>(
  (set) => ({
    byProject: {},
    dismiss: (projectId, opportunityId) =>
      set((s) => {
        const list = s.byProject[projectId] ?? [];
        if (list.includes(opportunityId)) return s;
        return {
          byProject: {
            ...s.byProject,
            [projectId]: [...list, opportunityId],
          },
        };
      }),
    restore: (projectId, opportunityId) =>
      set((s) => {
        const list = s.byProject[projectId] ?? [];
        if (!list.includes(opportunityId)) return s;
        return {
          byProject: {
            ...s.byProject,
            [projectId]: list.filter((id) => id !== opportunityId),
          },
        };
      }),
    clear: (projectId) =>
      set((s) => {
        if (!s.byProject[projectId]) return s;
        const next = { ...s.byProject };
        delete next[projectId];
        return { byProject: next };
      }),
  }),
);
