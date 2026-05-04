/**
 * Network store — ACT-stage Module 5 (Social Permaculture).
 *
 * External-network address book: vendors, consultants, tradespeople,
 * nurseries, community contacts. Distinct from `memberStore` (which is the
 * project access-control list). The two stay separate so that a project
 * member is always a project member, and an external contact never gains
 * implicit ACL just by being known to the steward.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NetworkRole =
  | 'vendor'
  | 'consultant'
  | 'tradesperson'
  | 'nursery'
  | 'community';

export interface NetworkContact {
  id: string;
  projectId: string;
  name: string;
  role: NetworkRole;
  org?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

interface NetworkState {
  contacts: NetworkContact[];
  addContact: (c: NetworkContact) => void;
  updateContact: (id: string, patch: Partial<NetworkContact>) => void;
  removeContact: (id: string) => void;
}

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set) => ({
      contacts: [],
      addContact: (c) => set((s) => ({ contacts: [...s.contacts, c] })),
      updateContact: (id, patch) =>
        set((s) => ({
          contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      removeContact: (id) =>
        set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) })),
    }),
    { name: 'ogden-act-network', version: 1 },
  ),
);

useNetworkStore.persist.rehydrate();
