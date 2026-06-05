/**
 * @vitest-environment happy-dom
 *
 * useTaskProofSync - pulls a single task's ProofRecords + VerificationRecords
 * on mount (addressed by serverId) and no-ops for local-only projects or when
 * no task is given.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const h = vi.hoisted(() => ({
  proofCalls: [] as Array<{ projectId: string; taskId: string }>,
  verifyCalls: [] as Array<{ projectId: string; taskId: string }>,
}));

vi.mock('../../lib/apiClient.js', () => ({
  api: {
    olos: {
      proofs: {
        list: vi.fn(async (projectId: string, taskId: string) => {
          h.proofCalls.push({ projectId, taskId });
          return { data: [], error: null };
        }),
      },
      verifications: {
        list: vi.fn(async (projectId: string, taskId: string) => {
          h.verifyCalls.push({ projectId, taskId });
          return { data: [], error: null };
        }),
      },
    },
  },
}));

import { useTaskProofSync } from '../useTaskProofSync';

beforeEach(() => {
  localStorage.clear();
  h.proofCalls = [];
  h.verifyCalls = [];
});

describe('useTaskProofSync', () => {
  it('pulls proofs + verifications by serverId on mount when all ids are present', async () => {
    renderHook(() => useTaskProofSync('local-1', 'srv-1', 't-1'));
    await Promise.resolve();
    await Promise.resolve();
    expect(h.proofCalls).toEqual([{ projectId: 'srv-1', taskId: 't-1' }]);
    expect(h.verifyCalls).toEqual([{ projectId: 'srv-1', taskId: 't-1' }]);
  });

  it('does nothing for a local-only project (no serverId)', async () => {
    renderHook(() => useTaskProofSync('local-1', undefined, 't-1'));
    await Promise.resolve();
    expect(h.proofCalls).toEqual([]);
    expect(h.verifyCalls).toEqual([]);
  });

  it('does nothing when no task id is given', async () => {
    renderHook(() => useTaskProofSync('local-1', 'srv-1', undefined));
    await Promise.resolve();
    expect(h.proofCalls).toEqual([]);
    expect(h.verifyCalls).toEqual([]);
  });
});
