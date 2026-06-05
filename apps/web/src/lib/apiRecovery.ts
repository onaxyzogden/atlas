/**
 * apiRecovery — shared silent-recovery routine for the API reachability surface.
 *
 * Extracted verbatim from the former ApiReachabilityBanner so the headless
 * watcher (ApiReachabilityWatcher: `online` listener + 15s poll) and the header
 * chip (ApiReachabilityStatus: manual Retry) call ONE recovery core behind a
 * single in-flight lock. A module-level guard (replacing the old per-component
 * `inFlightRef`) prevents the watcher's poll and a manual Retry from overlapping.
 *
 * Logic (unchanged): read the token fresh from the store; if a token exists
 * re-verify the session via `initFromStorage()` (success sets the user, clearing
 * sessionUnverified, and the apiClient success hook flips apiReachable); with no
 * token, send a lightweight unauthenticated `/api/v1/health` ping and on success
 * flip `apiReachable` directly (the apiClient success hook is wired authed-only,
 * so don't rely on it on the showcase/no-token path). Failure is swallowed so the
 * problem state persists. No full page reload.
 */

import { useConnectivityStore } from '../store/connectivityStore.js';
import { useAuthStore } from '../store/authStore.js';
import { api } from './apiClient.js';

let inFlight = false;

export async function attemptApiRecovery(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    const token = useAuthStore.getState().token;
    if (token) {
      // Re-verify the session. On success the user is set (clears
      // sessionUnverified) and the apiClient success hook flips apiReachable.
      await useAuthStore.getState().initFromStorage();
    } else {
      // No stored token — send a lightweight unauthenticated reachability
      // ping. On success the server is back: flip the signal directly (the
      // apiClient success hook is wired authed-only, so don't rely on it
      // here) and the surface auto-hides. On failure leave it false so the
      // problem state persists. No full page reload.
      try {
        await api.health();
        useConnectivityStore.getState().setApiReachable(true);
      } catch {
        // Still unreachable — keep the problem state up.
      }
    }
  } finally {
    inFlight = false;
  }
}
