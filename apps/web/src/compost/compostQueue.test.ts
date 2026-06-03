/**
 * Resilience-layer tests: optimistic enqueue, temp-id→server-id reconciliation
 * (no duplication), and the circuit-breaker drop path. The apiClient is mocked
 * so no real fetch/timer runs — bounded + deterministic.
 * Run: `vitest run src/compost/compostQueue.test.ts --pool=forks`.
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';

// Mock the API client BEFORE importing the modules that consume it.
vi.mock('../lib/apiClient.js', () => {
  class ApiError extends Error {
    constructor(
      public code: string,
      message: string,
      public status: number,
      public details?: unknown,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  }
  const fn = () => vi.fn();
  return {
    ApiError,
    api: {
      compost: {
        sites: { list: fn(), create: fn(), get: fn(), update: fn(), delete: fn() },
        piles: { list: fn(), create: fn(), get: fn(), update: fn(), delete: fn() },
        readings: { list: fn(), create: fn(), get: fn(), update: fn(), delete: fn() },
      },
    },
  };
});

import { api, ApiError } from '../lib/apiClient.js';
import { useCompostStore } from './useCompostStore.js';
import { useConnectivityStore } from './../store/connectivityStore.js';
import { flushQueue } from './compostSync.js';
import type { CompostOp } from './compostMapping.js';
import type { Reading } from './model.js';

const createReading = api.compost.readings.create as unknown as Mock;

function tempReading(id: string): Reading {
  return { id, day: 0, date: 'Jun 03', temp: 140, moisture: 50, turned: false, note: 'hot', proofPhoto: false };
}

function createOp(localId: string, retryCount = 0): CompostOp {
  return {
    kind: 'createReading',
    localId,
    payload: { tempC: 60, turned: false, note: 'hot', source: 'manual', capturedAt: '2026-06-03T10:00:00.000Z' },
    retryCount,
    ts: 1,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Node 21+ exposes a global `navigator` without `onLine` (→ undefined), which
  // the sync layer would read as "offline". Browsers set it true; stub it so the
  // online path under test runs. (Production code is unchanged.)
  vi.stubGlobal('navigator', { onLine: true });
  useConnectivityStore.setState({ droppedStores: [], pendingChanges: 0, syncStatus: 'idle' });
  useCompostStore.setState({ readings: [], queue: [], orgId: 'o', siteId: 's', pileId: 'p', pile: null, hydrated: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('optimistic logReading', () => {
  it('appends a temp-id reading and enqueues a createReading op (offline-safe)', () => {
    // pileId null → scheduleFlush no-ops, so this asserts the pure optimistic write.
    useCompostStore.setState({ readings: [], queue: [], pileId: null });
    useCompostStore.getState().logReading(60, 'hot');

    const st = useCompostStore.getState();
    expect(st.readings).toHaveLength(1);
    expect(st.readings[0]?.id).toMatch(/^local-/);
    expect(st.readings[0]?.temp).toBe(140); // round(60*9/5+32)
    expect(st.queue).toHaveLength(1);
    expect(st.queue[0]).toMatchObject({ kind: 'createReading', payload: { tempC: 60, source: 'manual' } });
  });
});

describe('flushQueue — success reconciles temp id → server id', () => {
  it('swaps the optimistic id for the server id with no duplicate row', async () => {
    const tempId = 'local-xyz';
    useCompostStore.setState({ readings: [tempReading(tempId)], queue: [createOp(tempId)] });
    createReading.mockResolvedValue({
      data: { id: 'srv-1', pileId: 'p', tempC: 60, turned: false, note: 'hot', source: 'manual', capturedAt: '2026-06-03T10:00:00.000Z' },
    });

    await flushQueue();

    const st = useCompostStore.getState();
    expect(createReading).toHaveBeenCalledTimes(1);
    expect(st.readings).toHaveLength(1); // no duplication
    expect(st.readings[0]?.id).toBe('srv-1');
    expect(st.readings[0]?.temp).toBe(140); // cToF(60)
    expect(st.queue).toHaveLength(0);
    expect(useConnectivityStore.getState().syncStatus).toBe('idle');
  });
});

describe('flushQueue — circuit breaker', () => {
  it('drops a permanent (4xx) client error and surfaces it via addDroppedStore', async () => {
    const tempId = 'local-bad';
    useCompostStore.setState({ readings: [tempReading(tempId)], queue: [createOp(tempId)] });
    createReading.mockRejectedValue(new ApiError('VALIDATION', 'bad input', 400));

    await flushQueue();

    expect(useCompostStore.getState().queue).toHaveLength(0);
    expect(useConnectivityStore.getState().droppedStores).toContain(`compost:createReading:${tempId}`);
  });

  it('drops a transient error once retryCount exceeds MAX_RETRIES', async () => {
    const tempId = 'local-exhausted';
    // Pre-set retryCount at MAX_RETRIES (5) so the next bump (→6) trips the breaker.
    useCompostStore.setState({ readings: [tempReading(tempId)], queue: [createOp(tempId, 5)] });
    createReading.mockRejectedValue(new ApiError('SERVER', 'boom', 500));

    await flushQueue();

    expect(useCompostStore.getState().queue).toHaveLength(0);
    expect(useConnectivityStore.getState().droppedStores).toContain(`compost:createReading:${tempId}`);
  });
});

describe('_applyHydration preserves un-synced optimistic readings', () => {
  it('keeps a pending temp reading that the server fetch does not yet include', () => {
    const tempId = 'local-pending';
    useCompostStore.setState({ readings: [tempReading(tempId)], queue: [createOp(tempId)] });

    useCompostStore.getState()._applyHydration({
      orgId: 'o',
      siteId: 's',
      pileId: 'p',
      pile: null as never, // pile shape irrelevant to this assertion
      readings: [
        { id: 'srv-a', day: 0, date: 'Mar 04', temp: 68, moisture: 52, turned: false, note: '', proofPhoto: false },
      ],
    });

    const ids = useCompostStore.getState().readings.map((r) => r.id);
    expect(ids).toContain('srv-a');
    expect(ids).toContain(tempId); // optimistic write survived the re-fetch
    expect(useCompostStore.getState().readings.map((r) => r.day)).toEqual([0, 1]);
  });
});
