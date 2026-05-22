/**
 * Auth store — manages JWT token and current user.
 *
 * Token is persisted to localStorage under 'ogden-auth-token'.
 * On app startup call initFromStorage() once to restore a previous session.
 */

import { create } from 'zustand';
import { api, setAuthToken, ApiError, type ApiAuthUser } from '../lib/apiClient.js';

const TOKEN_KEY = 'ogden-auth-token';

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

  async initFromStorage() {
    try {
      const stored = localStorage.getItem(TOKEN_KEY);
      if (!stored) {
        set({ isLoaded: true });
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
          set({ token: null, user: null, isLoaded: true });
        } else {
          // Transient — preserve token, leave user empty, mark loaded.
          set({ token: stored, user: null, isLoaded: true });
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
      set({ token: data.token, user: data.user, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
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
      set({ token: data.token, user: data.user, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      set({ error: msg });
      throw err;
    }
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    set({ token: null, user: null, error: null });
  },

  clearError() {
    set({ error: null });
  },
}));
