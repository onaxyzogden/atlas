/**
 * Harvest log store — ACT-stage Module 4 (Yield Tracking).
 *
 * "Obtain a yield" is one of Holmgren's twelve principles. This store
 * captures actual harvests (food / medicine / fuel / fibre / livestock
 * yield) over time. Two source kinds:
 *   - 'crop'      — entry tied to a `cropStore.CropArea.id`
 *   - 'livestock' — entry tied to a `livestockStore.Paddock.id`
 *
 * The `HarvestLogCard` slide-up renders crop-source entries grouped by
 * crop area; livestock-source entries surface on the map (ActDataLayers)
 * and will get their own card in a follow-up session.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';

export type HarvestUnit = 'kg' | 'lb' | 'count' | 'L';
export type HarvestQuality = 'A' | 'B' | 'C';
export type HarvestSourceKind = 'crop' | 'livestock' | 'structure';

export interface HarvestEntry {
  id: string;
  projectId: string;
  /** Discriminator — drives which id field is meaningful and where the
   *  entry's marker is anchored on the map. */
  sourceKind: HarvestSourceKind;
  /** `cropStore.CropArea.id` when `sourceKind === 'crop'`; empty string
   *  otherwise. Kept as a non-optional string so the legacy
   *  `HarvestLogCard` grouping (which keys by cropAreaId) keeps working
   *  unchanged. */
  cropAreaId: string;
  /** `livestockStore.Paddock.id` when `sourceKind === 'livestock'`. */
  paddockId?: string;
  /** `structureStore.Structure.id` when `sourceKind === 'structure'`
   *  (e.g. greenhouse harvest logged from the Act-stage inspector). */
  structureId?: string;
  /** ISO date of harvest. */
  date: string;
  quantity: number;
  unit: HarvestUnit;
  /** Optional grade for sortable, market-bound yields. */
  quality?: HarvestQuality;
  notes?: string;
  /**
   * D0 spine link — the `WorkItem` this harvest proves complete (execution
   * history / proof-of-completion). Additive optional → no version bump
   * (legacy entries load with it absent). D4 surfaces the proof; D0 only
   * stores the edge.
   */
  workItemId?: string;
}

interface HarvestLogState {
  entries: HarvestEntry[];
  addEntry: (e: HarvestEntry) => void;
  updateEntry: (id: string, patch: Partial<HarvestEntry>) => void;
  removeEntry: (id: string) => void;
}

export const useHarvestLogStore = create<HarvestLogState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (e) => set((s) => ({ entries: [...s.entries, e] })),
      updateEntry: (id, patch) =>
        set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    }),
    {
      name: 'ogden-act-harvest-log',
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      version: 2,
      migrate: (persisted: unknown, fromVersion: number) => {
        // v1 → v2: stamp legacy entries with sourceKind: 'crop' (the only
        // shape v1 supported).
        if (fromVersion < 2 && persisted && typeof persisted === 'object') {
          const s = persisted as { entries?: Array<Partial<HarvestEntry>> };
          if (Array.isArray(s.entries)) {
            s.entries = s.entries.map((e) => ({
              ...e,
              sourceKind: e.sourceKind ?? 'crop',
            }));
          }
          return s as HarvestLogState;
        }
        return persisted as HarvestLogState;
      },
    },
  ),
);

rehydrateWithLogging(useHarvestLogStore);
