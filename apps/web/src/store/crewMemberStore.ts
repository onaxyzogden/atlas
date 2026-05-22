/**
 * crewMemberStore — the net-new resourcing crew roster (Sub-project D2).
 *
 * Steward-authored only: Goal Compass never authors people, so there is NO
 * generated-vs-overridden preservation contract here (unlike workItemStore).
 * Plain projectId-tagged CRUD, mirroring the `ogden-phases` /
 * `ogden-work-items` Zustand+persist sync class. Client-first, no DB
 * migration. Registered in `syncManifest` as `projectId-tagged`.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import type { CrewMember } from '@ogden/shared';

export const newCrewMemberId = (): string => crypto.randomUUID();

const now = () => new Date().toISOString();

interface CrewMemberState {
  members: CrewMember[];
  addMember: (member: CrewMember) => void;
  updateMember: (id: string, patch: Partial<CrewMember>) => void;
  deleteMember: (id: string) => void;
  getProjectMembers: (projectId: string) => CrewMember[];
}

export const useCrewMemberStore = create<CrewMemberState>()(
  persist(
    (set, get) => ({
      members: [],

      addMember: (member) =>
        set((s) => ({ members: [...s.members, member] })),

      updateMember: (id, patch) =>
        set((s) => ({
          members: s.members.map((m) =>
            m.id === id ? { ...m, ...patch, updatedAt: now() } : m,
          ),
        })),

      deleteMember: (id) =>
        set((s) => ({ members: s.members.filter((m) => m.id !== id) })),

      getProjectMembers: (projectId) =>
        get().members.filter((m) => m.projectId === projectId),
    }),
    {
      name: 'ogden-crew-members',
      version: 1,
      partialize: (state) => ({ members: state.members }),
    },
  ),
);

rehydrateWithLogging(useCrewMemberStore);
