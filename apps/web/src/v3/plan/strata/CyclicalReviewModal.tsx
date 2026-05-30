// CyclicalReviewModal — confirmation overlay shown after the steward
// clicks "Confirm decision" on the CyclicalReviewBanner (Plan Navigation
// Spec v1 §3.6, Slice 1.11 — matches screenshot 3 "Decision confirmed").
//
// Stateless beyond focus management — the parent (ObjectiveDetailPanel)
// owns the "is the modal open?" boolean. Dismiss is the only outcome; the
// store mutation (`confirmDecision`) is fired by the banner before the
// modal mounts so a closed modal still leaves a clean confirmed record.

import { useEffect, useRef } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import type { PlanStratumObjective } from '@ogden/shared';
import css from './CyclicalReviewModal.module.css';

interface Props {
  objective: PlanStratumObjective;
  onDismiss: () => void;
}

export default function CyclicalReviewModal({ objective, onDismiss }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return (
    <div
      className={css.backdrop}
      role="presentation"
      onClick={onDismiss}
      data-testid="plan-cyclical-confirm-backdrop"
    >
      <div
        className={css.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cyclical-confirm-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="plan-cyclical-confirm-card"
      >
        <button
          type="button"
          className={css.close}
          onClick={onDismiss}
          aria-label="Close confirmation"
          data-testid="plan-cyclical-confirm-close"
        >
          <X size={16} aria-hidden />
        </button>

        <div className={css.iconWrap} aria-hidden>
          <CheckCircle2 size={22} />
        </div>

        <h2 className={css.title} id="cyclical-confirm-title">
          Decision confirmed
        </h2>
        <p className={css.copy}>
          Your decision for <strong className={css.strong}>{objective.title}</strong>{' '}
          still holds. We will check in again in 90 days.
        </p>

        <div className={css.actions}>
          <button
            ref={closeButtonRef}
            type="button"
            className={css.primary}
            onClick={onDismiss}
            data-testid="plan-cyclical-confirm-done"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
