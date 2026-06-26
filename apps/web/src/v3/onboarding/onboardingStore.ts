/**
 * onboardingStore -- dedicated persist store for the offline-demo onboarding
 * tour. Modelled on uiStore (global, device-local UI state in localStorage),
 * deliberately NOT on the project-synced IndexedDB stores: a tour's
 * "have I seen this yet" flag is per-browser chrome, never project data.
 *
 * Why its own store and not a uiStore key: uiStore carries a v4 migration
 * idempotency contract pinned by uiStoreMigrate.test.ts; adding keys there is
 * fragile. A fresh store with version 1 / no migrate is cleaner and isolated.
 *
 * Persistence is split deliberately:
 *  - PERSISTED (partialize): `hasSeenWelcome`, `tourCompleted` -- the only two
 *    facts that must survive a reload (so the welcome auto-opens exactly once
 *    per browser, and we can show a subtle "completed" state if ever wanted).
 *  - RUNTIME ONLY: `status`, `currentStepIndex` -- a tour never resumes
 *    mid-walk across reloads; it either auto-opens fresh or waits for replay.
 *
 * The persist key `ogden-onboarding` is registered in DEVICE_GLOBAL in
 * syncManifest.ts -- the syncManifest coverage guard fails the build if any
 * `ogden-` persist key is left unclassified.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from '../../store/persistRehydrate.js';
import { TOUR_STEPS } from './onboardingSteps.js';

/**
 * `idle`    -- nothing shown.
 * `running` -- the tour is active; currentStepIndex points into TOUR_STEPS
 *              (the welcome and finish steps are modal entries in that list).
 */
export type TourStatus = 'idle' | 'running';

interface OnboardingState {
  // Persisted
  hasSeenWelcome: boolean;
  tourCompleted: boolean;
  // Runtime only
  status: TourStatus;
  currentStepIndex: number;

  /**
   * First-run auto-open: start the tour at step 0 (the welcome modal) AND mark
   * the welcome as seen, so it never auto-opens again even if the visitor bails
   * out mid-walk. Idempotent-friendly: callers gate on `!hasSeenWelcome`.
   */
  beginAuto: () => void;
  /** Replay from the "Take the tour" affordance -- restart without touching the seen/completed flags. */
  replay: () => void;
  /** Advance one step, clamped to the last step. */
  next: () => void;
  /** Step back one, clamped to the first step. */
  back: () => void;
  /** Close without completing (Skip / Esc / backdrop). Leaves flags as-is. */
  close: () => void;
  /** Reached the finish modal's primary action: mark completed and close. */
  finish: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenWelcome: false,
      tourCompleted: false,
      status: 'idle',
      currentStepIndex: 0,

      beginAuto: () =>
        set({ status: 'running', currentStepIndex: 0, hasSeenWelcome: true }),

      replay: () => set({ status: 'running', currentStepIndex: 0 }),

      next: () =>
        set((s) => ({
          currentStepIndex: Math.min(s.currentStepIndex + 1, TOUR_STEPS.length - 1),
        })),

      back: () =>
        set((s) => ({ currentStepIndex: Math.max(s.currentStepIndex - 1, 0) })),

      close: () => set({ status: 'idle' }),

      finish: () => set({ status: 'idle', tourCompleted: true }),
    }),
    {
      name: 'ogden-onboarding',
      version: 1,
      // Persist ONLY the two cross-reload facts; status/currentStepIndex are
      // runtime and must reset to idle/0 on every load.
      partialize: (state) => ({
        hasSeenWelcome: state.hasSeenWelcome,
        tourCompleted: state.tourCompleted,
      }),
    },
  ),
);

// Hydrate from localStorage (Zustand v5). Guarded for SSR / vitest.
if (typeof window !== 'undefined') {
  rehydrateWithLogging(useOnboardingStore);
}
