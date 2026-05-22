/**
 * Compost-inventory store â€” PLAN-stage Module 5 (Soil Fertility), Greens & Browns tab.
 *
 * Persists per-project Greens/Browns feedstock volumes the steward
 * inventoried in `SoilResourcesCard`. Holmgren P6 (*Produce No Waste*)
 * starts with knowing what waste streams the site already generates;
 * this store is the persistent ledger of that inventory so the C:N
 * verdict in the card survives a page reload.
 *
 * Schema is deliberately minimal: a `Record<feedstockId, volumeM3>` per
 * project. The card owns the static feedstock catalog (id â†’ name, C:N
 * ratio, notes). The store only persists volumes â€” if the card later
 * adds or removes feedstock entries from its catalog, persisted volumes
 * for unknown ids are quietly ignored at read time.
 *
 * Selector discipline: subscribers should read `state.byProject` and
 * `useMemo` their per-project slice (the standard subscribe-then-derive
 * pattern from `wiki/decisions/2026-04-26-zustand-selector-stability.md`).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';

/** Volumes in cubic metres, keyed by the card's feedstock id. */
export type FeedstockVolumes = Record<string, number>;

interface CompostInventoryState {
  /** projectId â†’ { feedstockId â†’ mÂ³ }. */
  byProject: Record<string, FeedstockVolumes>;
  /** Set the volume of a single feedstock for a project. Volumes â‰¤ 0 remove the key. */
  setVolume: (projectId: string, feedstockId: string, volumeM3: number) => void;
  /** Replace the entire inventory for a project (used by the card on bulk edit). */
  replaceInventory: (projectId: string, inventory: FeedstockVolumes) => void;
  /** Remove all feedstocks for a project. */
  clearProject: (projectId: string) => void;
}

export const useCompostInventoryStore = create<CompostInventoryState>()(
  persist(
    (set) => ({
      byProject: {},
      setVolume: (projectId, feedstockId, volumeM3) =>
        set((s) => {
          const cur = { ...(s.byProject[projectId] ?? {}) };
          if (volumeM3 > 0) {
            cur[feedstockId] = volumeM3;
          } else {
            delete cur[feedstockId];
          }
          return { byProject: { ...s.byProject, [projectId]: cur } };
        }),
      replaceInventory: (projectId, inventory) =>
        set((s) => {
          // Filter out 0 / negative volumes on the way in.
          const cleaned: FeedstockVolumes = {};
          for (const [id, v] of Object.entries(inventory)) {
            if (v > 0) cleaned[id] = v;
          }
          return { byProject: { ...s.byProject, [projectId]: cleaned } };
        }),
      clearProject: (projectId) =>
        set((s) => {
          const next = { ...s.byProject };
          delete next[projectId];
          return { byProject: next };
        }),
    }),
    { name: 'ogden-compost-inventory', version: 1, migrate: (persisted) => persisted as never },
  ),
);

rehydrateWithLogging(useCompostInventoryStore);
