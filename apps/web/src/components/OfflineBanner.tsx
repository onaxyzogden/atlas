/**
 * OfflineBanner — persistent notification bar showing offline/sync state.
 *
 * Three visible states:
 *   1. Offline:  warning-colored bar with last-synced timestamp
 *   2. Syncing:  info-colored bar with pending change count
 *   3. Pending:  subtle bar when online but queue has items
 *
 * Hidden when online with no pending changes.
 * Mounted at the top of AppShell (before header).
 */

import { useConnectivityStore } from '../store/connectivityStore.js';
import { formatDistanceToNow } from 'date-fns';
import styles from './OfflineBanner.module.css';

export default function OfflineBanner() {
  const isOnline = useConnectivityStore((s) => s.isOnline);
  const syncStatus = useConnectivityStore((s) => s.syncStatus);
  const pendingChanges = useConnectivityStore((s) => s.pendingChanges);
  const lastSyncedAt = useConnectivityStore((s) => s.lastSyncedAt);

  // ── Offline ──
  if (!isOnline) {
    const timeAgo = lastSyncedAt
      ? formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })
      : null;

    return (
      <div className={`${styles.banner} ${styles.offline}`} role="status" aria-live="polite">
        <span className={styles.icon}>
          {/* WifiOff icon (inline SVG — no Lucide dependency) */}
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1={2} y1={2} x2={22} y2={22} />
            <path d="M8.5 16.5a5 5 0 017 0" />
            <path d="M2 8.82a15 15 0 014.17-2.65" />
            <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
            <path d="M16.85 11.25a10 10 0 012.22 1.68" />
            <path d="M5 12.86a10 10 0 015.09-2.49" />
            <line x1={12} y1={20} x2={12.01} y2={20} />
          </svg>
        </span>
        <span>
          You are offline — changes are saved locally
          {timeAgo && (
            <span className={styles.timestamp}> (last synced {timeAgo})</span>
          )}
        </span>
      </div>
    );
  }

  // ── Syncing ──
  if (syncStatus === 'syncing' && pendingChanges > 0) {
    return (
      <div className={`${styles.banner} ${styles.syncing}`} role="status" aria-live="polite">
        <span className={`${styles.icon} ${styles.spinIcon}`}>
          {/* Loader icon */}
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 11-6.22-8.56" />
          </svg>
        </span>
        <span>Syncing {pendingChanges} change{pendingChanges !== 1 ? 's' : ''}...</span>
      </div>
    );
  }

  // ── Pending (online but has queued ops) ──
  if (pendingChanges > 0) {
    return (
      <div className={`${styles.banner} ${styles.pending}`} role="status" aria-live="polite">
        <span className={styles.icon}>
          {/* CloudOff icon */}
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 2l20 20" />
            <path d="M5.47 6.74A7 7 0 004 12.2a4 4 0 002.33 7.3h11.45" />
            <path d="M18.57 12.31a4 4 0 01.43 7.19" />
            <path d="M8.39 3.89A7 7 0 0119.8 10.2" />
          </svg>
        </span>
        <span>{pendingChanges} change{pendingChanges !== 1 ? 's' : ''} pending sync</span>
      </div>
    );
  }

  // ── All synced — hide banner ──
  return null;
}
