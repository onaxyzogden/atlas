/**
 * planRevisionDismissalStore — per-project dismissal cursor that powers
 * the OLOS Plan Revision Banner (Dashboard Spec §4.2 — "Dismissable;
 * dismissal persists until next observation event").
 *
 * The banner is intentionally low-friction: a steward who has acted on
 * the impacted objectives clicks dismiss, and the banner stays hidden
 * until a NEW Observe event arrives that's newer than the dismissal
 * timestamp. The hook reading this store therefore filters its event
 * window by `event.occurredAt > lastDismissedAt` — same shape Phase 3
 * uses for the cyclical-review window.
 *
 * Per-project — not per-objective, not per-priority. Dismissing the
 * banner dismisses ALL current revision events; the next observation
 * resets the cursor. This matches the spec's intent: the banner is a
 * single-channel summary, not a per-domain ledger.
 *
 * Persistence: Zustand `persist` middleware, key
 * `ogden-plan-revision-dismissals`. Registered as `versioned-blob`
 * `byProject` in `syncManifest.ts`. Rehydration logged via
 * `rehydrateWithLogging`.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';

const PERSIST_KEY = 'ogden-plan-revision-dismissals';

type ByProject = Record<string, string>;

interface PlanRevisionDismissalState {
  byProject: ByProject;

  /** ISO timestamp of the most recent dismissal for the given project,
   *  or null when the banner has never been dismissed. */
  getLastDismissedAt: (projectId: string) => string | null;

  /** Stamp the dismissal cursor at the current wall-clock time. */
  dismiss: (projectId: string) => void;

  /** Clear the dismissal cursor (used by tests and the
   *  "Restore banner" affordance in the dev tools). */
  reset: (projectId: string) => void;
}

export const usePlanRevisionDismissalStore =
  create<PlanRevisionDismissalState>()(
    persist(
      (set, get) => ({
        byProject: {},

        getLastDismissedAt: (projectId) =>
          get().byProject[projectId] ?? null,

        dismiss: (projectId) =>
          set((s) => ({
            byProject: {
              ...s.byProject,
              [projectId]: new Date().toISOString(),
            },
          })),

        reset: (projectId) =>
          set((s) => {
            if (!(projectId in s.byProject)) return s;
            const { [projectId]: _dropped, ...rest } = s.byProject;
            return { byProject: rest };
          }),
      }),
      {
        name: PERSIST_KEY,
        // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
        storage: idbPersistStorage,
        version: 1,
        partialize: (state) => ({ byProject: state.byProject }),
      },
    ),
  );

rehydrateWithLogging(usePlanRevisionDismissalStore);
