/**
 * @vitest-environment happy-dom
 *
 * proofRecordStore - proof/verification slice (2026-06-04).
 * Covers the serverId-resolved sync verbs (pullForTask / pushOne) that wire
 * ProofRecord capture through the olos proofs API. The store is keyed by LOCAL
 * project id; only the API speaks serverId. Mirrors the assignment-substrate
 * fix already shipped for actTaskStore.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProofRecord } from '@ogden/shared';

const h = vi.hoisted(() => ({
  listResp: [] as ProofRecord[],
  createResp: null as ProofRecord | null,
  updateResp: null as ProofRecord | null,
  listCalls: [] as Array<{ projectId: string; taskId: string }>,
  createCalls: [] as Array<{ projectId: string; taskId: string; input: unknown }>,
  updateCalls: [] as Array<{
    projectId: string;
    taskId: string;
    proofId: string;
    patch: unknown;
  }>,
}));

vi.mock('../../../lib/apiClient.js', () => ({
  api: {
    olos: {
      proofs: {
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
            proofId: string,
            patch: unknown,
          ) => {
            h.updateCalls.push({ projectId, taskId, proofId, patch });
            return { data: h.updateResp, error: null };
          },
        ),
      },
    },
  },
}));

import { useProofRecordStore } from '../proofRecordStore';

function proof(
  p: Partial<ProofRecord> & { id: string; projectId: string; taskId: string },
): ProofRecord {
  return {
    proofType: 'note',
    capturedAt: '2026-01-01T00:00:00.000Z',
    verificationStatus: 'pending',
    ...p,
  } as ProofRecord;
}

beforeEach(() => {
  localStorage.clear();
  useProofRecordStore.setState({ byProject: {}, syncByProject: {} });
  h.listResp = [];
  h.createResp = null;
  h.updateResp = null;
  h.listCalls = [];
  h.createCalls = [];
  h.updateCalls = [];
});

describe('proofRecordStore.pullForTask', () => {
  it('fetches by serverId + taskId and stores under the LOCAL projectId, normalising each record', async () => {
    h.listResp = [
      proof({ id: 'uuid-a', projectId: 'srv-1', taskId: 't-1' }),
    ];

    await useProofRecordStore
      .getState()
      .pullForTask('local-1', 'srv-1', 't-1');

    expect(h.listCalls).toEqual([{ projectId: 'srv-1', taskId: 't-1' }]);
    const stored = useProofRecordStore.getState().byProject['local-1'] ?? {};
    expect(stored['uuid-a']?.projectId).toBe('local-1'); // normalised to local
  });
});

describe('proofRecordStore.pushOne', () => {
  it('create path: POSTs by serverId, replaces the local-id draft, normalises projectId', async () => {
    const draft = proof({
      id: 'proof-local',
      projectId: 'local-1',
      taskId: 't-1',
    });
    useProofRecordStore.setState({
      byProject: { 'local-1': { 'proof-local': draft } },
    });
    h.createResp = proof({ id: 'uuid-new', projectId: 'srv-1', taskId: 't-1' });

    const saved = await useProofRecordStore
      .getState()
      .pushOne(draft, 'srv-1');

    expect(h.createCalls[0]?.projectId).toBe('srv-1'); // addressed by serverId
    expect(saved?.id).toBe('uuid-new');
    const stored = useProofRecordStore.getState().byProject['local-1'] ?? {};
    expect(stored['proof-local']).toBeUndefined(); // draft removed (dedup)
    expect(stored['uuid-new']?.projectId).toBe('local-1'); // normalised + correct bucket
  });

  it('update path: PATCHes by serverId + taskId, normalises projectId', async () => {
    const existing = proof({
      id: 'uuid-x',
      projectId: 'local-1',
      taskId: 't-1',
    });
    useProofRecordStore.setState({
      byProject: { 'local-1': { 'uuid-x': existing } },
    });
    h.updateResp = proof({ id: 'uuid-x', projectId: 'srv-1', taskId: 't-1' });

    await useProofRecordStore.getState().pushOne(existing, 'srv-1');

    expect(h.updateCalls[0]?.projectId).toBe('srv-1');
    expect(h.updateCalls[0]?.taskId).toBe('t-1');
    expect(h.updateCalls[0]?.proofId).toBe('uuid-x');
    const stored = useProofRecordStore.getState().byProject['local-1'] ?? {};
    expect(stored['uuid-x']?.projectId).toBe('local-1');
  });
});
