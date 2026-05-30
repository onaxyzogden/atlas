// planTensionBannerStore — persists the collapsed/expanded preference of the
// Plan design-tension banner, per project (Plan Navigation Spec v1.1 §8).
//
// Kept separate from the resolved tension DATA (which is derived on the fly by
// useProjectObjectives, never persisted) and from planStratumStore (checklist
// completion): this is a pure UI-preference axis. Default is collapsed so the
// banner stays unobtrusive until the steward opens it — or until it transiently
// auto-expands at the stratum where a tension resolves (that transient state is
// local to ObjectiveColumn and intentionally NOT persisted here).
//
// projectId keys are opaque; there are no objective-id keys to renumber, so no
// migrate is needed (unlike cyclicalReviewStore). Starts at version 1.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';

const PERSIST_KEY = 'ogden-plan-tension-banner';

interface PlanTensionBannerState {
  collapsedByProject: Record<string, boolean>;

  /** Collapsed preference for a project. Defaults to true (collapsed) when the
   *  project has no stored preference yet. */
  isCollapsed: (projectId: string) => boolean;

  /** Persist an explicit collapsed/expanded preference for a project. */
  setCollapsed: (projectId: string, collapsed: boolean) => void;
}

export const usePlanTensionBannerStore = create<PlanTensionBannerState>()(
  persist(
    (set, get) => ({
      collapsedByProject: {},

      isCollapsed: (projectId) => get().collapsedByProject[projectId] ?? true,

      setCollapsed: (projectId, collapsed) =>
        set((s) => ({
          collapsedByProject: {
            ...s.collapsedByProject,
            [projectId]: collapsed,
          },
        })),
    }),
    {
      name: PERSIST_KEY,
      version: 1,
      partialize: (state) => ({ collapsedByProject: state.collapsedByProject }),
    },
  ),
);

rehydrateWithLogging(usePlanTensionBannerStore);
