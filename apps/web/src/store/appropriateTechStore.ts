/**
 * Appropriate-tech store — ACT-stage Module 6 (Disaster Preparedness).
 *
 * Backup-systems registry: gravity water, solar generators, woodstoves,
 * radios, root cellars. Status moves planned → installed → tested (or
 * `failed` if the test reveals the system can't carry load). The
 * `AppropriateTechLogCard` groups items by `system` so the steward sees
 * resilience coverage at a glance per resource axis.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppropriateTechSystem =
  | 'water'
  | 'power'
  | 'heat'
  | 'comms'
  | 'food_storage';

export type AppropriateTechStatus = 'planned' | 'installed' | 'tested' | 'failed';

export interface AppropriateTechItem {
  id: string;
  projectId: string;
  system: AppropriateTechSystem;
  title: string;
  description: string;
  status: AppropriateTechStatus;
}

interface AppropriateTechState {
  items: AppropriateTechItem[];
  addItem: (i: AppropriateTechItem) => void;
  updateItem: (id: string, patch: Partial<AppropriateTechItem>) => void;
  removeItem: (id: string) => void;
}

export const useAppropriateTechStore = create<AppropriateTechState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (i) => set((s) => ({ items: [...s.items, i] })),
      updateItem: (id, patch) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
    }),
    { name: 'ogden-act-appropriate-tech', version: 1 },
  ),
);

useAppropriateTechStore.persist.rehydrate();
