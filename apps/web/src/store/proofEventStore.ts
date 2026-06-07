/**
 * proofEventStore — net-new generic field-proof ledger on the WorkItem
 * spine (Sub-project D4).
 *
 * Holds the generic fallback `ProofEvent` rows (used when
 * `routeProofTarget` returns 'generic'). Typed proofs instead live on the
 * existing D0 domain-event stores via their optional `workItemId`. Plain
 * projectId-tagged CRUD, mirroring `ogden-work-item-actuals` /
 * `ogden-work-items`. Client-first, no DB migration. Registered in
 * `syncManifest` as `projectId-tagged`.
 *
 * Steward/field-authored only — Goal Compass never authors field proof, so
 * there is NO generated-vs-overridden preservation contract.
 *
 * Orphans by design: if a WorkItem is deleted its proof row remains until
 * the steward removes it explicitly — the audit history stays intact, no
 * cascade-delete (mirrors the D3 actuals discipline).
 *
 * Covenant (D4, binding): strictly operational field-execution proof. No
 * cost / financing / capital / investor / yield-as-return semantics — those
 * stay in Scholar-gated Sub-project C.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import type { ProofEvent } from '@ogden/shared';

interface ProofEventState {
  events: ProofEvent[];
  addProofEvent: (e: ProofEvent) => void;
  updateProofEvent: (id: string, patch: Partial<ProofEvent>) => void;
  removeProofEvent: (id: string) => void;
  getProjectProofEvents: (projectId: string) => ProofEvent[];
}

export const useProofEventStore = create<ProofEventState>()(
  persist(
    (set, get) => ({
      events: [],
      addProofEvent: (e) => set((s) => ({ events: [...s.events, e] })),
      updateProofEvent: (id, patch) =>
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      removeProofEvent: (id) =>
        set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
      getProjectProofEvents: (projectId) =>
        get().events.filter((e) => e.projectId === projectId),
    }),
    {
      name: 'ogden-work-item-proof',
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      version: 1,
      partialize: (state) => ({ events: state.events }),
    },
  ),
);

rehydrateWithLogging(useProofEventStore);
