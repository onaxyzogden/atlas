/**
 * ProofSyncIndicator -- global header pill showing pending proof uploads count.
 * Driven by the shared connectivity store (the sync heartbeat keeps
 * `pendingChanges` in step with the IDB queue). "All synced" when empty.
 *
 * Mounted in the persistent AppShell header so the steward sees the lifecycle
 * of their captures on every stage.
 *
 * DROPPED OPS (H2, deep-audit 2026-07-03): when the sync queue gives up on an
 * op (MAX_RETRIES exhausted, or a deterministic server rejection like a
 * placement violation), the op leaves the queue — `pendingChanges` returns to
 * 0 and this pill used to say "All synced" while a write was silently lost.
 * `droppedStores` is the only surviving record of that loss, so it OUTRANKS
 * every other branch here and turns the pill into a persistent error link to
 * /conflicts (the Sync Conflicts page lists and dismisses dropped changes;
 * the OfflineBanner that used to badge them was unmounted in 4895b07d).
 */

import { Link } from '@tanstack/react-router';
import { CloudAlert, CloudCheck, CloudOff, CloudUpload } from 'lucide-react';
import { useConnectivityStore } from '../store/connectivityStore.js';
import css from './ProofSyncIndicator.module.css';

export default function ProofSyncIndicator() {
  const pending = useConnectivityStore((s) => s.pendingChanges);
  const status = useConnectivityStore((s) => s.syncStatus);
  const online = useConnectivityStore((s) => s.isOnline);
  const dropped = useConnectivityStore((s) => s.droppedStores.length);

  if (dropped > 0) {
    const label = `${dropped} unsaved change${dropped === 1 ? '' : 's'}`;
    return (
      <Link
        to="/conflicts"
        className={css.syncIndicator}
        data-pending="false"
        data-syncing="false"
        data-error="true"
        data-dropped="true"
        data-testid="proof-sync-indicator"
        title={`${label} could not be saved to the server — kept on this device. Review under Sync Conflicts.`}
      >
        <CloudAlert size={12} strokeWidth={2} aria-hidden="true" />
        {label}
      </Link>
    );
  }

  const isSyncing = status === 'syncing';
  const hasPending = pending > 0;
  const isError = status === 'error';

  let label: string;
  let Icon = CloudCheck;
  if (!online && hasPending) {
    label = `Offline — ${pending} pending`;
    Icon = CloudOff;
  } else if (isSyncing) {
    label = `Syncing ${pending}…`;
    Icon = CloudUpload;
  } else if (hasPending) {
    label = `${pending} pending upload${pending === 1 ? '' : 's'}`;
    Icon = CloudUpload;
  } else if (isError) {
    label = 'Sync error';
    Icon = CloudOff;
  } else {
    label = 'All synced';
    Icon = CloudCheck;
  }

  return (
    <span
      className={css.syncIndicator}
      data-pending={hasPending ? 'true' : 'false'}
      data-syncing={isSyncing ? 'true' : 'false'}
      data-error={isError ? 'true' : 'false'}
      data-testid="proof-sync-indicator"
      title={label}
    >
      <Icon size={12} strokeWidth={2} aria-hidden="true" />
      {label}
    </span>
  );
}
