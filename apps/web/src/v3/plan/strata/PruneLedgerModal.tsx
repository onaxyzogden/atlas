// PruneLedgerModal - steward-facing gated confirm dialog that compacts one
// project's observation ledger. It dry-runs a chronic-safe retention sweep
// (previewProjectPrune, pure) on open, surfaces what WILL be removed and what is
// always kept, then -- only after an explicit "I understand" tick -- executes
// the real prune (pruneProjectRecords). Both prune methods use the store
// default keepWithinCycles (OBSERVATION_LOG_RETENTION_CYCLES = 12).
//
// Owns no retention logic of its own: the store is the single source of truth
// for the partition, so the preview shown here is exactly what the confirm will
// apply. Mirrors PrimaryChangeModal's structure/styling (SecondaryAddModal
// shell classes) so it sits inside the current Plan aesthetic.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, X } from 'lucide-react';
import {
  useObservationLog,
  useObservationLogStore,
} from '../../../store/observationLogStore.js';
import shell from './SecondaryAddModal.module.css';
import own from './PruneLedgerModal.module.css';

interface Props {
  projectId: string;
  onClose: () => void;
}

export default function PruneLedgerModal({ projectId, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const total = useObservationLog(projectId).length;

  // Pure dry-run computed once on open (memoized on projectId). No mutation.
  const removable = useMemo(
    () =>
      useObservationLogStore.getState().previewProjectPrune(projectId).pruned
        .length,
    [projectId],
  );
  const retained = total - removable;

  const [understood, setUnderstood] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const canConfirm = understood && removable > 0 && result === null;

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
          <p className={shell.copy}>
            Compacting removes {removable} of {total} records. {retained} are
            kept.
          </p>
        )}

        <div className={shell.consequences}>
          <p className={shell.consequencesEyebrow}>Always kept</p>
          <ul className={shell.consequenceList}>
            <li className={shell.consequence}>Undated audit records</li>
            <li className={shell.consequence}>
              Records still contributing to a chronic verdict
            </li>
            <li className={shell.consequence}>
              The most recent 12 cycles in each season
            </li>
          </ul>
        </div>

        {removable === 0 && result === null && (
          <p data-testid="prune-nothing">
            Nothing to compact - the ledger is within retention.
          </p>
        )}

        {removable > 0 && result === null && (
          <div className={own.gates}>
            <label className={own.gateRow}>
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                data-testid="prune-understood"
              />
              <span>
                I understand this permanently removes {removable} outdated
                records.
              </span>
            </label>
          </div>
        )}

        {result !== null && (
          <p className={own.resultLine} data-testid="prune-result">
            Removed {result} records.
          </p>
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
