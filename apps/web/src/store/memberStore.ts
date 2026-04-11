/**
 * Member store — manages project members and the current user's role.
 *
 * Backed by the backend API; no localStorage persistence needed.
 */

import { create } from 'zustand';
import { api } from '../lib/apiClient.js';
import type { ProjectMemberRecord, ProjectRole } from '@ogden/shared';

interface MemberState {
  members: ProjectMemberRecord[];
  myRole: ProjectRole | null;
  isLoading: boolean;

  fetchMembers: (projectId: string) => Promise<void>;
  fetchMyRole: (projectId: string) => Promise<void>;
  inviteMember: (projectId: string, email: string, role: Exclude<ProjectRole, 'owner'>) => Promise<ProjectMemberRecord | null>;
  updateRole: (projectId: string, userId: string, role: Exclude<ProjectRole, 'owner'>) => Promise<void>;
  removeMember: (projectId: string, userId: string) => Promise<void>;
  reset: () => void;
}

export const useMemberStore = create<MemberState>()((set, get) => ({
  members: [],
  myRole: null,
  isLoading: false,

  fetchMembers: async (projectId: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.members.list(projectId);
      if (data) {
        set({ members: data });
      }
    } catch (err) {
      console.warn('[OGDEN] Failed to fetch project members:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMyRole: async (projectId: string) => {
    try {
      const { data } = await api.members.myRole(projectId);
      if (data) {
        set({ myRole: data.role });
      }
    } catch (err) {
      console.warn('[OGDEN] Failed to fetch my role:', err);
    }
  },

  inviteMember: async (projectId: string, email: string, role: Exclude<ProjectRole, 'owner'>) => {
    try {
      const { data } = await api.members.invite(projectId, { email, role });
      if (data) {
        set((s) => ({
          members: [...s.members.filter((m) => m.userId !== data.userId), data],
        }));
        return data;
      }
      return null;
    } catch (err) {
      console.warn('[OGDEN] Failed to invite member:', err);
      throw err; // Re-throw so UI can show error
    }
  },

  updateRole: async (projectId: string, userId: string, role: Exclude<ProjectRole, 'owner'>) => {
    // Optimistic update
    set((s) => ({
      members: s.members.map((m) => (m.userId === userId ? { ...m, role } : m)),
    }));
    try {
      await api.members.updateRole(projectId, userId, { role });
    } catch (err) {
      console.warn('[OGDEN] Failed to update member role:', err);
      // Re-fetch to revert optimistic update
      get().fetchMembers(projectId);
    }
  },

  removeMember: async (projectId: string, userId: string) => {
    // Optimistic removal
    set((s) => ({
      members: s.members.filter((m) => m.userId !== userId),
    }));
    try {
      await api.members.remove(projectId, userId);
    } catch (err) {
      console.warn('[OGDEN] Failed to remove member:', err);
      get().fetchMembers(projectId);
    }
  },

  reset: () => set({ members: [], myRole: null, isLoading: false }),
}));
