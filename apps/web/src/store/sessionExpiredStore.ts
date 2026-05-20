/**
 * sessionExpiredStore — global signal that the JWT has expired.
 *
 * Wired from `apiClient.setSessionExpiredHandler(...)` in `main.tsx`. When
 * the apiClient sees a 401 + UNAUTHORIZED|INVALID_TOKEN, it calls
 * `trigger()`, which (a) clears auth via `useAuthStore.logout()` and
 * (b) flips `isExpired = true`. The global `SessionExpiredBanner`
 * subscribes and renders.
 *
 * Idempotent while expired — repeated 401s during a single expiry event
 * are a no-op. `dismiss()` re-arms.
 */

import { create } from 'zustand';
import { useAuthStore } from './authStore.js';

interface SessionExpiredState {
  isExpired: boolean;
  trigger: () => void;
  dismiss: () => void;
}

export const useSessionExpiredStore = create<SessionExpiredState>((set, get) => ({
  isExpired: false,

  trigger() {
    if (get().isExpired) return;
    useAuthStore.getState().logout();
    set({ isExpired: true });
  },

  dismiss() {
    set({ isExpired: false });
  },
}));
