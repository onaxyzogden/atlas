/**
 * ProofSyncIndicator — top-bar pill showing pending proof uploads count.
 * Driven by the shared connectivity store (the sync heartbeat keeps
 * `pendingChanges` in step with the IDB queue). "All synced" when empty.
 *
 * Lives on the Act layout top bar so the steward sees the lifecycle of
 * their captures without opening the Connectivity panel.
 */

import { CloudCheck, CloudOff, CloudUpload } from 'lucide-react';
import { useConnectivityStore } from '../../../../store/connectivityStore.js';
import css from './ProofCapture.module.css';

export default function ProofSyncIndicator() {
  const pending = useConnectivityStore((s) => s.pendingChanges);
  const status = useConnectivityStore((s) => s.syncStatus);
  const online = useConnectivityStore((s) => s.isOnline);

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
