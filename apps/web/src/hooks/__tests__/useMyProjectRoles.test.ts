/**
 * @vitest-environment happy-dom
 *
 * useMyProjectRoles (Slice 5.5a). Contract:
 *  - signed out -> never fetches, returns an empty map (offline/demo no-op).
 *  - signed in  -> fetches the bulk role map once.
 *  - exposes the store record as a Map keyed by server project id.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';

const h = vi.hoisted(() => ({
  user: null as { id: string } | null,
  myRoles: {} as Record<string, string>,
  fetchMyRoles: vi.fn(),
}));

vi.mock('../../store/authStore.js', () => ({
  useAuthStore: (selector: (s: { user: unknown }) => unknown) =>
    selector({ user: h.user }),
}));

vi.mock('../../store/memberStore.js', () => ({
  useMemberStore: (
    selector: (s: {
      myRoles: Record<string, string>;
      fetchMyRoles: () => void;
    }) => unknown,
  ) => selector({ myRoles: h.myRoles, fetchMyRoles: h.fetchMyRoles }),
}));

import { useMyProjectRoles } from '../useMyProjectRoles';

beforeEach(() => {
  h.user = null;
  h.myRoles = {};
  h.fetchMyRoles = vi.fn();
});
afterEach(() => cleanup());

describe('useMyProjectRoles', () => {
  it('does not fetch and returns an empty map when signed out', () => {
    const { result } = renderHook(() => useMyProjectRoles());
    expect(h.fetchMyRoles).not.toHaveBeenCalled();
    expect(result.current.size).toBe(0);
  });

  it('fetches once when a user is present', () => {
    h.user = { id: 'u-1' };
    renderHook(() => useMyProjectRoles());
    expect(h.fetchMyRoles).toHaveBeenCalledTimes(1);
  });

  it('exposes the store role map keyed by server project id', () => {
    h.user = { id: 'u-1' };
    h.myRoles = { 'srv-1': 'contractor', 'srv-2': 'owner' };
    const { result } = renderHook(() => useMyProjectRoles());
    expect(result.current.get('srv-1')).toBe('contractor');
    expect(result.current.get('srv-2')).toBe('owner');
    expect(result.current.size).toBe(2);
  });
});
