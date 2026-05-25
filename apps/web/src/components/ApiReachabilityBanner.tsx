/**
 * ApiReachabilityBanner — global sticky banner shown when the backend API is
 * unreachable, or when a stored session could not be verified on boot.
 *
 * Always mounted (in `main.tsx`, sibling of `RouterProvider`) so it is
 * independent of `FLAGS.OFFLINE_MODE` (which gates OfflineBanner). Two states,
 * highest priority first:
 *   1. sessionUnverified — a stored token exists but `/auth/me` failed for a
 *      transient reason on boot (server down / still starting / dead origin).
 *   2. !apiReachable — a request hit a network-level rejection mid-session.
 *
 * Recovery (both states): a manual **Retry** button and an automatic re-attempt
 * when the browser fires the `online` event. Retry re-runs `initFromStorage()`:
 * a successful `/auth/me` sets the user (clearing sessionUnverified) and the
 * apiClient success hook flips `apiReachable` back to true. With no stored
 * token, Retry falls back to a full reload (re-runs boot).
 */

import { useEffect, useState } from 'react';
import { useConnectivityStore } from '../store/connectivityStore.js';
import { useAuthStore } from '../store/authStore.js';
import styles from './ApiReachabilityBanner.module.css';

export default function ApiReachabilityBanner() {
  const apiReachable = useConnectivityStore((s) => s.apiReachable);
  const sessionUnverified = useAuthStore((s) => s.sessionUnverified);
  const token = useAuthStore((s) => s.token);
  const [retrying, setRetrying] = useState(false);

  const visible = sessionUnverified || !apiReachable;

  async function handleRetry() {
    if (retrying) return;
    setRetrying(true);
    try {
      if (token) {
        // Re-verify the session. On success the user is set (clears
        // sessionUnverified) and the apiClient success hook flips apiReachable.
        await useAuthStore.getState().initFromStorage();
      } else {
        // No stored token — there is no cheap authed probe to flip the signal;
        // a full reload re-runs boot and the next successful request recovers.
        if (typeof window !== 'undefined') window.location.reload();
      }
    } finally {
      setRetrying(false);
    }
  }

  // Auto-retry when the browser regains connectivity. Registered while the
  // banner is mounted (it always is); cleaned up defensively on unmount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onOnline() {
      // Only attempt recovery if we are currently showing a problem.
      const { apiReachable: reachable } = useConnectivityStore.getState();
      const { sessionUnverified: unverified } = useAuthStore.getState();
      if (unverified || !reachable) {
        void handleRetry();
      }
    }
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
    // handleRetry is stable enough for this listener; intentionally not in deps
    // to avoid re-registering on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  const message = sessionUnverified
    ? "We couldn't verify your saved session — the server may be temporarily unreachable."
    : 'Can’t reach the server — some data may be unavailable or out of date.';

  return (
    <div className={styles.banner} role="alert" data-testid="api-reachability-banner">
      <span className={styles.text}>{message}</span>
      <button
        type="button"
        className={styles.retry}
        onClick={handleRetry}
        disabled={retrying}
      >
        {retrying ? 'Retrying…' : 'Retry'}
      </button>
    </div>
  );
}
