/**
 * Principle-check store — PLAN-stage Module 8.
 *
 * Tracks the steward's running self-assessment against Holmgren's twelve
 * permaculture-design principles. Each (project × principle) pair carries
 * a justification narrative, a list of linked feature ids drawn from the
 * other PLAN/OBSERVE stores (zones, paths, structures, transects, guilds,
 * earthworks, etc.), and a status pill.
 *
 * Selector discipline: subscribers should read `state.byProject` and
 * `useMemo` their per-project slice (the standard subscribe-then-derive
 * pattern from `wiki/decisions/2026-04-26-zustand-selector-stability.md`).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PrincipleStatus = 'unmet' | 'partial' | 'met';

export interface PrincipleCheck {
  /** plantDatabase / holmgrenPrinciples principleId. */
  principleId: string;
  justification: string;
  linkedFeatureIds: string[];
  status: PrincipleStatus;
  updatedAt: string;
}

/** principleId → check, keyed inside one project. */
export type ProjectPrincipleChecks = Record<string, PrincipleCheck>;

interface PrincipleCheckState {
  /** projectId → principleId → check. */
  byProject: Record<string, ProjectPrincipleChecks>;
  upsertCheck: (projectId: string, check: PrincipleCheck) => void;
  removeCheck: (projectId: string, principleId: string) => void;
}

export const usePrincipleCheckStore = create<PrincipleCheckState>()(
  persist(
    (set) => ({
      byProject: {},
      upsertCheck: (projectId, check) =>
        set((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: {
              ...(s.byProject[projectId] ?? {}),
              [check.principleId]: check,
            },
          },
        })),
      removeCheck: (projectId, principleId) =>
        set((s) => {
          const project = s.byProject[projectId];
          if (!project) return s;
          const next = { ...project };
          delete next[principleId];
          return { byProject: { ...s.byProject, [projectId]: next } };
        }),
    }),
    { name: 'ogden-principle-checks', version: 1 },
  ),
);

usePrincipleCheckStore.persist.rehydrate();
