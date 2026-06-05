/**
 * Maintenance log store — ACT-stage Module 2 (Maintenance & Operations).
 *
 * Where `maintenanceStore` describes the *schedule* (recurring tasks the
 * land needs), this store records the *events* (what was actually done,
 * when, and to which feature). Pair: schedule says "swales clear quarterly";
 * log records "swale at zone-2 cleared 2026-05-08, 25 min."
 *
 * Source kinds, in priority order on the map:
 *   - 'earthwork' — `waterSystemsStore.earthworks.id` (swale / diversion / french drain)
 *   - 'storage'   — `waterSystemsStore.storageInfra.id` (cistern / pond / rain garden)
 *
 * Other irrigation-related features (watercourses, water nodes without
 * geometry) are out of scope for the pilot.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';

export type MaintenanceSourceKind = 'earthwork' | 'storage' | 'structure';

export type MaintenanceAction =
  | 'inspect'
  | 'clear'
  | 'repair'
  | 'replace'
  | 'flush';

export interface MaintenanceEvent {
  id: string;
  projectId: string;
  sourceKind: MaintenanceSourceKind;
  /** Source feature id — interpreted per `sourceKind`. */
  sourceId: string;
  date: string;
  action: MaintenanceAction;
  /** Optional minutes-spent for back-of-envelope effort tracking. */
  durationMin?: number;
  /** Optional steward / contractor name. */
  who?: string;
  notes?: string;
  /**
   * D0 spine link — the recurring-maintenance `WorkItem` this event
   * completes. Additive optional → no version bump.
   */
  workItemId?: string;
}

interface MaintenanceLogState {
  events: MaintenanceEvent[];
  addEvent: (e: MaintenanceEvent) => void;
  updateEvent: (id: string, patch: Partial<MaintenanceEvent>) => void;
  removeEvent: (id: string) => void;
}

export const useMaintenanceLogStore = create<MaintenanceLogState>()(
  persist(
    (set) => ({
      events: [],
      addEvent: (e) => set((s) => ({ events: [...s.events, e] })),
      updateEvent: (id, patch) =>
        set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
    }),
    {
      name: 'ogden-act-maintenance-log',
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      version: 2,
      // No-op migrate so legacy v1 state hydrates silently. Bumps
      // have been additive — undefined slots fall through to []/{}.
      migrate: (persisted) => persisted as MaintenanceLogState,
    },
  ),
);

rehydrateWithLogging(useMaintenanceLogStore);
