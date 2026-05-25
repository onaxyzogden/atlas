/**
 * stageGateOverrideStore — per-project "continue anyway" escape hatch for the
 * soft Observe→Plan gate.
 *
 * The Plan stage shows a soft overlay when Observe's required objectives are
 * incomplete (see `StageGateOverlay`). Navigation is never hard-blocked; this
 * store records that the steward chose to proceed to Plan despite the
 * incomplete Observe stage, so the overlay stays dismissed for that project.
 *
 * Data is local-only; pattern mirrors homesteadStore.ts / observeHowChecksStore.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Which stage transition the override applies to. The store is generic over
 *  the gate key, so both soft gates share one persisted record. */
export type StageGate = 'observe-to-plan' | 'plan-to-act' | 'act-to-report';

export interface StageGateOverrideState {
  /** byProject[projectId][gate] === true → overlay dismissed for that gate. */
  byProject: Record<string, Partial<Record<StageGate, boolean>>>;
  isOverridden: (projectId: string, gate: StageGate) => boolean;
  setOverride: (projectId: string, gate: StageGate, value: boolean) => void;
}

export const useStageGateOverrideStore = create<StageGateOverrideState>()(
  persist(
    (set, get) => ({
      byProject: {},
      isOverridden: (projectId, gate) =>
        get().byProject[projectId]?.[gate] === true,
      setOverride: (projectId, gate, value) =>
        set((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: { ...s.byProject[projectId], [gate]: value },
          },
        })),
    }),
    {
      name: 'ogden-atlas-stage-gate-override',
      version: 1,
      migrate: (persisted) => persisted as StageGateOverrideState,
    },
  ),
);
