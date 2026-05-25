/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useAuthStore } from '../authStore';

// Minimal Response stand-in: apiClient.request() reads .ok, .status, .json().
const fakeResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as Response;

const errBody = (code: string, message: string) => ({ data: null, error: { code, message } });

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true });
}

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null, error: null });
  setOnline(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  setOnline(true);
});

describe('authStore.login — network-error message mapping', () => {
  it('maps a fetch TypeError (online) to a "can\'t reach the server" message, not the raw error', async () => {
    const netErr = new TypeError('Failed to fetch');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(netErr));

    await expect(useAuthStore.getState().login('a@b.com', 'pw')).rejects.toBe(netErr);

    const { error } = useAuthStore.getState();
    expect(error).not.toBe('Failed to fetch');
    expect(error).toContain("Can't reach the server");
  });

  it('maps a fetch TypeError (offline) to an offline message', async () => {
    setOnline(false);
    const netErr = new TypeError('Failed to fetch');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(netErr));

    await expect(useAuthStore.getState().login('a@b.com', 'pw')).rejects.toBe(netErr);

    expect(useAuthStore.getState().error).toContain('offline');
  });

  it('preserves the server message verbatim on a 401 (ApiError)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fakeResponse(401, errBody('UNAUTHORIZED', 'Invalid email or password'))),
    );

    await expect(useAuthStore.getState().login('a@b.com', 'pw')).rejects.toMatchObject({ status: 401 });

    expect(useAuthStore.getState().error).toBe('Invalid email or password');
  });
});

describe('authStore.register — network-error message mapping', () => {
  it('maps a fetch TypeError (online) to a "can\'t reach the server" message', async () => {
    const netErr = new TypeError('Failed to fetch');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(netErr));

    await expect(useAuthStore.getState().register('a@b.com', 'pw')).rejects.toBe(netErr);

    expect(useAuthStore.getState().error).toContain("Can't reach the server");
  });
});
