/**
 * Nursery store — propagation inventory, stock transfers, seed saving.
 *
 * Tracks plant stock by species, propagation method, quantity, and growth stage.
 * Zustand with localStorage persistence, same pattern as livestockStore.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';

export type PropagationMethod = 'seed' | 'cutting' | 'division' | 'graft';
export type GrowthStage = 'seed' | 'germinating' | 'seedling' | 'juvenile' | 'ready_to_plant';

export interface PropagationBatch {
  id: string;
  projectId: string;
  species: string;
  method: PropagationMethod;
  quantity: number;
  stage: GrowthStage;
  sowDate: string;
  expectedReadyDate: string;
  destinationZoneId: string | null;
  seedSaving: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
  /**
   * Annual planting calendar provenance — composite id
   * `<species>:<cropAreaId>:<year>`. Replaced wholesale on regenerate.
   */
  generatedFromPlantingCalendar?: string;
}

export interface StockTransfer {
  id: string;
  projectId: string;
  batchId: string;
  quantity: number;
  destinationZoneId: string;
  transferDate: string;
  notes: string;
  /**
   * D0 spine link — the `WorkItem` this executed transfer proves complete
   * (the *batch* becomes a WorkItem; this transfer is its proof-of-
   * completion record). Additive optional → no version bump.
   */
  workItemId?: string;
}

interface NurseryState {
  batches: PropagationBatch[];
  transfers: StockTransfer[];

  addBatch: (batch: PropagationBatch) => void;
  updateBatch: (id: string, updates: Partial<PropagationBatch>) => void;
  deleteBatch: (id: string) => void;
  /**
   * Annual planting calendar — replace all batches stamped with
   * `generatedFromPlantingCalendar` for this project. User-authored
   * batches are untouched.
   */
  replacePlantingCalendarBatches: (
    projectId: string,
    newBatches: PropagationBatch[],
  ) => void;

  addTransfer: (transfer: StockTransfer) => void;
  /**
   * D4 spine link — patch a transfer in place (used by the field-proof
   * orchestrator to stamp `workItemId` on a confirmed typed match).
   * Additive, mirrors `maintenanceLogStore.updateEvent`.
   */
  updateTransfer: (id: string, patch: Partial<StockTransfer>) => void;
  deleteTransfer: (id: string) => void;
}

export const useNurseryStore = create<NurseryState>()(
  persist(
    (set) => ({
      batches: [],
      transfers: [],

      addBatch: (batch) =>
        set((s) => ({ batches: [...s.batches, batch] })),

      updateBatch: (id, updates) =>
        set((s) => ({
          batches: s.batches.map((b) =>
            b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b,
          ),
        })),

      deleteBatch: (id) =>
        set((s) => ({ batches: s.batches.filter((b) => b.id !== id) })),

      replacePlantingCalendarBatches: (projectId, newBatches) =>
        set((s) => {
          const remaining = s.batches.filter(
            (b) => b.projectId !== projectId || !b.generatedFromPlantingCalendar,
          );
          return { batches: [...remaining, ...newBatches] };
        }),

      addTransfer: (transfer) =>
        set((s) => ({ transfers: [...s.transfers, transfer] })),

      updateTransfer: (id, patch) =>
        set((s) => ({
          transfers: s.transfers.map((t) =>
            t.id === id ? { ...t, ...patch } : t,
          ),
        })),

      deleteTransfer: (id) =>
        set((s) => ({ transfers: s.transfers.filter((t) => t.id !== id) })),
    }),
    { name: 'ogden-nursery', version: 1, migrate: (persisted) => persisted as never },
  ),
);

rehydrateWithLogging(useNurseryStore);
