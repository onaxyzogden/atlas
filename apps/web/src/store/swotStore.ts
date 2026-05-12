/**
 * SWOT store â€” Scholar-aligned namespace consolidation
 * (plan few-concerns-shiny-quokka.md, ADR
 * 2026-04-30-site-annotations-store-scholar-aligned-namespaces.md).
 *
 * Keeps its own namespace: SWOT is strategic-reflection (not a permaculture
 * domain entity), reused by the OBSERVE journal and the ACT continuous lens.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';

export type SwotBucket = 'S' | 'W' | 'O' | 'T';

export interface SwotEntry {
  id: string;
  projectId: string;
  bucket: SwotBucket;
  title: string;
  body?: string;
  tags?: string[];
  /**
   * Optional [lng, lat] pin â€” present when the SWOT entry was tagged on the
   * OBSERVE map (Module 6). Legacy text-only entries omit this field.
   */
  position?: [number, number];
  createdAt: string;
}

interface SwotState {
  swot: SwotEntry[];

  addSwot: (e: SwotEntry) => void;
  updateSwot: (id: string, patch: Partial<SwotEntry>) => void;
  removeSwot: (id: string) => void;
}

export const useSwotStore = create<SwotState>()(
  persist(
    temporal((set) => ({
      swot: [],

      addSwot: (e) => set((s) => ({ swot: [...s.swot, e] })),
      updateSwot: (id, patch) =>
        set((s) => ({ swot: s.swot.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeSwot: (id) => set((s) => ({ swot: s.swot.filter((e) => e.id !== id) })),
    }), { limit: 200 }),
    { name: 'ogden-swot', version: 1, migrate: (persisted) => persisted as never },
  ),
);

useSwotStore.persist.rehydrate();
