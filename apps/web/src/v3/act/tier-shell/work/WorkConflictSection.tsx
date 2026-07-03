/**
 * WorkConflictSection — the pinned "Needs your decision" section of the Act
 * work panel (ADR 2026-06-12-atlas-work-items-typed-record-transport, binding
 * UX requirement: per-record work-item conflicts surface WHERE THE WORK LIVES,
 * not only on the app-wide /conflicts page).
 *
 * Fetches `listRecordConflicts()` (active-project scoped inside syncService)
 * and shows ONLY `ogden-work-items` rows — other stores surface via toasts →
 * the SyncConflictsPage (/conflicts); the OfflineBanner that used to badge
 * them was unmounted from AppShell in 4895b07d. Each row shows the work item's
 * title and a yours-vs-server summary (due date + status), with Keep mine /
 * Keep server resolving through the same `resolveRecordConflict` seam as the
 * full page (which re-hydrates the store). A footer
 * link reaches the full side-by-side diff for anything the summary can't
 * settle. Renders nothing when there are no work-item conflicts.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { ConflictListItem, ConflictResolutionChoice } from '@ogden/shared';
import {
  listRecordConflicts,
  resolveRecordConflict,
} from '../../../../lib/syncService.js';
import { toast } from '../../../../components/Toast.js';
import styles from './ActWorkPanel.module.css';

const WORK_STORE_KEY = 'ogden-work-items';

interface WorkSideSummary {
  title: string | null;
  due: string | null;
  status: string | null;
}

/** Best-effort WorkItem summary from a conflict payload (either side may be
 *  null — e.g. a delete race); never throws on foreign shapes. */
function summarize(payload: unknown): WorkSideSummary {
  const rec = (payload ?? {}) as Record<string, unknown>;
  const due =
    typeof rec.scheduledEnd === 'string'
      ? rec.scheduledEnd
      : typeof rec.scheduledStart === 'string'
        ? rec.scheduledStart
        : null;
  return {
    title: typeof rec.title === 'string' ? rec.title : null,
    due: due ? due.slice(0, 10) : null,
    status: typeof rec.status === 'string' ? rec.status : null,
  };
}

function sideLabel(side: WorkSideSummary): string {
  if (side.title === null && side.due === null && side.status === null) {
    return 'no copy';
  }
  const parts: string[] = [];
  if (side.due) parts.push(`due ${side.due}`);
  if (side.status) parts.push(side.status);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

function ConflictRow({
  item,
  busy,
  onResolve,
}: {
  item: ConflictListItem;
  busy: boolean;
  onResolve: (item: ConflictListItem, choice: ConflictResolutionChoice) => void;
}) {
  const mine = summarize(item.localPayload);
  const server = summarize(item.serverPayload);
  const title = mine.title ?? server.title ?? item.recordId;

  return (
    <div className={styles.reviewRow} data-testid="work-conflict-row" data-busy={busy || undefined}>
      <div className={styles.rowMain}>
        <span className={styles.rowTitle}>{title}</span>
        <span className={styles.pill} data-tone="danger">
          conflict
        </span>
      </div>
      <div className={styles.rowMeta}>
        <span>Yours: {sideLabel(mine)}</span>
      </div>
      <div className={styles.rowMeta}>
        <span>Server: {sideLabel(server)}</span>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionBtn}
          data-variant="primary"
          disabled={busy}
          onClick={() => onResolve(item, 'keep_mine')}
        >
          {busy ? 'Resolving…' : 'Keep mine'}
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          disabled={busy}
          onClick={() => onResolve(item, 'keep_server')}
        >
          {busy ? 'Resolving…' : 'Keep server'}
        </button>
      </div>
    </div>
  );
}

export default function WorkConflictSection() {
  const [conflicts, setConflicts] = useState<ConflictListItem[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await listRecordConflicts();
        if (!cancelled) {
          setConflicts(list.filter((c) => c.storeKey === WORK_STORE_KEY));
        }
      } catch (err) {
        // Quiet here — sync toasts + the /conflicts page still cover the
        // failure path; an unreachable API shouldn't break the schedule.
        console.warn('[WORK] conflict list failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleResolve = useCallback(
    async (item: ConflictListItem, choice: ConflictResolutionChoice) => {
      setResolvingId(item.syncLogId);
      try {
        await resolveRecordConflict(item, choice);
        setConflicts((prev) => prev.filter((c) => c.syncLogId !== item.syncLogId));
        toast.success(
          choice === 'keep_mine'
            ? 'Kept your copy of the work item'
            : 'Adopted the server copy of the work item',
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Could not resolve the conflict',
        );
      } finally {
        setResolvingId(null);
      }
    },
    [],
  );

  if (conflicts.length === 0) return null;

  return (
    <div className={styles.section} data-testid="work-conflict-section">
      <div className={styles.sectionTitle} data-tone="danger">
        Needs your decision ({conflicts.length})
      </div>
      {conflicts.map((item) => (
        <ConflictRow
          key={item.syncLogId}
          item={item}
          busy={resolvingId === item.syncLogId}
          onResolve={(it, choice) => void handleResolve(it, choice)}
        />
      ))}
      <Link to="/conflicts" className={styles.conflictPageLink}>
        Compare full versions →
      </Link>
    </div>
  );
}
