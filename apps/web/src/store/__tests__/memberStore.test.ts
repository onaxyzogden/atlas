/**
 * @vitest-environment happy-dom
 *
 * memberStore.fetchMyRoles (Slice 5.5a) - the bulk role endpoint returns an
 * array; the store folds it into a server-id-keyed record consumed by
 * useMyProjectRoles. reset() must clear it alongside the singular myRole.
 *
 * memberStore.fetchMembers (H1, deep-audit 2026-07-03) - the roster is a
 * single global slot shared across projects, so a fetch must claim the slot
 * (`rosterProjectId`) BEFORE the await: a foreign project's roster is dropped
 * immediately (no consumer scopes against the wrong members mid-flight),
 * concurrent same-project bootstraps dedupe, and a late response from a
 * superseded fetch never lands.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProjectMemberRecord } from '@ogden/shared';

type ListResult = { data: ProjectMemberRecord[] | null; error: unknown };

const h = vi.hoisted(() => ({
  myRolesResp: [] as Array<{ projectId: string; role: string }>,
  // One entry per api.members.list call; tests resolve/reject them manually.
  listCalls: [] as Array<{
    projectId: string;
    resolve: (r: { data: unknown; error: unknown }) => void;
    reject: (e: unknown) => void;
  }>,
}));

vi.mock('../../lib/apiClient.js', () => ({
  api: {
    members: {
      myRoles: vi.fn(async () => ({ data: h.myRolesResp, error: null })),
      list: vi.fn(
        (projectId: string) =>
          new Promise((resolve, reject) => {
            h.listCalls.push({ projectId, resolve, reject });
          }),
      ),
    },
  },
}));

import { useMemberStore } from '../memberStore';

function member(userId: string): ProjectMemberRecord {
  return {
    userId,
    email: `${userId}@example.nz`,
    displayName: userId,
    role: 'team_member',
    operationalRoles: [],
    joinedAt: '2026-01-01T00:00:00.000Z',
  };
}

function listResult(members: ProjectMemberRecord[]): ListResult {
  return { data: members, error: null };
}

beforeEach(() => {
  useMemberStore.getState().reset();
  h.myRolesResp = [];
  h.listCalls = [];
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

describe('memberStore.fetchMembers -- project-keyed roster slot (H1)', () => {
  it('claims the slot and drops a foreign roster before the fetch lands', async () => {
    useMemberStore.setState({ members: [member('user-a')], rosterProjectId: 'srv-A' });

    const done = useMemberStore.getState().fetchMembers('srv-B');
    // Synchronously after the call: slot claimed, foreign roster gone.
    expect(useMemberStore.getState().rosterProjectId).toBe('srv-B');
    expect(useMemberStore.getState().members).toEqual([]);
    expect(useMemberStore.getState().isLoading).toBe(true);

    h.listCalls[0]!.resolve(listResult([member('user-b')]));
    await done;
    expect(useMemberStore.getState().members).toEqual([member('user-b')]);
    expect(useMemberStore.getState().isLoading).toBe(false);
  });

  it('keeps the current roster while re-fetching the same project (revert path)', async () => {
    useMemberStore.setState({ members: [member('user-a')], rosterProjectId: 'srv-A' });

    const done = useMemberStore.getState().fetchMembers('srv-A');
    // Same project: no clear -- the optimistic roster stays until data lands.
    expect(useMemberStore.getState().members).toEqual([member('user-a')]);

    h.listCalls[0]!.resolve(listResult([member('user-a2')]));
    await done;
    expect(useMemberStore.getState().members).toEqual([member('user-a2')]);
  });

  it('dedupes a concurrent fetch for the same project', async () => {
    const p1 = useMemberStore.getState().fetchMembers('srv-A');
    const p2 = useMemberStore.getState().fetchMembers('srv-A');
    expect(h.listCalls).toHaveLength(1);

    h.listCalls[0]!.resolve(listResult([member('user-a')]));
    await Promise.all([p1, p2]);
    expect(useMemberStore.getState().members).toEqual([member('user-a')]);
  });

  it('never lands a late response for a superseded project', async () => {
    const pA = useMemberStore.getState().fetchMembers('srv-A');
    const pB = useMemberStore.getState().fetchMembers('srv-B'); // supersedes A
    expect(h.listCalls).toHaveLength(2);

    // B (the current claim) lands first, then A's stale response arrives.
    h.listCalls[1]!.resolve(listResult([member('user-b')]));
    await pB;
    h.listCalls[0]!.resolve(listResult([member('user-a')]));
    await pA;

    expect(useMemberStore.getState().rosterProjectId).toBe('srv-B');
    expect(useMemberStore.getState().members).toEqual([member('user-b')]);
  });

  it('a failed fetch keeps the claim and the honest empty roster (one attempt, no resurrection)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    useMemberStore.setState({ members: [member('user-a')], rosterProjectId: 'srv-A' });

    const done = useMemberStore.getState().fetchMembers('srv-B');
    h.listCalls[0]!.reject(new Error('network down'));
    await done;

    // Claim stands (no retry storm); foreign roster is NOT resurrected.
    expect(useMemberStore.getState().rosterProjectId).toBe('srv-B');
    expect(useMemberStore.getState().members).toEqual([]);
    expect(useMemberStore.getState().isLoading).toBe(false);
    warn.mockRestore();
  });

  it('seedLocalMembers never claims the slot; reset clears it', () => {
    useMemberStore.getState().seedLocalMembers([member('demo-1')]);
    expect(useMemberStore.getState().members).toEqual([member('demo-1')]);
    expect(useMemberStore.getState().rosterProjectId).toBeNull();

    useMemberStore.setState({ rosterProjectId: 'srv-A' });
    useMemberStore.getState().reset();
    expect(useMemberStore.getState().rosterProjectId).toBeNull();
  });
});
