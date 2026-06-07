/**
 * ApiReachabilityWatcher — headless global self-heal for API reachability.
 *
 * Always mounted (in `main.tsx`, sibling of `RouterProvider`) so the recovery
 * machinery runs on every route — including login/showcase — independent of
 * `FLAGS.OFFLINE_MODE`. Renders nothing; the visible warning is the header chip
 * `ApiReachabilityStatus`. Split out from the former ApiReachabilityBanner so the
 * self-heal effects keep running globally even on routes that render no header.
 *
 * Two recovery triggers (both call the shared `attemptApiRecovery`, which holds
 * the module-level in-flight lock):
 *   1. the browser `online` event — re-attempts when a problem is showing
 *      (sessionUnverified || !apiReachable);
 *   2. a background poll (every 15s) while a problem is showing, plus an
 *      immediate re-check when the tab regains focus.
 *
 * The poll closes a gap the success hook and `online` event miss: a server-side
 * recovery (API restart) while the device stayed online and the app is idle —
 * especially on the no-token path — fires neither, so without it the warning
 * would linger until a manual Retry. The poll runs only while a problem is
 * visible (zero steady-state cost) and pauses on a hidden tab or offline device.
 */

import { useEffect } from 'react';
import { useConnectivityStore } from '../store/connectivityStore.js';
import { useAuthStore } from '../store/authStore.js';
import { attemptApiRecovery } from '../lib/apiRecovery.js';

/** While a problem is showing, re-check reachability on this cadence. */
const POLL_INTERVAL_MS = 15_000;

export default function ApiReachabilityWatcher(): null {
  const apiReachable = useConnectivityStore((s) => s.apiReachable);
  const sessionUnverified = useAuthStore((s) => s.sessionUnverified);

  const visible = sessionUnverified || !apiReachable;

  // Auto-retry when the browser regains connectivity. Registered while the
  // watcher is mounted (it always is); cleaned up defensively on unmount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onOnline() {
      // Only attempt recovery if we are currently showing a problem.
      const { apiReachable: reachable } = useConnectivityStore.getState();
      const { sessionUnverified: unverified } = useAuthStore.getState();
      if (unverified || !reachable) {
        void attemptApiRecovery();
      }
    }
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  // Self-heal: while a problem is showing, poll reachability so the warning
  // clears even when no request fires and the device's connectivity never
  // toggles (e.g. a server-side API restart on the no-token/showcase path).
  // Active only while `visible`; the effect tears down — and so the poll
  // self-terminates — the moment recovery flips it false. Pauses on a hidden tab
  // or an offline device (the `online` event covers the offline→online edge),
  // and re-checks immediately when the tab regains focus.
  useEffect(() => {
    if (!visible || typeof window === 'undefined') return;

    function pingIfActive() {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      void attemptApiRecovery();
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') void attemptApiRecovery();
    }

    const id = setInterval(pingIfActive, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [visible]);

  return null;
}
