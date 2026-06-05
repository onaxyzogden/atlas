/**
 * @vitest-environment happy-dom
 *
 * ActFeedbackLoop - assignment substrate (2026-05-29). Pins:
 *   1. an owner sees an assignee picker per task; assigning writes
 *      ActTask.assigneeId and PATCHes the olos_act_tasks API by serverId;
 *   2. a viewer sees no picker (read-only);
 *   3. the surface wires the on-open pull via useActTaskSync.
 *
 * useActTaskSync is mocked here (it is unit-tested in its own suite); mocking
 * it keeps the seeded task from being clobbered by an async empty pull and
 * lets us assert the wiring call directly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ActTask, Objective, ProjectMemberRecord } from '@ogden/shared';

const h = vi.hoisted(() => ({
  updateCalls: [] as Array<{ projectId: string; taskId: string; patch: { assigneeId?: string } }>,
}));

vi.mock('../../../../lib/apiClient.js', () => ({
  api: {
    olos: {
      tasks: {
        list: vi.fn(async () => ({ data: [], error: null })),
        create: vi.fn(async () => ({ data: null, error: null })),
        update: vi.fn(
          async (projectId: string, taskId: string, patch: { assigneeId?: string }) => {
            h.updateCalls.push({ projectId, taskId, patch });
            return { data: { ...patch, id: taskId, projectId }, error: null };
          },
        ),
      },
      // Present so the flag-on render's TaskProofSync pull resolves cleanly.
      proofs: { list: vi.fn(async () => ({ data: [], error: null })) },
      verifications: { list: vi.fn(async () => ({ data: [], error: null })) },
    },
    members: { list: vi.fn(async () => ({ data: [], error: null })) },
  },
}));

vi.mock('../../../../hooks/useActTaskSync.js', () => ({
  useActTaskSync: vi.fn(),
}));

import { useActTaskStore } from '../../../../store/olos/index.js';
import { useMemberStore } from '../../../../store/memberStore.js';
import { useAuthStore } from '../../../../store/authStore.js';
import { useActTaskSync } from '../../../../hooks/useActTaskSync.js';
import ActFeedbackLoop from '../ActFeedbackLoop';

const OBJ = { id: 'obj-1', domain: 'water', stage: 'act' } as unknown as Objective;

function member(
  userId: string,
  role: ProjectMemberRecord['role'],
  displayName: string,
): ProjectMemberRecord {
  return {
    userId,
    role,
    displayName,
    email: `${userId}@x.co`,
    joinedAt: '2026-01-01T00:00:00.000Z',
  } as ProjectMemberRecord;
}

function seedTask(): void {
  useActTaskStore.setState({
    byProject: {
      'local-1': {
        'uuid-t1': {
          id: 'uuid-t1',
          projectId: 'local-1',
          objectiveId: 'obj-1',
          handoffPackageId: 'pkg-1',
          title: 'Mulch the swale',
          description: '',
          priority: 'normal',
          status: 'ready',
          createdAt: '2026-01-01T00:00:00.000Z',
        } as ActTask,
      },
    },
    syncByProject: {},
  });
}

beforeEach(() => {
  localStorage.clear();
  h.updateCalls = [];
  seedTask();
  useMemberStore.setState({
    members: [
      member('u-owner', 'owner', 'Owner'),
      member('u-me', 'team_member', 'Me'),
    ],
    myRole: null,
    // Role is resolved project-scoped from myRoles[serverId] (see ActFeedbackLoop),
    // not from the legacy global myRole. Tests address serverId 'srv-1'.
    myRoles: { 'srv-1': 'owner' },
    isLoading: false,
  });
  useAuthStore.setState({
    user: { id: 'u-owner', email: 'o@x.co', displayName: 'Owner', defaultOrgId: 'org-1' },
  });
});

describe('ActFeedbackLoop - assignment', () => {
  it('owner sees an assignee picker and assigning PATCHes by serverId', async () => {
    render(<ActFeedbackLoop projectId="local-1" objective={OBJ} serverId="srv-1" />);

    const select = screen.getByLabelText('Assign Mulch the swale');
    expect(select).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Me' })).toBeTruthy();

    fireEvent.change(select, { target: { value: 'u-me' } });

    const stored = useActTaskStore.getState().byProject['local-1'] ?? {};
    expect(stored['uuid-t1']?.assigneeId).toBe('u-me'); // assign applied synchronously

    await Promise.resolve();
    expect(h.updateCalls).toHaveLength(1);
    const call = h.updateCalls[0]!;
    expect(call.projectId).toBe('srv-1');
    expect(call.taskId).toBe('uuid-t1');
    expect(call.patch.assigneeId).toBe('u-me');
  });

  it('wires the on-open pull with the local id + serverId', () => {
    render(<ActFeedbackLoop projectId="local-1" objective={OBJ} serverId="srv-1" />);
    expect(vi.mocked(useActTaskSync)).toHaveBeenCalledWith('local-1', 'srv-1');
  });

  it('a viewer sees no assignee picker', () => {
    useAuthStore.setState({
      user: { id: 'u-viewer', email: 'v@x.co', displayName: 'V', defaultOrgId: 'org-1' },
    });
    useMemberStore.setState((s) => ({
      members: [...s.members, member('u-viewer', 'viewer', 'V')],
      // Current user is a viewer on srv-1: role resolves viewer -> no picker.
      myRoles: { 'srv-1': 'viewer' },
    }));
    render(<ActFeedbackLoop projectId="local-1" objective={OBJ} serverId="srv-1" />);
    expect(screen.queryByLabelText('Assign Mulch the swale')).toBeNull();
  });
});

describe('ActFeedbackLoop - formal proof flag', () => {
  it('does not mount the proof/verification panel when the flag is off (default)', () => {
    render(<ActFeedbackLoop projectId="local-1" objective={OBJ} serverId="srv-1" />);
    expect(screen.queryByText('Proof and verification')).toBeNull();
  });

  it('mounts the proof/verification panel per task when the flag is on', async () => {
    localStorage.setItem('ogden-flag-olos-formal-proof', 'true');
    render(<ActFeedbackLoop projectId="local-1" objective={OBJ} serverId="srv-1" />);
    expect(await screen.findByText('Proof and verification')).toBeTruthy();
  });
});
