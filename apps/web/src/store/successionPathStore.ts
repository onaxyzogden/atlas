/**
 * successionPathStore — Sub-project B1, Year0→Year30 succession-path designer.
 *
 * A net-new, additive persisted slice (A-series additive covenant: no DB
 * migration, no API endpoint). Deliberately a *separate* store with its own
 * persist key and `version: 1`, no `temporal`, no `migrate` — zero risk to
 * the `ogden-polyculture` v3 slice it sits beside. The existing read-only
 * CanopySuccessionCard simulator is untouched and remains the projection;
 * this is the editable design model.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';

export type SuccessionAction = 'plant' | 'thin' | 'remove';

export interface SuccessionPlanting {
  speciesId: string;
  action: SuccessionAction;
  guildId?: string;
}

export interface SuccessionMilestone {
  /** Years from establishment, 0..30. */
  year: number;
  plantings: SuccessionPlanting[];
  note?: string;
}

export interface SuccessionPath {
  projectId: string;
  milestones: SuccessionMilestone[];
}

interface SuccessionPathState {
  byProject: Record<string, SuccessionPath>;
  setMilestones: (projectId: string, milestones: SuccessionMilestone[]) => void;
  upsertMilestone: (projectId: string, milestone: SuccessionMilestone) => void;
  removeMilestone: (projectId: string, year: number) => void;
  clearPath: (projectId: string) => void;
}

function pathFor(
  state: SuccessionPathState,
  projectId: string,
): SuccessionPath {
  return state.byProject[projectId] ?? { projectId, milestones: [] };
}

export const useSuccessionPathStore = create<SuccessionPathState>()(
  persist(
    (set) => ({
      byProject: {},

      setMilestones: (projectId, milestones) =>
        set((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: { projectId, milestones },
          },
        })),

      upsertMilestone: (projectId, milestone) =>
        set((s) => {
          const path = pathFor(s, projectId);
          const rest = path.milestones.filter(
            (m) => m.year !== milestone.year,
          );
          const milestones = [...rest, milestone].sort(
            (a, b) => a.year - b.year,
          );
          return {
            byProject: {
              ...s.byProject,
              [projectId]: { projectId, milestones },
            },
          };
        }),

      removeMilestone: (projectId, year) =>
        set((s) => {
          const path = pathFor(s, projectId);
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                projectId,
                milestones: path.milestones.filter((m) => m.year !== year),
              },
            },
          };
        }),

      clearPath: (projectId) =>
        set((s) => {
          const next = { ...s.byProject };
          delete next[projectId];
          return { byProject: next };
        }),
    }),
    { name: 'ogden-succession-path', storage: idbPersistStorage, version: 1 },
  ),
);
