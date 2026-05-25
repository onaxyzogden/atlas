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
 * Recovery (both states): a manual **Retry** button, an automatic re-attempt
 * when the browser fires the `online` event, and a background **poll** while the
 * banner is showing (every 15s, plus immediately when the tab regains focus).
 * Retry re-runs `initFromStorage()`: a successful `/auth/me` sets the user
 * (clearing sessionUnverified) and the apiClient success hook flips
 * `apiReachable` back to true. With no stored token, recovery sends a lightweight
 * unauthenticated `/api/v1/health` ping and, on success, flips `apiReachable`
 * directly — no full page reload. (It sets the flag directly rather than leaning
 * on the apiClient success hook, which is wired only on the authed boot, never on
 * the showcase/no-token path.)
 *
 * The poll closes a gap the success hook and `online` event miss: a server-side
 * recovery (API restart) while the device stayed online and the app is idle —
 * especially on the no-token path — fires neither, so without it the banner would
 * linger until a manual Retry. The poll runs only while the banner is visible
 * (zero steady-state cost) and pauses on a hidden tab or an offline device.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useConnectivityStore } from '../store/connectivityStore.js';
import { useAuthStore } from '../store/authStore.js';
import { api } from '../lib/apiClient.js';
import styles from './ApiReachabilityBanner.module.css';

/** While the banner is showing a problem, re-check reachability on this cadence. */
const POLL_INTERVAL_MS = 15_000;

export default function ApiReachabilityBanner() {
  const apiReachable = useConnectivityStore((s) => s.apiReachable);
  const sessionUnverified = useAuthStore((s) => s.sessionUnverified);
  const [retrying, setRetrying] = useState(false);
  const inFlightRef = useRef(false);

  const visible = sessionUnverified || !apiReachable;

  // Silent recovery core shared by manual Retry, the `online` listener, and the
  // background poll. Reads the token fresh from the store (so interval closures
  // can't go stale) and guards against overlapping attempts.
  const attemptRecovery = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
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
        // here) and the banner auto-hides. On failure leave it false so the
        // banner persists. No full page reload.
        try {
          await api.health();
          useConnectivityStore.getState().setApiReachable(true);
        } catch {
          // Still unreachable — keep the banner up.
        }
      }
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  // Manual Retry: same recovery, but surface a brief in-progress label.
  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      await attemptRecovery();
    } finally {
      setRetrying(false);
    }
  }, [attemptRecovery]);

  // Auto-retry when the browser regains connectivity. Registered while the
  // banner is mounted (it always is); cleaned up defensively on unmount. Uses the
  // silent recovery (no "Retrying…" flash on automatic recovery).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onOnline() {
      // Only attempt recovery if we are currently showing a problem.
      const { apiReachable: reachable } = useConnectivityStore.getState();
      const { sessionUnverified: unverified } = useAuthStore.getState();
      if (unverified || !reachable) {
        void attemptRecovery();
      }
    }
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [attemptRecovery]);

  // Self-heal: while a problem is showing, poll reachability so the banner clears
  // even when no request fires and the device's connectivity never toggles (e.g.
  // a server-side API restart on the no-token/showcase path). Active only while
  // `visible`; the effect tears down — and so the poll self-terminates — the
  // moment recovery flips it false. Pauses on a hidden tab or an offline device
  // (the `online` event covers the offline→online edge), and re-checks
  // immediately when the tab regains focus rather than waiting for the next tick.
  useEffect(() => {
    if (!visible || typeof window === 'undefined') return;

    function pingIfActive() {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      void attemptRecovery();
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') void attemptRecovery();
    }

    const id = setInterval(pingIfActive, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [visible, attemptRecovery]);

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
