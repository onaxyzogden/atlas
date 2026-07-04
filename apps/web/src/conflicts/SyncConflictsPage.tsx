import { useCallback, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import type { ConflictListItem, ConflictResolutionChoice } from '@ogden/shared';
import { listRecordConflicts, resolveRecordConflict } from '../lib/syncService.js';
import { toast } from '../components/Toast.js';
import { useConnectivityStore } from '../store/connectivityStore.js';
import css from './SyncConflictsPage.module.css';

/**
 * ADR 7 Phase 4 — the dedicated, app-wide Sync Conflicts surface.
 *
 * Lists every escalated per-record conflict for the active project: records
 * whose local edit lost a last-write-wins race against a newer server version
 * and were *preserved* (the never-clobber envelope), awaiting a steward
 * decision. The steward resolves each by choosing:
 *   - Keep mine   → reinstate the local copy as a new authoritative rev
 *   - Keep server → accept the server copy; the local edit is discarded
 *
 * `syncService.resolveRecordConflict` converges local state. The active
 * project is resolved inside syncService — this page takes no params.
 * Reached from sync conflict toasts and the Act work panel's
 * WorkConflictSection footer link (the OfflineBanner that used to badge
 * conflicts was unmounted from AppShell in 4895b07d).
 *
 * DROPPED CHANGES (H2, deep-audit 2026-07-03): this page also lists
 * `connectivityStore.droppedStores` — ops the sync queue gave up on (MAX_RETRIES
 * exhausted, or a deterministic server rejection). A dropped op has already
 * left the IDB queue, so this set is the only remaining record of the lost
 * write; the header ProofSyncIndicator pill links here while any exist. There
 * is nothing to "resolve" server-side — the steward re-edits the record to
 * queue a fresh save, and dismisses the notice once handled.
 */

/** A `storeType:action:localId` coalescing key, split for display. The localId
 *  may itself contain ':' — everything past the second colon belongs to it. */
function parseOpKey(key: string): { storeType: string; action: string; localId: string } {
  const [storeType = '', action = '', ...rest] = key.split(':');
  return { storeType, action, localId: rest.join(':') };
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

function PayloadView({ payload }: { payload: unknown }) {
  let text: string;
  try {
    // JSON.stringify is typed `string` but returns undefined at runtime for
    // undefined input — widen, then coalesce, so neither tsc (no string-vs-
    // undefined comparison) nor lint (no unnecessary condition) complains.
    const json = JSON.stringify(payload, null, 2) as string | undefined;
    text = json ?? 'null';
  } catch {
    text = String(payload);
  }
  return <pre className={css.payload}>{text}</pre>;
}

export default function SyncConflictsPage() {
  const [items, setItems] = useState<ConflictListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const droppedKeys = useConnectivityStore((s) => s.droppedStores);
  const clearDroppedStore = useConnectivityStore((s) => s.clearDroppedStore);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await listRecordConflicts();
      setItems(list);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : 'Failed to load conflicts');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleResolve = useCallback(
    async (item: ConflictListItem, choice: ConflictResolutionChoice) => {
      setResolvingId(item.syncLogId);
      try {
        await resolveRecordConflict(item, choice);
        setItems((prev) => (prev ?? []).filter((c) => c.syncLogId !== item.syncLogId));
        toast.success(
          choice === 'keep_mine'
            ? `Kept your copy of ${item.storeKey}`
            : `Adopted the server copy of ${item.storeKey}`,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not resolve the conflict');
      } finally {
        setResolvingId(null);
      }
    },
    [],
  );

  const loading = items === null;
  const list = items ?? [];
  const n = list.length;

  return (
    <div className={css.page}>
      <header className={css.header}>
        <span className={css.eyebrow}>Connectivity</span>
        <h1 className={css.title}>Sync Conflicts</h1>
        <p className={css.lede}>
          These records were edited on this device and, before the change reached the server, a
          newer version arrived from elsewhere. Your local copy was preserved — never overwritten.
          Review each and choose which version to keep.
        </p>
      </header>

      {droppedKeys.length > 0 && (
        <section className={css.section}>
          <h2 className={css.sectionTitle}>
            Dropped changes <span className={css.count}>{droppedKeys.length}</span>
          </h2>
          <p className={css.droppedLede}>
            These changes could not be saved to the server — either repeated attempts failed or
            the server rejected them. Each is kept on this device only and will not retry on its
            own. Re-edit the record to queue a fresh save, then dismiss the notice.
          </p>
          <ul className={css.cardList}>
            {droppedKeys.map((key) => {
              const { storeType, action, localId } = parseOpKey(key);
              return (
                <li key={key} className={css.card}>
                  <div className={css.cardHead}>
                    <span className={css.storeTag}>
                      <span className={css.storeDot} />
                      {storeType}
                    </span>
                    <span className={css.recordId} title={key}>
                      {localId}
                    </span>
                  </div>
                  <p className={css.detectedAt}>
                    Unsaved <strong>{action}</strong> — kept on this device only.
                  </p>
                  <div className={css.actions}>
                    <button
                      type="button"
                      className={`${css.resolveBtn} ${css.keepServer}`}
                      onClick={() => clearDroppedStore(key)}
                    >
                      Dismiss
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {loading ? (
        <p className={css.empty}>Loading conflicts…</p>
      ) : error ? (
        <p className={css.empty} role="alert">
          {error}{' '}
          <button type="button" className={css.retry} onClick={() => void load()}>
            Retry
          </button>
        </p>
      ) : n === 0 ? (
        <p className={css.empty}>
          {droppedKeys.length > 0
            ? 'No open conflicts.' // dropped changes above mean we are NOT fully in sync
            : 'No open conflicts. Everything on this device is in sync with the server.'}{' '}
          <Link to="/home" className={css.homeLink}>
            Back to projects
          </Link>
        </p>
      ) : (
        <section className={css.section}>
          <h2 className={css.sectionTitle}>
            Open <span className={css.count}>{n}</span>
          </h2>
          <ul className={css.cardList}>
            {list.map((item) => {
              const busy = resolvingId === item.syncLogId;
              return (
                <li key={item.syncLogId} className={css.card} data-busy={busy}>
                  <div className={css.cardHead}>
                    <span className={css.storeTag}>
                      <span className={css.storeDot} />
                      {item.storeKey}
                    </span>
                    <span className={css.recordId} title={item.recordId}>
                      {item.recordId}
                    </span>
                  </div>
                  <p className={css.detectedAt}>Conflict detected {formatWhen(item.detectedAt)}</p>

                  <div className={css.diff}>
                    <div className={css.side}>
                      <div className={css.sideHead}>
                        <span className={css.sideLabel}>Your copy</span>
                        <span className={css.revTag}>rev {item.localRev ?? '—'}</span>
                      </div>
                      <p className={css.observedAt}>edited {formatWhen(item.observedAtLocal)}</p>
                      <PayloadView payload={item.localPayload} />
                    </div>
                    <div className={css.side}>
                      <div className={css.sideHead}>
                        <span className={css.sideLabel}>Server copy</span>
                        <span className={css.revTag}>rev {item.serverRev ?? '—'}</span>
                      </div>
                      <p className={css.observedAt}>updated {formatWhen(item.observedAtServer)}</p>
                      <PayloadView payload={item.serverPayload} />
                    </div>
                  </div>

                  <div className={css.actions}>
                    <button
                      type="button"
                      className={`${css.resolveBtn} ${css.keepMine}`}
                      disabled={busy}
                      onClick={() => void handleResolve(item, 'keep_mine')}
                    >
                      {busy ? 'Resolving…' : 'Keep mine'}
                    </button>
                    <button
                      type="button"
                      className={`${css.resolveBtn} ${css.keepServer}`}
                      disabled={busy}
                      onClick={() => void handleResolve(item, 'keep_server')}
                    >
                      {busy ? 'Resolving…' : 'Keep server'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
