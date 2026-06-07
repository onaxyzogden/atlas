/**
 * OfflineBanner — persistent notification bar showing offline/sync state.
 *
 * Visible states (highest severity first):
 *   0. Dropped:  a change could not be saved after repeated retries (data risk)
 *   1. Conflict: a server-side newer version was rejected; local copy kept
 *   2. Offline:  warning-colored bar with last-synced timestamp
 *   3. Syncing:  info-colored bar with pending change count
 *   4. Pending:  subtle bar when online but queue has items
 *
 * Hidden when online with no pending changes, conflicts, or dropped ops.
 * Mounted at the top of AppShell (before header).
 */

import { selectMostRecentSync, useConnectivityStore } from '../store/connectivityStore.js';
import { formatDistanceToNow } from 'date-fns';
import { Link } from '@tanstack/react-router';
import styles from './OfflineBanner.module.css';

export default function OfflineBanner() {
  const isOnline = useConnectivityStore((s) => s.isOnline);
  const syncStatus = useConnectivityStore((s) => s.syncStatus);
  const pendingChanges = useConnectivityStore((s) => s.pendingChanges);
  const lastSyncedAt = useConnectivityStore(selectMostRecentSync);
  const conflictedStores = useConnectivityStore((s) => s.conflictedStores);
  const clearConflictedStore = useConnectivityStore((s) => s.clearConflictedStore);
  const droppedStores = useConnectivityStore((s) => s.droppedStores);
  const clearDroppedStore = useConnectivityStore((s) => s.clearDroppedStore);

  // ── Dropped (highest severity — a change could not be saved at all) ──
  if (droppedStores.length > 0) {
    const n = droppedStores.length;
    return (
      <div className={`${styles.banner} ${styles.conflict}`} role="alert" aria-live="assertive">
        <span className={styles.icon}>
          {/* AlertTriangle icon (inline SVG — no Lucide dependency) */}
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1={12} y1={9} x2={12} y2={13} />
            <line x1={12} y1={17} x2={12.01} y2={17} />
          </svg>
        </span>
        <span>
          {n} change{n !== 1 ? 's' : ''} could not be saved to the server — kept on this device
        </span>
        <span className={styles.chips}>
          {droppedStores.map((key) => (
            <button
              key={key}
              type="button"
              className={styles.chip}
              aria-label={`Dismiss ${key}`}
              onClick={() => clearDroppedStore(key)}
            >
              {key} ✕
            </button>
          ))}
        </span>
      </div>
    );
  }

  // ── Conflict (persists across online/offline) ──
  if (conflictedStores.length > 0) {
    const n = conflictedStores.length;
    return (
      <div className={`${styles.banner} ${styles.conflict}`} role="alert" aria-live="assertive">
        <span className={styles.icon}>
          {/* ShieldAlert icon (inline SVG — no Lucide dependency) */}
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1={12} y1={8} x2={12} y2={12} />
            <line x1={12} y1={16} x2={12.01} y2={16} />
          </svg>
        </span>
        <span>
          {n} store{n !== 1 ? 's' : ''} ha{n !== 1 ? 've' : 's'} a newer version on the server — your local copy is kept
        </span>
        <span className={styles.chips}>
          <Link to="/conflicts" className={styles.reviewLink}>
            Review &amp; resolve →
          </Link>
          {conflictedStores.map((key) => (
            <button
              key={key}
              type="button"
              className={styles.chip}
              aria-label={`Dismiss ${key}`}
              onClick={() => clearConflictedStore(key)}
            >
              {key} ✕
            </button>
          ))}
        </span>
      </div>
    );
  }

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
