/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { api, setApiClientErrorReporter, type ApiClientErrorReport } from '../apiClient';

// Minimal Response stand-in: request() reads .ok, .status, and .json().
const fakeResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as Response;

const errBody = (code: string, message: string) => ({ data: null, error: { code, message } });

let reporter: ReturnType<typeof vi.fn<(r: ApiClientErrorReport) => void>>;

beforeEach(() => {
  reporter = vi.fn();
  setApiClientErrorReporter(reporter);
});

afterEach(() => {
  setApiClientErrorReporter(null);
  vi.unstubAllGlobals();
});

describe('apiClient → api_client telemetry reporter', () => {
  it('reports a 5xx ApiError with status/code/method/path', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(500, errBody('INTERNAL_ERROR', 'boom'))));

    await expect(api.projects.list()).rejects.toMatchObject({ name: 'ApiError', status: 500 });

    expect(reporter).toHaveBeenCalledTimes(1);
    expect(reporter).toHaveBeenCalledWith({
      name: 'ApiError',
      message: 'boom',
      status: 500,
      code: 'INTERNAL_ERROR',
      method: 'GET',
      path: '/api/v1/projects',
    });
  });

  it('reports a 401 too (all-failures policy)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(401, errBody('UNAUTHORIZED', 'nope'))));

    await expect(api.projects.list()).rejects.toMatchObject({ status: 401 });

    expect(reporter).toHaveBeenCalledTimes(1);
    expect(reporter).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'ApiError', code: 'UNAUTHORIZED', status: 401 }),
    );
  });

  it('reports a network-error rejection (status 0) and re-throws the original error', async () => {
    const netErr = new TypeError('Failed to fetch');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(netErr));

    await expect(api.projects.list()).rejects.toBe(netErr);

    expect(reporter).toHaveBeenCalledTimes(1);
    expect(reporter).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'TypeError', code: 'NETWORK_ERROR', status: 0, method: 'GET' }),
    );
  });

  it('does NOT report a deliberate AbortError, but still re-throws it', async () => {
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortErr));

    await expect(api.projects.list()).rejects.toBe(abortErr);

    expect(reporter).not.toHaveBeenCalled();
  });

  it('loop guard: a failed telemetry POST is NOT reported', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(500, errBody('INTERNAL_ERROR', 'down'))));

    await expect(api.telemetry.postClientErrors([])).rejects.toMatchObject({ status: 500 });

    expect(reporter).not.toHaveBeenCalled();
  });

  it('is a no-op (no throw) when no reporter is registered', async () => {
    setApiClientErrorReporter(null);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(500, errBody('INTERNAL_ERROR', 'boom'))));

    // The request still rejects with the ApiError; the absent reporter must not
    // introduce a second throw.
    await expect(api.projects.list()).rejects.toMatchObject({ status: 500 });
  });
});

// Minimal XMLHttpRequest stand-in: files.upload uses open/setRequestHeader/
// upload.onprogress/onload/onerror/send/status/responseText. Each test assigns
// the static `onSend` hook to drive the desired outcome when send() fires.
class FakeXHR {
  status = 0;
  responseText = '';
  upload: { onprogress: ((e: ProgressEvent) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  static onSend: ((xhr: FakeXHR) => void) | null = null;
  open(): void {}
  setRequestHeader(): void {}
  send(): void {
    FakeXHR.onSend?.(this);
  }
}

describe('apiClient upload sites → api_client telemetry reporter', () => {
  it('files.upload (XHR): reports an ApiError on a non-2xx response', async () => {
    FakeXHR.onSend = (xhr) => {
      xhr.status = 500;
      xhr.responseText = JSON.stringify(errBody('INTERNAL_ERROR', 'upload boom'));
      xhr.onload?.();
    };
    vi.stubGlobal('XMLHttpRequest', FakeXHR);

    await expect(api.files.upload('p1', new File(['x'], 'a.txt'))).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
    });

    expect(reporter).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ApiError',
        code: 'INTERNAL_ERROR',
        status: 500,
        method: 'POST',
        path: '/api/v1/projects/p1/files',
      }),
    );
  });

  it('files.upload (XHR): reports a NETWORK_ERROR on xhr.onerror', async () => {
    FakeXHR.onSend = (xhr) => {
      xhr.onerror?.();
    };
    vi.stubGlobal('XMLHttpRequest', FakeXHR);

    await expect(api.files.upload('p1', new File(['x'], 'a.txt'))).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
    });

    expect(reporter).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'NETWORK_ERROR',
        status: 0,
        method: 'POST',
        path: '/api/v1/projects/p1/files',
      }),
    );
  });

  it('regenerationEvents.uploadMedia (fetch): reports an ApiError on a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(413, errBody('TOO_LARGE', 'too big'))));

    await expect(api.regenerationEvents.uploadMedia('p1', new File(['x'], 'a.png'))).rejects.toMatchObject({
      status: 413,
    });

    expect(reporter).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ApiError',
        code: 'TOO_LARGE',
        status: 413,
        method: 'POST',
        path: '/api/v1/projects/p1/regeneration-events/media',
      }),
    );
  });

  it('regenerationEvents.uploadMedia (fetch): reports a network rejection and re-throws the original error', async () => {
    const netErr = new TypeError('Failed to fetch');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(netErr));

    await expect(api.regenerationEvents.uploadMedia('p1', new File(['x'], 'a.png'))).rejects.toBe(netErr);

    expect(reporter).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'TypeError',
        code: 'NETWORK_ERROR',
        status: 0,
        method: 'POST',
        path: '/api/v1/projects/p1/regeneration-events/media',
      }),
    );
  });
});
