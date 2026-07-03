/**
 * Member store — manages project members and the current user's role.
 *
 * Backed by the backend API; no localStorage persistence needed.
 */

import { create } from 'zustand';
import { api } from '../lib/apiClient.js';
import { DEMO_OFFLINE_ENABLED } from '../app/demoSession.js';
import { useAuthStore } from './authStore.js';
import { scopeForRoles } from '@ogden/shared';
import type {
  ProjectMemberRecord,
  ProjectRole,
  OperationalRole,
  UniversalDomain,
} from '@ogden/shared';

interface MemberState {
  members: ProjectMemberRecord[];
  myRole: ProjectRole | null;
  myRoles: Record<string, ProjectRole>;
  /**
   * The serverId of the project the current `members` roster belongs to, or
   * `null` for an unfetched / locally-seeded roster. `members` is a single
   * global slot shared across projects (H1, deep-audit 2026-07-03), so
   * `fetchMembers` claims this BEFORE its await: consumers (useViewScope's
   * roster bootstrap) key on it to fetch exactly once per project switch, and
   * a foreign project's roster is dropped the moment a new claim is made.
   */
  rosterProjectId: string | null;
  isLoading: boolean;

  fetchMembers: (projectId: string) => Promise<void>;
  fetchMyRole: (projectId: string) => Promise<void>;
  fetchMyRoles: () => Promise<void>;
  /**
   * Seed a local roster for the offline/demo flow (no auth, no backend).
   * No-op when members are already present so a real fetched roster is never
   * clobbered. Used by the builtin sample seed.
   */
  seedLocalMembers: (members: ProjectMemberRecord[]) => void;
  inviteMember: (projectId: string, email: string, role: Exclude<ProjectRole, 'owner' | 'primary_steward'>) => Promise<ProjectMemberRecord | null>;
  updateRole: (projectId: string, userId: string, role: Exclude<ProjectRole, 'owner' | 'primary_steward'>) => Promise<void>;
  /**
   * Replace a member's operational roles (the domain-focus layer, ADR
   * 2026-06-24) — orthogonal to the system role. Optimistic; reverts via
   * re-fetch on failure. Empty array ⇒ full view.
   */
  setOperationalRoles: (projectId: string, userId: string, roles: OperationalRole[]) => Promise<void>;
  removeMember: (projectId: string, userId: string) => Promise<void>;
  reset: () => void;
}

export const useMemberStore = create<MemberState>()((set, get) => ({
  members: [],
  myRole: null,
  myRoles: {},
  rosterProjectId: null,
  isLoading: false,

  fetchMembers: async (projectId: string) => {
    // Offline demo: no backend to read from — the sample seeds its roster via
    // seedLocalMembers, so a server fetch would only 401 and clobber nothing.
    if (DEMO_OFFLINE_ENABLED) return;
    const { rosterProjectId, isLoading } = get();
    // A fetch for this same roster is already in flight — don't double-hit the
    // endpoint (several shells/controls bootstrap through useViewScope in one
    // commit; ActTierShell keeps its own effect too).
    if (isLoading && rosterProjectId === projectId) return;
    // Claim the slot BEFORE the await. On a project switch also drop the
    // foreign roster immediately, so no consumer scopes against the wrong
    // project's members while the fetch is in flight; a locally-seeded roster
    // (rosterProjectId null) is replaced too — the server roster is
    // authoritative for a synced project. On failure the claim stands: one
    // attempt per switch (no retry storm), and the honest empty roster
    // degrades to the full, unscoped view. Same-project re-fetches (the
    // optimistic-revert paths below) keep the current roster until data lands.
    set(
      rosterProjectId === projectId
        ? { isLoading: true }
        : { isLoading: true, rosterProjectId: projectId, members: [] },
    );
    try {
      const { data } = await api.members.list(projectId);
      // Land the response only if this fetch still owns the slot — a newer
      // claim for another project may have superseded us mid-flight.
      if (data && get().rosterProjectId === projectId) {
        set({ members: data });
      }
    } catch (err) {
      console.warn('[OGDEN] Failed to fetch project members:', err);
    } finally {
      if (get().rosterProjectId === projectId) {
        set({ isLoading: false });
      }
    }
  },

  seedLocalMembers: (members: ProjectMemberRecord[]) => {
    if (get().members.length > 0) return;
    set({ members });
  },

  fetchMyRole: async (projectId: string) => {
    if (DEMO_OFFLINE_ENABLED) return;
    try {
      const { data } = await api.members.myRole(projectId);
      if (data) {
        set({ myRole: data.role });
      }
    } catch (err) {
      console.warn('[OGDEN] Failed to fetch my role:', err);
    }
  },

  fetchMyRoles: async () => {
    if (DEMO_OFFLINE_ENABLED) return;
    try {
      const { data } = await api.members.myRoles();
      if (data) {
        const next: Record<string, ProjectRole> = {};
        for (const entry of data) {
          next[entry.projectId] = entry.role;
        }
        set({ myRoles: next });
      }
    } catch (err) {
      console.warn('[OGDEN] Failed to fetch my roles:', err);
    }
  },

  inviteMember: async (projectId: string, email: string, role: Exclude<ProjectRole, 'owner' | 'primary_steward'>) => {
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

  updateRole: async (projectId: string, userId: string, role: Exclude<ProjectRole, 'owner' | 'primary_steward'>) => {
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

  setOperationalRoles: async (projectId: string, userId: string, roles: OperationalRole[]) => {
    const deduped = [...new Set(roles)];
    // Optimistic update
    set((s) => ({
      members: s.members.map((m) =>
        m.userId === userId ? { ...m, operationalRoles: deduped } : m,
      ),
    }));
    // Offline demo: no backend — the optimistic set is the source of truth.
    if (DEMO_OFFLINE_ENABLED) return;
    try {
      await api.members.setOperationalRoles(projectId, userId, { operationalRoles: deduped });
    } catch (err) {
      console.warn('[OGDEN] Failed to set operational roles:', err);
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

  reset: () =>
    set({ members: [], myRole: null, myRoles: {}, rosterProjectId: null, isLoading: false }),
}));

// ─── Operational-role selectors ──────────────────────────────────────────
// Plain functions (not hooks): they read getState() once and never build a
// reactive subscription, so the fresh-Set return is safe here. The reactive
// layer (Phase 4 `useViewScope`) memoizes the scope Set in a `useMemo` keyed
// on the stable raw role array — never returning a new Set from a Zustand
// selector hook. `projectId` is intentionally not a parameter: the `members`
// roster is already scoped to the active project.

/**
 * The viewer's own operational roles, read from their row in the active
 * project's roster. Returns [] when logged out or when the viewer has no
 * member row (⇒ caller falls back to the full, unfiltered view).
 */
export function selectMyOperationalRoles(): OperationalRole[] {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return [];
  const me = useMemberStore.getState().members.find((m) => m.userId === userId);
  return me?.operationalRoles ?? [];
}

/**
 * The union of the viewer's operational-role domain scopes. Empty when the
 * viewer holds no roles (⇒ full view). Builds a fresh Set each call — memoize
 * at the consuming hook (see note above).
 */
export function selectMyOperationalScope(): Set<UniversalDomain> {
  return scopeForRoles(selectMyOperationalRoles());
}
