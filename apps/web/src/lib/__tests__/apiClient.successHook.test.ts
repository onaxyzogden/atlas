/**
 * @vitest-environment happy-dom
 *
 * Locks the success hook added for the API-reachability signal: a 2xx response
 * fires the registered handler (so apiReachable flips back to true), while
 * telemetry POSTs are skipped and failures never fire it.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { api, setApiSuccessHandler } from '../apiClient';

const fakeResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as Response;

const errBody = (code: string, message: string) => ({ data: null, error: { code, message } });

let onSuccess: ReturnType<typeof vi.fn>;

beforeEach(() => {
  onSuccess = vi.fn();
  setApiSuccessHandler(onSuccess);
});

afterEach(() => {
  setApiSuccessHandler(null);
  vi.unstubAllGlobals();
});

describe('apiClient success hook → apiReachable', () => {
  it('fires on a 2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(200, { data: [], error: null })));

    await api.projects.list();

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire on a network rejection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(api.projects.list()).rejects.toBeInstanceOf(TypeError);

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does NOT fire on an HTTP error response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(500, errBody('INTERNAL_ERROR', 'boom'))));

    await expect(api.projects.list()).rejects.toMatchObject({ status: 500 });

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('skips telemetry POSTs (loop guard parity with reportApiFailure)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(200, { data: null, error: null })));

    await api.telemetry.postClientErrors([]);

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('is a no-op (no throw) when no handler is registered', async () => {
    setApiSuccessHandler(null);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(200, { data: [], error: null })));

    await expect(api.projects.list()).resolves.toBeDefined();
  });
});
