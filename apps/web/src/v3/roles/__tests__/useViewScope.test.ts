/**
 * @vitest-environment happy-dom
 *
 * useViewScope -- the per-shell activation gate for the Operational Role Layer.
 * Store-direct: seed authStore (who am I) + memberStore (roster + my system
 * role) + uiStore (explicit focus override), renderHook, assert the four
 * outputs. Pins the safe-degradation rules: solo and no-role both disengage the
 * layer; an explicit Full-view choice un-scopes without losing the scope Set.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import type { ProjectMemberRecord, ProjectRole } from '@ogden/shared';
import { useMemberStore } from '../../../store/memberStore.js';
import { useAuthStore } from '../../../store/authStore.js';
import { useUIStore } from '../../../store/uiStore.js';
import { useViewScope } from '../useViewScope.js';

// useViewScope now reads the project's Option-C domain map via
// useResolvedOperationalRoles (which uses React Query). This suite is
// store-direct (no QueryClientProvider) and exercises built-in scoping, so we
// stub the resolver to `domainsMap: undefined` -- scopeForRoles then falls back
// to the built-in OPERATIONAL_ROLE_DOMAINS, keeping every assertion below
// byte-identical to the pre-Option-C behavior.
vi.mock('../useResolvedOperationalRoles.js', () => ({
  useResolvedOperationalRoles: () => ({ domainsMap: undefined }),
}));

// The H1 roster bootstrap resolves the project's serverId off projectStore
// (id-or-serverId convention). Stub the store module with a minimal zustand
// store so this suite stays store-direct and does not drag projectStore's
// full module graph (persist/idb/seed data) into a unit test.
vi.mock('../../../store/projectStore.js', async () => {
  const { create } = await import('zustand');
  return {
    useProjectStore: create(() => ({
      projects: [] as Array<{ id: string; serverId?: string }>,
    })),
  };
});
import { useProjectStore } from '../../../store/projectStore.js';

const PROJECT_ID = 'proj-test';
const ME = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';

function member(
  userId: string,
  over: Partial<ProjectMemberRecord> = {},
): ProjectMemberRecord {
  return {
    userId,
    email: `${userId}@example.nz`,
    displayName: userId,
    role: 'team_member',
    operationalRoles: [],
    joinedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

/** Seed viewer + roster + system role in one shot. */
function seed(
  members: ProjectMemberRecord[],
  myRole: ProjectRole,
): void {
  useAuthStore.setState({
    user: {
      id: ME,
      email: 'me@example.nz',
      displayName: 'Me',
      defaultOrgId: 'org-1',
      emailVerified: true,
    },
  });
  useMemberStore.setState({ members, myRole, myRoles: {}, isLoading: false });
}

beforeEach(() => {
  useMemberStore.setState({
    members: [],
    myRole: null,
    myRoles: {},
    isLoading: false,
    rosterProjectId: null,
  });
  useAuthStore.setState({ user: null });
  useUIStore.setState({ viewFocusMode: {}, viewFocusRole: {} });
  useProjectStore.setState({ projects: [] });
  localStorage.clear();
});

describe('useViewScope -- activation', () => {
  it('disengages on a solo project (lone steward owns every domain)', () => {
    seed([member(ME, { role: 'primary_steward', operationalRoles: ['food_production'] })], 'primary_steward');
    const { result } = renderHook(() => useViewScope(PROJECT_ID));
    expect(result.current.layerActive).toBe(false);
    expect(result.current.isScoped).toBe(false);
  });

  it('disengages when the viewer holds no operational roles (full view)', () => {
    seed(
      [member(ME, { operationalRoles: [] }), member(OTHER, { operationalRoles: ['livestock'] })],
      'team_member',
    );
    const { result } = renderHook(() => useViewScope(PROJECT_ID));
    expect(result.current.layerActive).toBe(false);
    expect(result.current.scope.size).toBe(0);
    expect(result.current.isScoped).toBe(false);
  });

  it('activates and scopes a multi-member project where the viewer has roles', () => {
    seed(
      [member(ME, { operationalRoles: ['food_production'] }), member(OTHER)],
      'team_member',
    );
    const { result } = renderHook(() => useViewScope(PROJECT_ID));
    expect(result.current.layerActive).toBe(true);
    expect(result.current.focusMode).toBe('role'); // computed default
    expect(result.current.scope.has('plants-food')).toBe(true);
    expect(result.current.scope.size).toBe(1);
    expect(result.current.isScoped).toBe(true);
  });
});

describe('useViewScope -- focus override', () => {
  it('honors an explicit Full-view choice (un-scopes, keeps scope Set non-empty)', () => {
    seed(
      [member(ME, { operationalRoles: ['food_production'] }), member(OTHER)],
      'team_member',
    );
    useUIStore.setState({ viewFocusMode: { [PROJECT_ID]: 'full' } });
    const { result } = renderHook(() => useViewScope(PROJECT_ID));
    expect(result.current.layerActive).toBe(true);
    expect(result.current.focusMode).toBe('full');
    expect(result.current.isScoped).toBe(false); // full view ⇒ no scoping
    expect(result.current.scope.size).toBe(1); // scope still computed, just not applied
  });

  it('setFocusMode persists the per-project choice to uiStore', () => {
    seed(
      [member(ME, { operationalRoles: ['food_production'] }), member(OTHER)],
      'team_member',
    );
    const { result } = renderHook(() => useViewScope(PROJECT_ID));
    act(() => result.current.setFocusMode('full'));
    expect(useUIStore.getState().viewFocusMode[PROJECT_ID]).toBe('full');
    expect(result.current.focusMode).toBe('full');
    expect(result.current.isScoped).toBe(false);
  });
});

describe('useViewScope -- "view as" override (opt-in)', () => {
  it('IGNORES a stored override when the shell did not opt in (Plan/Observe byte-identical)', () => {
    seed(
      [member(ME, { operationalRoles: ['food_production'] }), member(OTHER)],
      'team_member',
    );
    // An override was picked in Act for this project; a non-opted-in shell must
    // not read it -- it never leaks across stages.
    useUIStore.setState({ viewFocusRole: { [PROJECT_ID]: 'livestock' } });
    const { result } = renderHook(() => useViewScope(PROJECT_ID));
    expect(result.current.focusRole).toBeNull();
    expect(result.current.canPickRole).toBe(false);
    // Scope is the viewer's OWN role, not the override's.
    expect(result.current.scope.has('plants-food')).toBe(true);
    expect(result.current.scope.has('animals-livestock')).toBe(false);
    expect(result.current.scope.size).toBe(1);
    expect(result.current.isScoped).toBe(true);
  });

  it('exposes canPickRole only on a team project when opted in', () => {
    // Solo + opt-in ⇒ still no picker. Unmount before re-seeding so the store
    // update does not re-render a live hook outside act().
    seed(
      [member(ME, { role: 'primary_steward', operationalRoles: ['food_production'] })],
      'primary_steward',
    );
    const solo = renderHook(() =>
      useViewScope(PROJECT_ID, { allowRoleOverride: true }),
    );
    expect(solo.result.current.canPickRole).toBe(false);
    solo.unmount();

    // Team + opt-in ⇒ picker available.
    seed(
      [member(ME, { operationalRoles: ['food_production'] }), member(OTHER)],
      'team_member',
    );
    const optedIn = renderHook(() =>
      useViewScope(PROJECT_ID, { allowRoleOverride: true }),
    );
    expect(optedIn.result.current.canPickRole).toBe(true);
    // Same seed, NOT opted in ⇒ no picker.
    const notOptedIn = renderHook(() => useViewScope(PROJECT_ID));
    expect(notOptedIn.result.current.canPickRole).toBe(false);
  });

  it('re-scopes to the picked role\'s domains when opted in', () => {
    seed(
      [member(ME, { operationalRoles: ['food_production'] }), member(OTHER)],
      'team_member',
    );
    useUIStore.setState({ viewFocusRole: { [PROJECT_ID]: 'livestock' } });
    const { result } = renderHook(() =>
      useViewScope(PROJECT_ID, { allowRoleOverride: true }),
    );
    expect(result.current.focusRole).toBe('livestock');
    // Scope is the OVERRIDE role's domain, not the viewer's own.
    expect(result.current.scope.has('animals-livestock')).toBe(true);
    expect(result.current.scope.has('plants-food')).toBe(false);
    expect(result.current.scope.size).toBe(1);
    expect(result.current.isScoped).toBe(true);
  });

  it('lets a no-role coordinator scope via the override (layerActive stays false)', () => {
    seed(
      [member(ME, { operationalRoles: [] }), member(OTHER, { operationalRoles: ['livestock'] })],
      'team_member',
    );
    const { result, rerender } = renderHook(() =>
      useViewScope(PROJECT_ID, { allowRoleOverride: true }),
    );
    // No own roles: the own-role toggle stays suppressed, but the picker is live.
    expect(result.current.layerActive).toBe(false);
    expect(result.current.canPickRole).toBe(true);
    expect(result.current.isScoped).toBe(false); // no override yet ⇒ full view

    act(() => result.current.setFocusRole('ecology_soils'));
    rerender();
    expect(result.current.layerActive).toBe(false); // still no OWN roles
    expect(result.current.isScoped).toBe(true); // override scope applies
    expect(result.current.scope.has('soil')).toBe(true);
    expect(result.current.scope.size).toBe(7);
  });

  it('setFocusRole persists to uiStore and clearing (null) returns to own roles', () => {
    seed(
      [member(ME, { operationalRoles: ['food_production'] }), member(OTHER)],
      'team_member',
    );
    const { result, rerender } = renderHook(() =>
      useViewScope(PROJECT_ID, { allowRoleOverride: true }),
    );
    act(() => result.current.setFocusRole('finance_legal'));
    rerender();
    expect(useUIStore.getState().viewFocusRole[PROJECT_ID]).toBe('finance_legal');
    expect(result.current.scope.has('economics-capacity')).toBe(true);
    expect(result.current.scope.size).toBe(2);

    act(() => result.current.setFocusRole(null));
    rerender();
    expect(useUIStore.getState().viewFocusRole[PROJECT_ID]).toBeNull();
    expect(result.current.focusRole).toBeNull();
    // Back to the viewer's own role scope.
    expect(result.current.scope.has('plants-food')).toBe(true);
    expect(result.current.scope.size).toBe(1);
  });

  it('Full view still un-scopes even with an override picked (mode gates application)', () => {
    seed(
      [member(ME, { operationalRoles: ['food_production'] }), member(OTHER)],
      'team_member',
    );
    useUIStore.setState({
      viewFocusMode: { [PROJECT_ID]: 'full' },
      viewFocusRole: { [PROJECT_ID]: 'livestock' },
    });
    const { result } = renderHook(() =>
      useViewScope(PROJECT_ID, { allowRoleOverride: true }),
    );
    expect(result.current.focusMode).toBe('full');
    expect(result.current.isScoped).toBe(false); // full view ⇒ nothing scoped
    // Scope still reflects the override, just not applied.
    expect(result.current.scope.has('animals-livestock')).toBe(true);
    expect(result.current.scope.size).toBe(1);
  });
});

describe('useViewScope -- roster bootstrap (H1, deep-audit 2026-07-03)', () => {
  // The hook must fetch the roster + viewer role itself (keyed by the
  // project's serverId) so EVERY shell that consumes it gets a live roster --
  // not just the legacy tier shell with its own fetch effect. Spies stand in
  // for the store actions; the fetchMembers spy mimics the real contract of
  // claiming `rosterProjectId` synchronously (that claim is what dedupes
  // sibling consumers mounted in the same commit).
  const realFetchMembers = useMemberStore.getState().fetchMembers;
  const realFetchMyRole = useMemberStore.getState().fetchMyRole;
  let fetchMembers: ReturnType<typeof vi.fn>;
  let fetchMyRole: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMembers = vi.fn(async (projectId: string) => {
      useMemberStore.setState({ rosterProjectId: projectId });
    });
    fetchMyRole = vi.fn(async (_projectId: string) => {});
    useMemberStore.setState({
      fetchMembers: fetchMembers as unknown as typeof realFetchMembers,
      fetchMyRole: fetchMyRole as unknown as typeof realFetchMyRole,
    });
    useProjectStore.setState({
      projects: [
        { id: 'local-1', serverId: 'srv-1' },
        { id: 'local-2', serverId: 'srv-2' },
        { id: 'local-only' },
      ] as unknown as ReturnType<typeof useProjectStore.getState>['projects'],
    });
  });

  afterEach(() => {
    // Unmount FIRST: this afterEach runs before RTL's auto-cleanup (vitest
    // runs afterEach innermost-first), and the hook subscribes to both action
    // selectors -- restoring them on a live hook re-renders it outside act().
    cleanup();
    useMemberStore.setState({
      fetchMembers: realFetchMembers,
      fetchMyRole: realFetchMyRole,
    });
  });

  it('fetches roster + viewer role once, keyed to the project serverId', () => {
    renderHook(() => useViewScope('local-1'));
    expect(fetchMembers).toHaveBeenCalledTimes(1);
    expect(fetchMembers).toHaveBeenCalledWith('srv-1');
    expect(fetchMyRole).toHaveBeenCalledTimes(1);
    expect(fetchMyRole).toHaveBeenCalledWith('srv-1');
  });

  it('resolves a serverId route param through the id-or-serverId convention', () => {
    renderHook(() => useViewScope('srv-1'));
    expect(fetchMembers).toHaveBeenCalledWith('srv-1');
  });

  it('does not fetch for a local-only project (no serverId, nothing to fetch)', () => {
    renderHook(() => useViewScope('local-only'));
    expect(fetchMembers).not.toHaveBeenCalled();
    expect(fetchMyRole).not.toHaveBeenCalled();
  });

  it('does not re-fetch when the roster already belongs to this project', () => {
    useMemberStore.setState({ rosterProjectId: 'srv-1' });
    renderHook(() => useViewScope('local-1'));
    expect(fetchMembers).not.toHaveBeenCalled();
    expect(fetchMyRole).not.toHaveBeenCalled();
  });

  it('re-fetches when navigating to a different synced project', () => {
    const { rerender } = renderHook(({ pid }: { pid: string }) => useViewScope(pid), {
      initialProps: { pid: 'local-1' },
    });
    expect(fetchMembers).toHaveBeenLastCalledWith('srv-1');
    rerender({ pid: 'local-2' });
    expect(fetchMembers).toHaveBeenLastCalledWith('srv-2');
    expect(fetchMembers).toHaveBeenCalledTimes(2);
    expect(fetchMyRole).toHaveBeenCalledTimes(2);
  });

  it('two consumers in one commit trigger a single bootstrap (live claim dedupe)', () => {
    renderHook(() => {
      useViewScope('local-1');
      useViewScope('local-1', { allowRoleOverride: true });
    });
    expect(fetchMembers).toHaveBeenCalledTimes(1);
    expect(fetchMyRole).toHaveBeenCalledTimes(1);
  });
});
