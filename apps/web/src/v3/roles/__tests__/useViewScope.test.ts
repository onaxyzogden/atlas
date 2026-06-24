/**
 * @vitest-environment happy-dom
 *
 * useViewScope -- the per-shell activation gate for the Operational Role Layer.
 * Store-direct: seed authStore (who am I) + memberStore (roster + my system
 * role) + uiStore (explicit focus override), renderHook, assert the four
 * outputs. Pins the safe-degradation rules: solo and no-role both disengage the
 * layer; an explicit Full-view choice un-scopes without losing the scope Set.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ProjectMemberRecord, ProjectRole } from '@ogden/shared';
import { useMemberStore } from '../../../store/memberStore.js';
import { useAuthStore } from '../../../store/authStore.js';
import { useUIStore } from '../../../store/uiStore.js';
import { useViewScope } from '../useViewScope.js';

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
  useMemberStore.setState({ members: [], myRole: null, myRoles: {}, isLoading: false });
  useAuthStore.setState({ user: null });
  useUIStore.setState({ viewFocusMode: {} });
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
