/**
 * Nursery store — propagation inventory, stock transfers, seed saving.
 *
 * Tracks plant stock by species, propagation method, quantity, and growth stage.
 * Zustand with localStorage persistence, same pattern as livestockStore.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

export interface StockTransfer {
  id: string;
  projectId: string;
  batchId: string;
  quantity: number;
  destinationZoneId: string;
  transferDate: string;
  notes: string;
}

interface NurseryState {
  batches: PropagationBatch[];
  transfers: StockTransfer[];

  addBatch: (batch: PropagationBatch) => void;
  updateBatch: (id: string, updates: Partial<PropagationBatch>) => void;
  deleteBatch: (id: string) => void;

  addTransfer: (transfer: StockTransfer) => void;
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

      addTransfer: (transfer) =>
        set((s) => ({ transfers: [...s.transfers, transfer] })),

      deleteTransfer: (id) =>
        set((s) => ({ transfers: s.transfers.filter((t) => t.id !== id) })),
    }),
    { name: 'ogden-nursery', version: 1 },
  ),
);

useNurseryStore.persist.rehydrate();
