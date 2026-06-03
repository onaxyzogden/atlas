/**
 * ApiReachabilityStatus — header status chip shown when the backend API is
 * unreachable, or when a stored session could not be verified on boot.
 *
 * The visible surface of the API reachability system (the self-heal effects
 * live in the headless ApiReachabilityWatcher). Mounted in the persistent
 * AppShell header beside ProofSyncIndicator, so the warning is non-blocking
 * (it no longer floats as a fixed full-width banner that occludes the header
 * and toolbar). Two states, highest priority first:
 *   1. sessionUnverified — a stored token exists but `/auth/me` failed for a
 *      transient reason on boot (server down / still starting / dead origin).
 *   2. !apiReachable — a request hit a network-level rejection mid-session.
 *
 * Renders only while a problem is showing; hidden when healthy. The full message
 * lives in the `title`; the chip itself carries a short label + a manual Retry
 * button. Retry runs the shared `attemptApiRecovery` (which on success flips the
 * flags back, hiding the chip). Note: this chip is header-only — routes that
 * render no header (legacy /project/, /login, /showcase/*) show no on-screen
 * warning, but the watcher keeps recovery running globally so the chip reappears
 * the moment a header route mounts.
 */

import { useCallback, useState } from 'react';
import { CloudOff } from 'lucide-react';
import { useConnectivityStore } from '../store/connectivityStore.js';
import { useAuthStore } from '../store/authStore.js';
import { attemptApiRecovery } from '../lib/apiRecovery.js';
import css from './ApiReachabilityStatus.module.css';

export default function ApiReachabilityStatus() {
  const apiReachable = useConnectivityStore((s) => s.apiReachable);
  const sessionUnverified = useAuthStore((s) => s.sessionUnverified);
  const [retrying, setRetrying] = useState(false);

  const visible = sessionUnverified || !apiReachable;

  // Manual Retry: shared silent recovery, with a brief in-progress label.
  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      await attemptApiRecovery();
    } finally {
      setRetrying(false);
    }
  }, []);

  if (!visible) return null;

  const fullMessage = sessionUnverified
    ? "We couldn't verify your saved session — the server may be temporarily unreachable."
    : 'Can’t reach the server — some data may be unavailable or out of date.';
  const label = retrying ? 'Reconnecting…' : 'Server unreachable';

  return (
    <span
      className={css.status}
      role="status"
      data-testid="api-reachability-status"
      title={fullMessage}
    >
      <CloudOff size={12} strokeWidth={2} aria-hidden="true" />
      {label}
      <button
        type="button"
        className={css.retry}
        onClick={handleRetry}
        disabled={retrying}
      >
        {retrying ? 'Retrying…' : 'Retry'}
      </button>
    </span>
  );
}
