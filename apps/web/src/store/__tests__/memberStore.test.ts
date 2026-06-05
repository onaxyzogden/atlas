/**
 * @vitest-environment happy-dom
 *
 * memberStore.fetchMyRoles (Slice 5.5a) - the bulk role endpoint returns an
 * array; the store folds it into a server-id-keyed record consumed by
 * useMyProjectRoles. reset() must clear it alongside the singular myRole.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  myRolesResp: [] as Array<{ projectId: string; role: string }>,
}));

vi.mock('../../lib/apiClient.js', () => ({
  api: {
    members: {
      myRoles: vi.fn(async () => ({ data: h.myRolesResp, error: null })),
    },
  },
}));

import { useMemberStore } from '../memberStore';

beforeEach(() => {
  useMemberStore.getState().reset();
  h.myRolesResp = [];
});

describe('memberStore.fetchMyRoles', () => {
  it('folds the bulk endpoint array into a server-id-keyed role record', async () => {
    h.myRolesResp = [
      { projectId: 'srv-1', role: 'contractor' },
      { projectId: 'srv-2', role: 'owner' },
    ];
    await useMemberStore.getState().fetchMyRoles();
    expect(useMemberStore.getState().myRoles).toEqual({
      'srv-1': 'contractor',
      'srv-2': 'owner',
    });
  });

  it('reset clears the role map', () => {
    useMemberStore.setState({ myRoles: { 'srv-1': 'contractor' } });
    useMemberStore.getState().reset();
    expect(useMemberStore.getState().myRoles).toEqual({});
  });
});
