/**
 * Enterprise store — project-scoped enterprise tags for Multi-Enterprise
 * permaculture sites (PLAN spec §15 / project-type "Multi-Enterprise"
 * checklist items #1, #2, #6).
 *
 * Enterprises are operational sub-businesses inside a single parcel —
 * e.g. "Market garden", "Sheep dairy", "Retreat lodging", "Education".
 * Every placeable Plan feature (zone, path, structure, paddock, crop,
 * guild, fertility unit, water node) can be tagged with one enterprise
 * via an optional `enterprise?: string` field on its row. The lens in
 * `layeringLensStore` can recolor the whole map by enterprise instead
 * of by Yeomans rank, letting the steward see which slices of the site
 * carry which business.
 *
 * Single-flat-table; no temporal stack (the list rarely changes).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Enterprise {
  id: string;
  projectId: string;
  name: string;
  /** Hex colour used by the enterprise lens recolor. */
  color: string;
  notes?: string;
  createdAt: string;
}

interface EnterpriseState {
  enterprises: Enterprise[];

  addEnterprise: (e: Enterprise) => void;
  updateEnterprise: (id: string, patch: Partial<Enterprise>) => void;
  removeEnterprise: (id: string) => void;
}

export const useEnterpriseStore = create<EnterpriseState>()(
  persist(
    (set) => ({
      enterprises: [],

      addEnterprise: (e) =>
        set((s) => ({ enterprises: [...s.enterprises, e] })),

      updateEnterprise: (id, patch) =>
        set((s) => ({
          enterprises: s.enterprises.map((e) =>
            e.id === id ? { ...e, ...patch } : e,
          ),
        })),

      removeEnterprise: (id) =>
        set((s) => ({ enterprises: s.enterprises.filter((e) => e.id !== id) })),
    }),
    { name: 'ogden-enterprises', version: 1 },
  ),
);

useEnterpriseStore.persist.rehydrate();
