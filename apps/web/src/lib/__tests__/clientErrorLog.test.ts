/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoisted mock for apiClient — must be declared before importing the module
// under test so the module captures the mocked `api`. vi.mock is hoisted to
// the top of the file, so the factory cannot close over module-level consts;
// use vi.hoisted() to share the spy reference safely.
const { postClientErrors } = vi.hoisted(() => ({
  postClientErrors: vi.fn().mockResolvedValue({ data: { ingested: 0 }, error: null }),
}));
vi.mock('../apiClient', () => ({
  api: {
    telemetry: {
      postClientErrors,
    },
  },
  ApiError: class ApiError extends Error {},
}));

// VITE_ATLAS_TELEMETRY_ENABLED defaults to dev-mode 'true'; vitest reports
// import.meta.env.DEV = true, so no override needed.
import { recordClientError, flush, __test } from '../clientErrorLog';

const evt = (overrides: Partial<Parameters<typeof recordClientError>[0]> = {}) => ({
  source: 'persist_rehydrate' as const,
  name: 'SyntaxError',
  message: 'Unexpected token',
  projectId: null,
  context: { persistKey: 'ogden-conventional-crops' },
  ...overrides,
});

/** A rejection that looks like an ApiError 401 (the queue-until-auth case). */
const authError = () => Object.assign(new Error('Unauthorized'), { status: 401 });

describe('clientErrorLog', () => {
  beforeEach(() => {
    __test.reset();
    postClientErrors.mockClear();
    postClientErrors.mockResolvedValue({ data: { ingested: 0 }, error: null });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const firstCallEvents = (): unknown[] => {
    const args = postClientErrors.mock.calls[0];
    if (!args) throw new Error('postClientErrors never called');
    return args[0] as unknown[];
  };

  it('debounces flush by 1500ms of idle', async () => {
    recordClientError(evt());
    recordClientError(evt({ name: 'TypeError' }));
    expect(postClientErrors).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1499);
    expect(postClientErrors).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2);
    await Promise.resolve(); // flush() is async
    expect(postClientErrors).toHaveBeenCalledTimes(1);
    expect(firstCallEvents()).toHaveLength(2);
  });

  it('flushes immediately when the 50-event ceiling is hit', async () => {
    for (let i = 0; i < 50; i += 1) {
      recordClientError(evt());
    }
    await Promise.resolve();
    await Promise.resolve();
    expect(postClientErrors).toHaveBeenCalledTimes(1);
    expect(firstCallEvents()).toHaveLength(50);
  });

  it('resets the idle timer with each new event', async () => {
    recordClientError(evt());
    vi.advanceTimersByTime(1000);
    recordClientError(evt()); // resets timer
    vi.advanceTimersByTime(1000);
    expect(postClientErrors).not.toHaveBeenCalled();

    vi.advanceTimersByTime(600);
    await Promise.resolve();
    expect(postClientErrors).toHaveBeenCalledTimes(1);
    expect(firstCallEvents()).toHaveLength(2);
  });

  it('retains failed events with bounded retry on a non-auth error', async () => {
    postClientErrors.mockRejectedValueOnce(new Error('network down'));
    recordClientError(evt());

    vi.advanceTimersByTime(1500);
    await Promise.resolve();
    await Promise.resolve();

    expect(postClientErrors).toHaveBeenCalledTimes(1);
    expect(__test.getQueueLength()).toBe(1);
    const snap = __test.getQueueSnapshot();
    expect(snap[0]?.__retries).toBe(1);
  });

  it('drops events after MAX_RETRIES on persistent non-auth failure', async () => {
    postClientErrors.mockRejectedValue(new Error('still down'));
    recordClientError(evt());

    for (let i = 0; i < 5; i += 1) {
      await flush();
    }
    expect(__test.getQueueLength()).toBe(0);
  });

  it('queue-until-auth: a 401 retains events WITHOUT burning a retry', async () => {
    postClientErrors.mockRejectedValue(authError());
    recordClientError(evt());

    // Many flush attempts while "logged out": event must never be dropped
    // and __retries must stay 0.
    for (let i = 0; i < 10; i += 1) {
      await flush();
    }
    expect(__test.getQueueLength()).toBe(1);
    expect(__test.getQueueSnapshot()[0]?.__retries).toBe(0);

    // Once auth exists, the next flush drains the queue.
    postClientErrors.mockResolvedValueOnce({ data: { ingested: 1 }, error: null });
    await flush();
    expect(__test.getQueueLength()).toBe(0);
  });

  it('stamps sessionId + occurredAt + projectId + source on every event', async () => {
    recordClientError(evt());
    vi.advanceTimersByTime(1500);
    await Promise.resolve();

    const e = firstCallEvents()[0] as {
      sessionId: string;
      occurredAt: string;
      projectId: string | null;
      source: string;
      context: Record<string, unknown>;
    };
    expect(typeof e.sessionId).toBe('string');
    expect(e.sessionId.length).toBeGreaterThan(0);
    expect(typeof e.occurredAt).toBe('string');
    expect(() => new Date(e.occurredAt).toISOString()).not.toThrow();
    expect(e.projectId).toBeNull();
    expect(e.source).toBe('persist_rehydrate');
    expect(e.context).toEqual({ persistKey: 'ogden-conventional-crops' });
  });

  it('reuses a single sessionId across the page lifetime', async () => {
    recordClientError(evt());
    recordClientError(evt());
    vi.advanceTimersByTime(1500);
    await Promise.resolve();

    const events = firstCallEvents() as Array<{ sessionId: string }>;
    expect(events[0]?.sessionId).toBe(events[1]?.sessionId);
  });

  it('falls back to name "Error" and empty message when not supplied', async () => {
    recordClientError({ source: 'unhandled_rejection', name: '' });
    vi.advanceTimersByTime(1500);
    await Promise.resolve();

    const e = firstCallEvents()[0] as { name: string; message: string };
    expect(e.name).toBe('Error');
    expect(e.message).toBe('');
  });

  it('truncates an over-long message to 4000 chars', async () => {
    recordClientError(evt({ message: 'x'.repeat(5000) }));
    vi.advanceTimersByTime(1500);
    await Promise.resolve();

    const e = firstCallEvents()[0] as { message: string };
    expect(e.message).toHaveLength(4000);
  });

  it('defaults projectId to null when omitted', async () => {
    recordClientError({ source: 'api_client', name: 'ApiError' });
    vi.advanceTimersByTime(1500);
    await Promise.resolve();

    const e = firstCallEvents()[0] as { projectId: string | null };
    expect(e.projectId).toBeNull();
  });
});
