/**
 * Auth store — manages JWT token and current user.
 *
 * Token is persisted to localStorage under 'ogden-auth-token'.
 * On app startup call initFromStorage() once to restore a previous session.
 */

import { create } from 'zustand';
import { api, setAuthToken, ApiError, type ApiAuthUser } from '../lib/apiClient.js';

const TOKEN_KEY = 'ogden-auth-token';

/**
 * Maps a thrown auth error to the message shown on the login/register form.
 * A network-level fetch rejection (no response at all) surfaces as a raw
 * browser `TypeError` ("Failed to fetch" / "Load failed") — opaque to users.
 * Replace it with an actionable message; keep real server messages verbatim.
 */
function authErrorMessage(err: unknown, fallback: string): string {
  // Real server response (401/429/etc.) — show the API's own message.
  if (err instanceof ApiError) return err.message;
  // Network-level rejection: fetch threw before any response arrived
  // (server down, still starting, dead origin / stale offline shell, CORS, DNS).
  if (err instanceof TypeError) {
    return typeof navigator !== 'undefined' && !navigator.onLine
      ? 'You appear to be offline. Reconnect to the internet and try again.'
      : "Can't reach the server. It may be offline or still starting up — try reloading the page, or check back shortly.";
  }
  return err instanceof Error ? err.message : fallback;
}

interface AuthState {
  /** JWT bearer token, null when logged out */
  token: string | null;
  /** Authenticated user info, null when logged out */
  user: ApiAuthUser | null;
  /** True once initFromStorage() has finished (success or failure) */
  isLoaded: boolean;
  /** Non-null while a login/register request is in flight */
  error: string | null;
  /**
   * True when a stored token exists but `/auth/me` could NOT be verified on
   * boot for a transient reason (server down / still starting / dead origin) —
   * the token is kept but `user` is null. Drives the ApiReachabilityStatus
   * chip's boot-specific message + Retry (and the ApiReachabilityWatcher's
   * self-heal). Cleared once the session verifies, or on
   * an explicit login/register/logout.
   */
  sessionUnverified: boolean;

  /**
   * Call once on app startup.
   * Reads token from localStorage, verifies it with /auth/me, and
   * clears it if the token is expired or invalid.
   */
  initFromStorage: () => Promise<void>;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoaded: false,
  error: null,
  sessionUnverified: false,

  async initFromStorage() {
    try {
      const stored = localStorage.getItem(TOKEN_KEY);
      if (!stored) {
        set({ isLoaded: true, sessionUnverified: false });
        return;
      }

      // Inject token so the /me call is authenticated
      setAuthToken(stored);

      try {
        const { data } = await api.auth.me();
        set({
          token: stored,
          user: {
            id: data.id,
            email: data.email,
            displayName: data.displayName ?? null,
            defaultOrgId: data.defaultOrgId,
          },
          isLoaded: true,
          sessionUnverified: false,
        });
      } catch (err) {
        // Only nullify on a real auth rejection (401 / INVALID_TOKEN).
        // Transient network/server errors must NOT yank the just-set token
        // out from under concurrent in-flight authed requests — keep the
        // token in place and let the next call re-verify implicitly.
        const isAuthFailure =
          err instanceof ApiError &&
          (err.status === 401 || err.code === 'INVALID_TOKEN' || err.code === 'UNAUTHORIZED');

        if (isAuthFailure) {
          localStorage.removeItem(TOKEN_KEY);
          setAuthToken(null);
          set({ token: null, user: null, isLoaded: true, sessionUnverified: false });
        } else {
          // Transient — preserve token, leave user empty, mark loaded, and
          // flag the session as unverified so the banner can prompt a Retry.
          set({ token: stored, user: null, isLoaded: true, sessionUnverified: true });
        }
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  async login(email, password) {
    set({ error: null });
    try {
      const { data } = await api.auth.login(email, password);
      localStorage.setItem(TOKEN_KEY, data.token);
      setAuthToken(data.token);
      set({ token: data.token, user: data.user, error: null, sessionUnverified: false });
    } catch (err) {
      const msg = authErrorMessage(err, 'Login failed');
      set({ error: msg });
      throw err;
    }
  },

  async register(email, password, displayName) {
    set({ error: null });
    try {
      const { data } = await api.auth.register(email, password, displayName);
      localStorage.setItem(TOKEN_KEY, data.token);
      setAuthToken(data.token);
      set({ token: data.token, user: data.user, error: null, sessionUnverified: false });
    } catch (err) {
      const msg = authErrorMessage(err, 'Registration failed');
      set({ error: msg });
      throw err;
    }
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    set({ token: null, user: null, error: null, sessionUnverified: false });
  },

  clearError() {
    set({ error: null });
  },
}));
