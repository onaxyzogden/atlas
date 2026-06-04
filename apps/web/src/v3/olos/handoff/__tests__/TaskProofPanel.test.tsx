/**
 * @vitest-environment happy-dom
 *
 * TaskProofPanel - formal proof/verification surface (2026-06-04).
 * Pins: submitter captures + pushes a proof; reviewer pass -> verification
 * pushed + task verified-complete; reviewer needs-rework -> task needs-rework;
 * viewer sees a read-only list.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type {
  ActTask,
  ProofRecord,
  ProjectMemberRecord,
  VerificationRecord,
} from '@ogden/shared';

const h = vi.hoisted(() => ({
  proofListResp: [] as ProofRecord[],
  verifyListResp: [] as VerificationRecord[],
  proofCreateResp: null as ProofRecord | null,
  verifyCreateResp: null as VerificationRecord | null,
  taskUpdateResp: null as ActTask | null,
  proofCreateCalls: [] as Array<{ projectId: string; taskId: string; input: any }>,
  verifyCreateCalls: [] as Array<{ projectId: string; taskId: string; input: any }>,
  taskUpdateCalls: [] as Array<{ projectId: string; taskId: string; patch: any }>,
}));

vi.mock('../../../../lib/apiClient.js', () => ({
  api: {
    olos: {
      proofs: {
        list: vi.fn(async () => ({ data: h.proofListResp, error: null })),
        create: vi.fn(
          async (projectId: string, taskId: string, input: unknown) => {
            h.proofCreateCalls.push({ projectId, taskId, input });
            return { data: h.proofCreateResp, error: null };
          },
        ),
      },
      verifications: {
        list: vi.fn(async () => ({ data: h.verifyListResp, error: null })),
        create: vi.fn(
          async (projectId: string, taskId: string, input: unknown) => {
            h.verifyCreateCalls.push({ projectId, taskId, input });
            return { data: h.verifyCreateResp, error: null };
          },
        ),
      },
      tasks: {
        list: vi.fn(async () => ({ data: [], error: null })),
        update: vi.fn(
          async (projectId: string, taskId: string, patch: unknown) => {
            h.taskUpdateCalls.push({ projectId, taskId, patch });
            return { data: h.taskUpdateResp, error: null };
          },
        ),
      },
    },
  },
}));

import TaskProofPanel from '../TaskProofPanel';
import {
  useProofRecordStore,
  useVerificationRecordStore,
  useActTaskStore,
} from '../../../../store/olos/index.js';

function task(p: Partial<ActTask> = {}): ActTask {
  return {
    id: 'uuid-task',
    projectId: 'local-1',
    objectiveId: 'obj-1',
    handoffPackageId: 'pkg-1',
    title: 'Mulch the swale',
    description: '',
    priority: 'normal',
    status: 'completed-pending-verification',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...p,
  } as ActTask;
}

function proof(p: Partial<ProofRecord> = {}): ProofRecord {
  return {
    id: 'uuid-proof',
    projectId: 'srv-1',
    taskId: 'uuid-task',
    proofType: 'note',
    note: 'mulched',
    capturedAt: '2026-01-01T00:00:00.000Z',
    verificationStatus: 'pending',
    ...p,
  } as ProofRecord;
}

const OWNER: ProjectMemberRecord = {
  userId: 'u-owner',
  email: 'owner@x.io',
  displayName: 'Owner',
  role: 'owner',
  joinedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  localStorage.clear();
  useProofRecordStore.setState({ byProject: {}, syncByProject: {} });
  useVerificationRecordStore.setState({ byProject: {}, syncByProject: {} });
  useActTaskStore.setState({ byProject: {}, syncByProject: {} });
  h.proofListResp = [];
  h.verifyListResp = [];
  h.proofCreateResp = null;
  h.verifyCreateResp = null;
  h.taskUpdateResp = null;
  h.proofCreateCalls = [];
  h.verifyCreateCalls = [];
  h.taskUpdateCalls = [];
});

describe('TaskProofPanel - capture', () => {
  it('submitter captures a proof and pushes it by serverId', async () => {
    h.proofCreateResp = proof({ id: 'uuid-new', note: 'did the work' });
    const t = task();

    render(
      <TaskProofPanel
        projectId="local-1"
        task={t}
        serverId="srv-1"
        members={[OWNER]}
        currentUserId="u-owner"
        myRole="owner"
      />,
    );

    fireEvent.change(screen.getByLabelText('Proof note'), {
      target: { value: 'did the work' },
    });
    fireEvent.click(screen.getByText('Capture proof'));

    await waitFor(() => expect(h.proofCreateCalls).toHaveLength(1));
    expect(h.proofCreateCalls[0]?.projectId).toBe('srv-1'); // addressed by serverId
    expect(h.proofCreateCalls[0]?.input.note).toBe('did the work');
    expect(h.proofCreateCalls[0]?.input.submittedBy).toBe('u-owner');
  });
});

describe('TaskProofPanel - verification (two-write)', () => {
  it('reviewer pass pushes a verification and transitions the task to verified-complete', async () => {
    const t = task();
    useActTaskStore.setState({ byProject: { 'local-1': { 'uuid-task': t } } });
    h.proofListResp = [proof()]; // a server-saved proof exists to cite
    h.verifyCreateResp = {
      id: 'uuid-verify',
      projectId: 'srv-1',
      taskId: 'uuid-task',
      outcome: 'pass',
      criteriaChecked: [],
      requiredReworkIds: [],
      proofRecordIds: ['uuid-proof'],
      verifiedAt: '2026-01-01T00:00:00.000Z',
    } as VerificationRecord;
    h.taskUpdateResp = task({ status: 'verified-complete' });

    render(
      <TaskProofPanel
        projectId="local-1"
        task={t}
        serverId="srv-1"
        members={[OWNER]}
        currentUserId="u-rev"
        myRole="reviewer"
      />,
    );

    await screen.findByText('Sign off');
    fireEvent.click(screen.getByText('Sign off'));

    await waitFor(() => expect(h.verifyCreateCalls).toHaveLength(1));
    expect(h.verifyCreateCalls[0]?.input.proofRecordIds).toEqual(['uuid-proof']);
    await waitFor(() =>
      expect(
        h.taskUpdateCalls.some((c) => c.patch.status === 'verified-complete'),
      ).toBe(true),
    );
    expect(
      useActTaskStore.getState().getTask('local-1', 'uuid-task')?.status,
    ).toBe('verified-complete');
  });

  it('reviewer needs-rework transitions the task to needs-rework', async () => {
    const t = task();
    useActTaskStore.setState({ byProject: { 'local-1': { 'uuid-task': t } } });
    h.proofListResp = [proof()];
    h.verifyCreateResp = {
      id: 'uuid-verify',
      projectId: 'srv-1',
      taskId: 'uuid-task',
      outcome: 'needs-rework',
      criteriaChecked: [],
      requiredReworkIds: [],
      proofRecordIds: ['uuid-proof'],
      verifiedAt: '2026-01-01T00:00:00.000Z',
    } as VerificationRecord;
    h.taskUpdateResp = task({ status: 'needs-rework' });

    render(
      <TaskProofPanel
        projectId="local-1"
        task={t}
        serverId="srv-1"
        members={[OWNER]}
        currentUserId="u-rev"
        myRole="reviewer"
      />,
    );

    await screen.findByText('Sign off');
    fireEvent.change(screen.getByLabelText('Verification outcome'), {
      target: { value: 'needs-rework' },
    });
    fireEvent.click(screen.getByText('Sign off'));

    await waitFor(() =>
      expect(
        useActTaskStore.getState().getTask('local-1', 'uuid-task')?.status,
      ).toBe('needs-rework'),
    );
  });
});

describe('TaskProofPanel - read-only', () => {
  it('a viewer sees the proof list but no capture or sign-off controls', async () => {
    h.proofListResp = [proof({ note: 'evidence here' })];
    const t = task();

    render(
      <TaskProofPanel
        projectId="local-1"
        task={t}
        serverId="srv-1"
        members={[OWNER]}
        currentUserId="u-view"
        myRole="viewer"
      />,
    );

    await screen.findByText(/evidence here/);
    expect(screen.queryByText('Capture proof')).toBeNull();
    expect(screen.queryByText('Sign off')).toBeNull();
  });
});
