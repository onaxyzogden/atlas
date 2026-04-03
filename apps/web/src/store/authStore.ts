/**
 * Auth store — manages JWT token and current user.
 *
 * Token is persisted to localStorage under 'ogden-auth-token'.
 * On app startup call initFromStorage() once to restore a previous session.
 */

import { create } from 'zustand';
import { api, setAuthToken, type ApiAuthUser } from '../lib/apiClient.js';

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
          user: { id: data.id, email: data.email, displayName: data.displayName ?? null },
          isLoaded: true,
        });
      } catch {
        // Token expired or invalid — clear it
        localStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
        set({ token: null, user: null, isLoaded: true });
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
