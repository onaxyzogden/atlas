/**
 * @vitest-environment happy-dom
 *
 * verificationRecordStore - proof/verification slice (2026-06-04).
 * Covers the serverId-resolved sync verbs (pullForTask / pushOne) that wire
 * VerificationRecord sign-off through the olos verifications API. The store is
 * keyed by LOCAL project id; only the API speaks serverId. Mirrors the
 * assignment-substrate fix already shipped for actTaskStore.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VerificationRecord } from '@ogden/shared';

const h = vi.hoisted(() => ({
  listResp: [] as VerificationRecord[],
  createResp: null as VerificationRecord | null,
  updateResp: null as VerificationRecord | null,
  listCalls: [] as Array<{ projectId: string; taskId: string }>,
  createCalls: [] as Array<{ projectId: string; taskId: string; input: unknown }>,
  updateCalls: [] as Array<{
    projectId: string;
    taskId: string;
    verificationId: string;
    patch: unknown;
  }>,
}));

vi.mock('../../../lib/apiClient.js', () => ({
  api: {
    olos: {
      verifications: {
        list: vi.fn(async (projectId: string, taskId: string) => {
          h.listCalls.push({ projectId, taskId });
          return { data: h.listResp, error: null };
        }),
        create: vi.fn(
          async (projectId: string, taskId: string, input: unknown) => {
            h.createCalls.push({ projectId, taskId, input });
            return { data: h.createResp, error: null };
          },
        ),
        update: vi.fn(
          async (
            projectId: string,
            taskId: string,
            verificationId: string,
            patch: unknown,
          ) => {
            h.updateCalls.push({ projectId, taskId, verificationId, patch });
            return { data: h.updateResp, error: null };
          },
        ),
      },
    },
  },
}));

import { useVerificationRecordStore } from '../verificationRecordStore';

function verification(
  p: Partial<VerificationRecord> & {
    id: string;
    projectId: string;
    taskId: string;
  },
): VerificationRecord {
  return {
    outcome: 'pass',
    criteriaChecked: [],
    requiredReworkIds: [],
    proofRecordIds: [],
    verifiedAt: '2026-01-01T00:00:00.000Z',
    ...p,
  } as VerificationRecord;
}

beforeEach(() => {
  localStorage.clear();
  useVerificationRecordStore.setState({ byProject: {}, syncByProject: {} });
  h.listResp = [];
  h.createResp = null;
  h.updateResp = null;
  h.listCalls = [];
  h.createCalls = [];
  h.updateCalls = [];
});

describe('verificationRecordStore.pullForTask', () => {
  it('fetches by serverId + taskId and stores under the LOCAL projectId, normalising each record', async () => {
    h.listResp = [
      verification({ id: 'uuid-a', projectId: 'srv-1', taskId: 't-1' }),
    ];

    await useVerificationRecordStore
      .getState()
      .pullForTask('local-1', 'srv-1', 't-1');

    expect(h.listCalls).toEqual([{ projectId: 'srv-1', taskId: 't-1' }]);
    const stored =
      useVerificationRecordStore.getState().byProject['local-1'] ?? {};
    expect(stored['uuid-a']?.projectId).toBe('local-1');
  });
});

describe('verificationRecordStore.pushOne', () => {
  it('create path: POSTs by serverId, replaces the local-id draft, normalises projectId', async () => {
    const draft = verification({
      id: 'verify-local',
      projectId: 'local-1',
      taskId: 't-1',
      proofRecordIds: ['uuid-proof'],
    });
    useVerificationRecordStore.setState({
      byProject: { 'local-1': { 'verify-local': draft } },
    });
    h.createResp = verification({
      id: 'uuid-new',
      projectId: 'srv-1',
      taskId: 't-1',
    });

    const saved = await useVerificationRecordStore
      .getState()
      .pushOne(draft, 'srv-1');

    expect(h.createCalls[0]?.projectId).toBe('srv-1');
    expect(saved?.id).toBe('uuid-new');
    const stored =
      useVerificationRecordStore.getState().byProject['local-1'] ?? {};
    expect(stored['verify-local']).toBeUndefined(); // draft removed (dedup)
    expect(stored['uuid-new']?.projectId).toBe('local-1');
  });

  it('update path: PATCHes by serverId + taskId, normalises projectId', async () => {
    const existing = verification({
      id: 'uuid-x',
      projectId: 'local-1',
      taskId: 't-1',
    });
    useVerificationRecordStore.setState({
      byProject: { 'local-1': { 'uuid-x': existing } },
    });
    h.updateResp = verification({
      id: 'uuid-x',
      projectId: 'srv-1',
      taskId: 't-1',
    });

    await useVerificationRecordStore.getState().pushOne(existing, 'srv-1');

    expect(h.updateCalls[0]?.projectId).toBe('srv-1');
    expect(h.updateCalls[0]?.taskId).toBe('t-1');
    expect(h.updateCalls[0]?.verificationId).toBe('uuid-x');
    const stored =
      useVerificationRecordStore.getState().byProject['local-1'] ?? {};
    expect(stored['uuid-x']?.projectId).toBe('local-1');
  });
});
