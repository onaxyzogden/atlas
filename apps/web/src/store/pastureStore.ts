/**
 * Pasture store — OBSERVE-stage land-cover annotation of pre-existing
 * grazed / fenced land on a property. Sibling to ecologyStore.ecologyZones;
 * intentionally lean (kind + label + notes) so it stays an observation
 * rather than a design entity. Plan owns designed paddocks via
 * `useLivestockStore.paddocks` (Yeomans rank 9, Holmgren P3 — see
 * 2026-05-08-atlas-plan-module4-livestock.md).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';

export type PastureKind = 'open-pasture' | 'paddock' | 'hayfield';

export interface Pasture {
  id: string;
  projectId: string;
  geometry: GeoJSON.Polygon;
  kind: PastureKind;
  label?: string;
  notes?: string;
  createdAt: string;
}

interface PastureState {
  pastures: Pasture[];
  addPasture: (p: Pasture) => void;
  updatePasture: (id: string, patch: Partial<Pasture>) => void;
  removePasture: (id: string) => void;
}

export const usePastureStore = create<PastureState>()(
  persist(
    temporal((set) => ({
      pastures: [],
      addPasture: (p) => set((s) => ({ pastures: [...s.pastures, p] })),
      updatePasture: (id, patch) =>
        set((s) => ({
          pastures: s.pastures.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      removePasture: (id) =>
        set((s) => ({ pastures: s.pastures.filter((p) => p.id !== id) })),
    }), { limit: 200 }),
    { name: 'ogden-pastures', version: 1 },
  ),
);

usePastureStore.persist.rehydrate();
