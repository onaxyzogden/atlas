/**
 * olosCatalogStore — fetched-once cache for the universal OLOS catalogue
 * (15 overlays + 48 objectives + ~237 checklist items + objective×overlay
 * pairs). Hits GET /api/v1/olos/catalogue on first access.
 *
 * The catalogue is also available as TypeScript constants in
 * @ogden/shared/constants/olos — those are the source of truth at build
 * time. This store mirrors them at runtime so the frontend can survive
 * a constants drift between deployed shared-package and live API.
 *
 * Phase 2.4. Not persisted — re-fetched on every boot (cheap, single round
 * trip, no project context).
 */

import { create } from 'zustand';
import type {
  Overlay,
  Objective,
  ChecklistItem,
} from '@ogden/shared';
import { api } from '../../lib/apiClient.js';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface OLOSCatalogState {
  status: LoadStatus;
  error: string | null;
  overlays: Overlay[];
  objectives: Objective[];
  checklistItems: ChecklistItem[];
  objectiveOverlays: Array<{ objectiveId: string; overlayId: string }>;

  /** Hits the bundled /olos/catalogue endpoint. Returns when ready or rejects. */
  load: () => Promise<void>;
  /** Resets to idle. Used by tests or after a hard refresh. */
  reset: () => void;
}

export const useOLOSCatalogStore = create<OLOSCatalogState>((set, get) => ({
  status: 'idle',
  error: null,
  overlays: [],
  objectives: [],
  checklistItems: [],
  objectiveOverlays: [],

  load: async () => {
    const s = get();
    if (s.status === 'ready' || s.status === 'loading') return;
    set({ status: 'loading', error: null });
    try {
      const envelope = await api.olos.catalogue();
      if (envelope.error) {
        set({
          status: 'error',
          error: envelope.error.message ?? 'Failed to load OLOS catalogue',
        });
        return;
      }
      const data = envelope.data;
      set({
        status: 'ready',
        error: null,
        overlays: data?.overlays ?? [],
        objectives: data?.objectives ?? [],
        checklistItems: data?.checklistItems ?? [],
        objectiveOverlays: data?.objectiveOverlays ?? [],
      });
    } catch (err) {
      set({
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  reset: () =>
    set({
      status: 'idle',
      error: null,
      overlays: [],
      objectives: [],
      checklistItems: [],
      objectiveOverlays: [],
    }),
}));
