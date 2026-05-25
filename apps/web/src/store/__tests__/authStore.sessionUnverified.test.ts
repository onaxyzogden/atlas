/**
 * @vitest-environment happy-dom
 *
 * Locks the `sessionUnverified` flag that initFromStorage() raises when a
 * stored token exists but `/auth/me` fails for a TRANSIENT (non-auth) reason —
 * the signal that drives the ApiReachabilityBanner's boot-specific message.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useAuthStore } from '../authStore';

const TOKEN_KEY = 'ogden-auth-token';

// Minimal Response stand-in: apiClient.request() reads .ok, .status, .json().
const fakeResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as Response;

const errBody = (code: string, message: string) => ({ data: null, error: { code, message } });

beforeEach(() => {
  useAuthStore.setState({
    token: null,
    user: null,
    error: null,
    isLoaded: false,
    sessionUnverified: false,
  });
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('authStore.initFromStorage — sessionUnverified', () => {
  it('raises sessionUnverified and KEEPS the token on a transient network failure', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok-123');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await useAuthStore.getState().initFromStorage();

    const s = useAuthStore.getState();
    expect(s.sessionUnverified).toBe(true);
    expect(s.token).toBe('tok-123');
    expect(s.user).toBeNull();
    expect(s.isLoaded).toBe(true);
    // The token must survive a transient failure.
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok-123');
  });

  it('clears the token and leaves sessionUnverified false on a real 401', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok-123');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fakeResponse(401, errBody('UNAUTHORIZED', 'nope'))),
    );

    await useAuthStore.getState().initFromStorage();

    const s = useAuthStore.getState();
    expect(s.sessionUnverified).toBe(false);
    expect(s.token).toBeNull();
    expect(s.user).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('sets the user and leaves sessionUnverified false on success', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok-123');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        fakeResponse(200, {
          data: { id: 'u1', email: 'a@b.com', displayName: 'A', defaultOrgId: 'org1' },
          error: null,
        }),
      ),
    );

    await useAuthStore.getState().initFromStorage();

    const s = useAuthStore.getState();
    expect(s.sessionUnverified).toBe(false);
    expect(s.user).toMatchObject({ id: 'u1', email: 'a@b.com' });
  });

  it('login() success clears a previously-raised sessionUnverified', async () => {
    useAuthStore.setState({ sessionUnverified: true });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        fakeResponse(200, {
          data: {
            token: 'tok-new',
            user: { id: 'u1', email: 'a@b.com', displayName: 'A', defaultOrgId: 'org1' },
          },
          error: null,
        }),
      ),
    );

    await useAuthStore.getState().login('a@b.com', 'pw');

    expect(useAuthStore.getState().sessionUnverified).toBe(false);
  });
});
