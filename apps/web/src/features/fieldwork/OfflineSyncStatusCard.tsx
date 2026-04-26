/**
 * §24 OfflineSyncStatusCard — explicit sync-state surface for the
 * Fieldwork panel. Closes manifest item `offline-field-mode-sync`
 * (P2 planned → done).
 *
 * The FieldworkPanel header carries small Online/Offline + "N pending"
 * badges, but a steward halfway through a site visit needs more than a
 * badge: which entries are queued, by type, how old is the oldest one,
 * when did we last successfully reach the server, and is the sync engine
 * healthy or in an error state? This card answers all four on a single
 * surface that's visible from any tab.
 *
 * Pure presentation: reads connectivityStore (isOnline, lastSyncedAt,
 * pendingChanges, syncStatus) + fieldworkStore (entries, walkRoutes,
 * pendingUploads). No sync logic — that lives in syncService.
 */

import { useMemo } from 'react';
import { useConnectivityStore } from '../../store/connectivityStore.js';
import { useFieldworkStore } from '../../store/fieldworkStore.js';
import s from './OfflineSyncStatusCard.module.css';

interface Props {
  projectId: string;
}

interface PendingByType {
  notes: number;
  photos: number;
  audio: number;
  data: number;
}

const TYPE_LABELS: Record<keyof PendingByType, string> = {
  notes: 'Notes',
  photos: 'Photos',
  audio: 'Voice memos',
  data: 'Data points',
};

function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function OfflineSyncStatusCard({ projectId }: Props) {
  const isOnline = useConnectivityStore((st) => st.isOnline);
  const lastSyncedAt = useConnectivityStore((st) => st.lastSyncedAt);
  const syncStatus = useConnectivityStore((st) => st.syncStatus);
  const entries = useFieldworkStore((st) => st.entries);
  const walkRoutes = useFieldworkStore((st) => st.walkRoutes);
  const pendingUploads = useFieldworkStore((st) => st.pendingUploads);

  const summary = useMemo(() => {
    const pendingSet = new Set(pendingUploads);
    const projectEntries = entries.filter((e) => e.projectId === projectId);
    const pendingEntries = projectEntries.filter((e) => pendingSet.has(e.id));
    const projectRoutes = walkRoutes.filter((r) => r.projectId === projectId);
    const unsyncedRoutes = projectRoutes.filter((r) => r.completedAt === null);

    const byType: PendingByType = { notes: 0, photos: 0, audio: 0, data: 0 };
    let oldestTimestamp: string | null = null;

    for (const entry of pendingEntries) {
      const isNote =
        entry.noteType !== undefined ||
        entry.type === 'observation' ||
        entry.type === 'question' ||
        entry.type === 'issue';
      if (isNote) byType.notes += 1;
      else byType.data += 1;
      byType.photos += entry.photos.length;
      if (entry.audioDataUrl) byType.audio += 1;

      if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    }

    const totalQueued = pendingEntries.length + unsyncedRoutes.length;

    return {
      pendingCount: pendingEntries.length,
      routeCount: unsyncedRoutes.length,
      totalQueued,
      byType,
      oldestTimestamp,
      totalEntriesEver: projectEntries.length,
    };
  }, [entries, walkRoutes, pendingUploads, projectId]);

  const stateClass = !isOnline
    ? s.state_offline
    : syncStatus === 'syncing'
      ? s.state_syncing
      : syncStatus === 'error'
        ? s.state_error
        : summary.totalQueued > 0
          ? s.state_pending
          : s.state_clean;

  const stateWord = !isOnline
    ? 'Offline'
    : syncStatus === 'syncing'
      ? 'Syncing'
      : syncStatus === 'error'
        ? 'Sync error'
        : summary.totalQueued > 0
          ? 'Pending'
          : 'Synced';

  const stateSub = !isOnline
    ? 'Field entries are saved locally and will upload when connection returns.'
    : syncStatus === 'syncing'
      ? 'Uploading queued entries to the server.'
      : syncStatus === 'error'
        ? 'Last sync attempt failed. Check connection or retry.'
        : summary.totalQueued > 0
          ? `${summary.totalQueued} item${summary.totalQueued === 1 ? '' : 's'} waiting to upload.`
          : 'All field data is up to date with the server.';

  return (
    <div className={`${s.card} ${stateClass}`}>
      <div className={s.cardHead}>
        <div>
          <h3 className={s.cardTitle}>Offline & Sync Status</h3>
          <p className={s.cardHint}>
            Local-first field capture. Entries persist in the browser and
            upload opportunistically when online.
          </p>
        </div>
        <span className={s.heuristicBadge}>FIELD MODE</span>
      </div>

      {/* State strip */}
      <div className={s.stateStrip}>
        <div className={s.stateBlock}>
          <span className={s.stateDot} />
          <div className={s.stateTextCol}>
            <span className={s.stateWord}>{stateWord}</span>
            <span className={s.stateSub}>{stateSub}</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className={s.stats}>
        <div className={s.stat}>
          <span className={s.statLabel}>Last sync</span>
          <span className={s.statVal}>{formatRelative(lastSyncedAt)}</span>
          <span className={s.statNote}>
            {lastSyncedAt
              ? new Date(lastSyncedAt).toLocaleString()
              : 'no successful sync recorded'}
          </span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>Queued</span>
          <span className={s.statVal}>{summary.totalQueued}</span>
          <span className={s.statNote}>
            {summary.pendingCount} entr{summary.pendingCount === 1 ? 'y' : 'ies'}
            {summary.routeCount > 0
              ? ` + ${summary.routeCount} route${summary.routeCount === 1 ? '' : 's'}`
              : ''}
          </span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>Oldest in queue</span>
          <span className={s.statVal}>{formatRelative(summary.oldestTimestamp)}</span>
          <span className={s.statNote}>
            {summary.oldestTimestamp
              ? 'will retry on next online window'
              : 'queue is empty'}
          </span>
        </div>
      </div>

      {/* Per-type breakdown when queue is non-empty */}
      {summary.totalQueued > 0 && (
        <>
          <div className={s.sectionLabel}>Queue breakdown</div>
          <ul className={s.typeList}>
            {(Object.keys(TYPE_LABELS) as (keyof PendingByType)[]).map((key) => (
              <li key={key} className={s.typeRow}>
                <span className={s.typeLabel}>{TYPE_LABELS[key]}</span>
                <span
                  className={summary.byType[key] > 0 ? s.typeCount : s.typeCountZero}
                >
                  {summary.byType[key]}
                </span>
              </li>
            ))}
            {summary.routeCount > 0 && (
              <li className={s.typeRow}>
                <span className={s.typeLabel}>Walk routes (in progress)</span>
                <span className={s.typeCount}>{summary.routeCount}</span>
              </li>
            )}
          </ul>
        </>
      )}

      <p className={s.footnote}>
        <em>How sync works:</em> field entries are written to local
        storage immediately and queued for upload. The browser{'\''}s
        online/offline events plus a periodic retry drive the upload
        flush {'\u2014'} no manual action needed when connection returns.
        {summary.totalEntriesEver > 0 && (
          <> {summary.totalEntriesEver} total entr{summary.totalEntriesEver === 1 ? 'y' : 'ies'} captured for this project.</>
        )}
      </p>
    </div>
  );
}
