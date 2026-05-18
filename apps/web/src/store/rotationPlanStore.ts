/**
 * rotationPlanStore — Sub-project B3, rotational-grazing sequencer.
 *
 * A net-new, additive persisted slice (A-series additive covenant: no
 * DB migration, no API endpoint). Deliberately a *separate* store with
 * its own persist key and `version: 1`, NO `temporal`, NO `migrate` —
 * mirrors the B2 `ogden-compost-cycle` precedent exactly so it sits
 * beside the existing slices at zero risk. The RotationCell/RotationPlan
 * types are owned by `rotationSequenceMath` (Task 1) and imported
 * type-only here.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  RotationCell,
  RotationPlan,
} from '../features/livestock/rotationSequenceMath.js';

interface RotationPlanState {
  byProject: Record<string, RotationPlan>;
  setPlan: (projectId: string, cells: RotationCell[]) => void;
  upsertCell: (projectId: string, cell: RotationCell) => void;
  removeCell: (projectId: string, paddockId: string) => void;
  clearPlan: (projectId: string) => void;
}

/** Sort by (cellGroup asc, sequenceOrder asc); returns a new array. */
function sortCells(cells: RotationCell[]): RotationCell[] {
  return [...cells].sort(
    (a, b) =>
      a.cellGroup.localeCompare(b.cellGroup) ||
      a.sequenceOrder - b.sequenceOrder,
  );
}

export function planFor(
  state: RotationPlanState,
  projectId: string,
): RotationPlan {
  return state.byProject[projectId] ?? { projectId, cells: [] };
}

export const useRotationPlanStore = create<RotationPlanState>()(
  persist(
    (set) => ({
      byProject: {},

      setPlan: (projectId, cells) =>
        set((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: { projectId, cells: sortCells(cells) },
          },
        })),

      upsertCell: (projectId, cell) =>
        set((s) => {
          const existing = planFor(s, projectId).cells.filter(
            (c) => c.paddockId !== cell.paddockId,
          );
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                projectId,
                cells: sortCells([...existing, cell]),
              },
            },
          };
        }),

      removeCell: (projectId, paddockId) =>
        set((s) => {
          const current = planFor(s, projectId);
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                projectId,
                cells: current.cells.filter(
                  (c) => c.paddockId !== paddockId,
                ),
              },
            },
          };
        }),

      clearPlan: (projectId) =>
        set((s) => {
          const next = { ...s.byProject };
          delete next[projectId];
          return { byProject: next };
        }),
    }),
    { name: 'ogden-rotation-plan', version: 1 },
  ),
);
