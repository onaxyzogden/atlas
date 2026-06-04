// PruneLedgerModal - steward-facing single-click confirm dialog that compacts
// one project's observation ledger using archive-not-erase semantics. It
// dry-runs a chronic-safe retention sweep (previewProjectPrune, pure) and
// surfaces what WILL be archived and what is always kept. A single Compact
// ledger click executes the archive (pruneProjectRecords) -- no permanent-
// removal gate or "I understand" checkbox, because no data is destroyed.
// Archived rows appear in the cold tier (archivedRecords) and can be restored
// in one click via the Restore affordance that appears after a successful
// compaction. Reversible: the steward can undo the compaction in-session.
//
// Owns no retention logic of its own: the store is the single source of truth
// for the partition, so the preview shown here is exactly what the confirm will
// apply. Mirrors PrimaryChangeModal's structure/styling (SecondaryAddModal
// shell classes) so it sits inside the current Plan aesthetic.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, X } from 'lucide-react';
import {
  useObservationLog,
  useArchivedLog,
  useObservationLogStore,
} from '../../../store/observationLogStore.js';
import { OBSERVATION_LOG_RETENTION_CYCLES } from '@ogden/shared';
import shell from './SecondaryAddModal.module.css';
import own from './PruneLedgerModal.module.css';

interface Props {
  projectId: string;
  onClose: () => void;
}

export default function PruneLedgerModal({ projectId, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const records = useObservationLog(projectId);
  const total = records.length;
  const archived = useArchivedLog(projectId);

  // Pure dry-run, recomputed whenever the project's active records change (after
  // an archive or a restore). previewProjectPrune never mutates. The getState()
  // snapshot is consistent with the `records` dependency here because the
  // observation store is never mutated inside a startTransition boundary -- every
  // archive/restore is a synchronous click handler, so the snapshot read and the
  // subscribed `records` slice always reflect the same store version.
  const removable = useMemo(
    () =>
      useObservationLogStore.getState().previewProjectPrune(projectId).pruned
        .length,
    [projectId, records],
  );
  const retained = total - removable;

  const [result, setResult] = useState<number | null>(null);

  const canConfirm = removable > 0 && result === null;

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className={shell.backdrop}
      role="presentation"
      onClick={onClose}
      data-testid="prune-ledger-backdrop"
    >
      <div
        className={shell.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prune-ledger-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="prune-ledger-card"
      >
        <button
          ref={closeButtonRef}
          type="button"
          className={shell.close}
          onClick={onClose}
          aria-label="Close compact ledger"
          data-testid="prune-ledger-close"
        >
          <X size={16} aria-hidden />
        </button>

        <div className={shell.iconWrap} aria-hidden>
          <Archive size={20} />
        </div>

        <h2 className={shell.title} id="prune-ledger-title">
          Compact observation ledger
        </h2>

        {result === null && (
          <>
            <p className={shell.copy}>
              Compacting archives {removable} of {total} records. {retained} are
              kept.
            </p>
            <p className={shell.copy}>
              Compaction keeps every undated and chronic-linked record, plus the{' '}
              {OBSERVATION_LOG_RETENTION_CYCLES} most recent rotation cycles in
              each season; older rotations are moved to the archive.
            </p>
          </>
        )}

        <div className={shell.consequences}>
          <p className={shell.consequencesEyebrow}>Always kept</p>
          <ul className={shell.consequenceList}>
            <li className={shell.consequence}>Undated audit records</li>
            <li className={shell.consequence}>
              Records still contributing to a chronic verdict
            </li>
            <li className={shell.consequence}>
              The most recent {OBSERVATION_LOG_RETENTION_CYCLES} rotation cycles
              within each season
            </li>
          </ul>
        </div>

        {removable === 0 && result === null && (
          <p data-testid="prune-nothing">
            Nothing to compact - the ledger is within retention.
          </p>
        )}

        {result !== null && (
          <p className={own.resultLine} data-testid="prune-result">
            Archived {result} records.
          </p>
        )}

        {archived.length > 0 && (
          <button
            type="button"
            className={shell.secondary}
            data-testid="prune-restore"
            onClick={() => {
              useObservationLogStore
                .getState()
                .restoreArchivedRecords(projectId);
              setResult(null);
            }}
          >
            Restore archived ({archived.length})
          </button>
        )}

        <div className={shell.actions}>
          <button
            type="button"
            className={shell.secondary}
            onClick={onClose}
            data-testid="prune-cancel"
          >
            Cancel
          </button>
          {result === null && removable > 0 && (
            <button
              type="button"
              className={shell.primary}
              disabled={!canConfirm}
              data-testid="prune-confirm"
              onClick={() => {
                if (!canConfirm) return;
                const pruned = useObservationLogStore
                  .getState()
                  .pruneProjectRecords(projectId);
                setResult(pruned.length);
              }}
            >
              Compact ledger
            </button>
          )}
          {result !== null && (
            <button
              type="button"
              className={shell.primary}
              onClick={onClose}
              data-testid="prune-done"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
