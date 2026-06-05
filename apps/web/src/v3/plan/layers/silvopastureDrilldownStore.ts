/**
 * silvopastureDrilldownStore — cross-component bus for Slice M's
 * "Open full audit →" routing from the host-union drilldown card to
 * the silvopasture-integration plan card (rendered inside
 * PlanModuleSlideUp).
 *
 * Two pieces of state:
 *
 *   1. `targetHostId`  — read by `SilvopastureIntegrationCard` to
 *      scroll-and-highlight the matching host row.
 *
 *   2. `pendingOpenModule` — set by the drilldown card; consumed by
 *      `PlanLayout` to navigate to a plan module + open the slide-up.
 *      Cleared after consumption so it does not refire on re-mount.
 *
 * The store deliberately avoids importing the `PlanModule` type to
 * keep this layer-level module independent of the higher-level plan
 * registry; the consumer (`PlanLayout`) validates the module string
 * against `isPlanModule` before navigating.
 *
 * Sliced fresh in 2026-05-30 as part of the B4 host-canopy-union
 * tooltip drilldown work (Slice M of the remaining-deferrals
 * roadmap). See
 * `wiki/decisions/2026-05-30-atlas-b4-tooltip-drilldown.md` for the
 * routing-design rationale (why a store and not URL params or prop
 * drilling).
 */

import { create } from 'zustand';

interface SilvopastureDrilldownState {
  /** Target host id used by SilvopastureIntegrationCard to scroll +
   *  highlight a specific row. Cleared on slide-up close. */
  targetHostId: string | null;
  /** Pending plan-module slide-up request. `PlanLayout` subscribes,
   *  navigates + opens the slide-up, then calls `consumePendingOpen`. */
  pendingOpenModule:
    | { module: string; sectionId: string; targetHostId: string }
    | null;
  /** Set when the drilldown card's "Open full audit →" is clicked. */
  requestOpenAudit: (
    hostId: string,
    moduleHint?: string,
    sectionId?: string,
  ) => void;
  /** Read-and-clear the pending request (used by PlanLayout). */
  consumePendingOpen: () =>
    | { module: string; sectionId: string; targetHostId: string }
    | null;
  /** Clear targetHostId — called when the slide-up closes. */
  clearTarget: () => void;
}

export const useSilvopastureDrilldownStore =
  create<SilvopastureDrilldownState>((set, get) => ({
    targetHostId: null,
    pendingOpenModule: null,
    requestOpenAudit: (
      hostId,
      moduleHint = 'livestock',
      sectionId = 'plan-silvopasture-integration',
    ) => {
      set({
        targetHostId: hostId,
        pendingOpenModule: {
          module: moduleHint,
          sectionId,
          targetHostId: hostId,
        },
      });
    },
    consumePendingOpen: () => {
      const p = get().pendingOpenModule;
      if (p) set({ pendingOpenModule: null });
      return p;
    },
    clearTarget: () => set({ targetHostId: null }),
  }));
