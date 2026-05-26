/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoisted mock for apiClient — must be declared before importing the module
// under test so the module captures the mocked `api`. vi.mock is hoisted to
// the top of the file, so the factory cannot close over module-level consts;
// use vi.hoisted() to share the spy reference safely.
const { postActInteractions } = vi.hoisted(() => ({
  postActInteractions: vi.fn().mockResolvedValue({ data: { ingested: 0 }, error: null }),
}));
vi.mock('../apiClient', () => ({
  api: {
    telemetry: {
      postActInteractions,
    },
  },
  ApiError: class ApiError extends Error {},
}));

// VITE_ATLAS_TELEMETRY_ENABLED defaults to dev-mode 'true'; vitest reports
// import.meta.env.DEV = true, so no override needed.
import { recordInteraction, flush, __test } from '../actInteractionLog';

const ctx = {
  projectId: '11111111-1111-4111-8111-111111111111',
  projectType: 'homestead' as const,
};

const tile = (overrides: Partial<{ module: 'built-infrastructure'; eventType: 'tile_select' }> = {}) => ({
  module: 'built-infrastructure' as const,
  eventType: 'tile_select' as const,
  ...overrides,
});

describe('actInteractionLog', () => {
  beforeEach(() => {
    __test.reset();
    postActInteractions.mockClear();
    postActInteractions.mockResolvedValue({ data: { ingested: 0 }, error: null });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const firstCallEvents = (): unknown[] => {
    const args = postActInteractions.mock.calls[0];
    if (!args) throw new Error('postActInteractions never called');
    return args[0] as unknown[];
  };

  it('debounces flush by 1500ms of idle', async () => {
    recordInteraction(ctx, tile());
    recordInteraction(ctx, tile({ eventType: 'tile_open' as never }));
    expect(postActInteractions).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1499);
    expect(postActInteractions).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2);
    await Promise.resolve(); // flush() is async
    expect(postActInteractions).toHaveBeenCalledTimes(1);
    expect(firstCallEvents()).toHaveLength(2);
  });

  it('flushes immediately when the 50-event ceiling is hit', async () => {
    for (let i = 0; i < 50; i += 1) {
      recordInteraction(ctx, tile());
    }
    await Promise.resolve();
    await Promise.resolve();
    expect(postActInteractions).toHaveBeenCalledTimes(1);
    expect(firstCallEvents()).toHaveLength(50);
  });

  it('resets the idle timer with each new event', async () => {
    recordInteraction(ctx, tile());
    vi.advanceTimersByTime(1000);
    recordInteraction(ctx, tile()); // resets timer
    vi.advanceTimersByTime(1000);
    expect(postActInteractions).not.toHaveBeenCalled();

    vi.advanceTimersByTime(600);
    await Promise.resolve();
    expect(postActInteractions).toHaveBeenCalledTimes(1);
    expect(firstCallEvents()).toHaveLength(2);
  });

  it('retains failed events with bounded retry', async () => {
    postActInteractions.mockRejectedValueOnce(new Error('network down'));
    recordInteraction(ctx, tile());

    vi.advanceTimersByTime(1500);
    await Promise.resolve();
    await Promise.resolve();

    expect(postActInteractions).toHaveBeenCalledTimes(1);
    expect(__test.getQueueLength()).toBe(1);
    const snap = __test.getQueueSnapshot();
    expect(snap[0]?.__retries).toBe(1);
  });

  it('drops events after MAX_RETRIES', async () => {
    postActInteractions.mockRejectedValue(new Error('still down'));
    recordInteraction(ctx, tile());

    for (let i = 0; i < 5; i += 1) {
      await flush();
    }
    expect(__test.getQueueLength()).toBe(0);
  });

  it('stamps occurredAt + sessionId + projectId on every event', async () => {
    recordInteraction(ctx, tile());
    vi.advanceTimersByTime(1500);
    await Promise.resolve();

    const evt = firstCallEvents()[0] as {
      projectId: string;
      projectType: string;
      sessionId: string;
      occurredAt: string;
    };
    expect(evt.projectId).toBe(ctx.projectId);
    expect(evt.projectType).toBe('homestead');
    expect(typeof evt.sessionId).toBe('string');
    expect(evt.sessionId.length).toBeGreaterThan(0);
    expect(typeof evt.occurredAt).toBe('string');
    expect(() => new Date(evt.occurredAt).toISOString()).not.toThrow();
  });

  it('reuses a single sessionId across the page lifetime', async () => {
    recordInteraction(ctx, tile());
    recordInteraction(ctx, tile());
    vi.advanceTimersByTime(1500);
    await Promise.resolve();

    const events = firstCallEvents() as Array<{ sessionId: string }>;
    expect(events[0]?.sessionId).toBe(events[1]?.sessionId);
  });

  it('is a no-op when projectId is empty', () => {
    recordInteraction({ ...ctx, projectId: '' }, tile());
    expect(__test.getQueueLength()).toBe(0);
    vi.advanceTimersByTime(2000);
    expect(postActInteractions).not.toHaveBeenCalled();
  });
});
