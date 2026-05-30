// SecondaryReopenModal - shown after a mid-project secondary addition that
// reopened one or more previously-complete objectives for review (OLOS Plan
// Navigation Spec v1.1 section 9). The named alert lists exactly the affected
// objectives - each a direct link into its spine detail - and explains that
// the new secondary injected fresh required items, so the steward's earlier
// answers stand but the objective needs another look. The single
// "I understand, continue" action records an append-only ReopeningAck.
//
// Reopening is a pure consequence of objective re-resolution (the injected
// required item is simply absent from the saved progress, dropping the status
// from complete to active) - no objective is force-cleared and no unrelated
// objective is touched. This modal only surfaces and acknowledges it.

import { useEffect, useRef } from 'react';
import { RefreshCw, X, ChevronRight } from 'lucide-react';
import type { PlanStratumObjective } from '@ogden/shared';
import css from './SecondaryReopenModal.module.css';

interface Props {
  /** Label of the secondary type that was just added. */
  secondaryLabel: string;
  /** The previously-complete objectives reopened by the addition. */
  objectives: readonly PlanStratumObjective[];
  /** Deep-link into an objective's spine detail. */
  onNavigate: (objectiveId: string, stratumId: string) => void;
  /** Record the acknowledgement and dismiss. */
  onContinue: () => void;
  /** Dismiss without acknowledging (handle it later). */
  onDismiss: () => void;
}

export default function SecondaryReopenModal({
  secondaryLabel,
  objectives,
  onNavigate,
  onContinue,
  onDismiss,
}: Props) {
  const continueButtonRef = useRef<HTMLButtonElement | null>(null);
  const count = objectives.length;

  useEffect(() => {
    continueButtonRef.current?.focus();
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
      data-testid="plan-secondary-reopen-backdrop"
    >
      <div
        className={css.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="secondary-reopen-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="plan-secondary-reopen-card"
      >
        <button
          type="button"
          className={css.close}
          onClick={onDismiss}
          aria-label="Close review prompt"
          data-testid="plan-secondary-reopen-close"
        >
          <X size={16} aria-hidden />
        </button>

        <div className={css.iconWrap} aria-hidden>
          <RefreshCw size={20} />
        </div>

        <h2 className={css.title} id="secondary-reopen-title">
          {count} decision{count === 1 ? '' : 's'} reopened for review
        </h2>
        <p className={css.copy}>
          Adding{' '}
          <strong className={css.strong}>{secondaryLabel}</strong> added new
          required items to {count === 1 ? 'this objective' : 'these objectives'}.
          Your earlier answers are kept - each just needs another look.
        </p>

        <ul className={css.list}>
          {objectives.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className={css.objectiveRow}
                onClick={() => onNavigate(o.id, o.stratumId)}
                data-testid="plan-secondary-reopen-objective"
              >
                <span className={css.objectiveTitle}>{o.title}</span>
                <ChevronRight size={15} aria-hidden className={css.chevron} />
              </button>
            </li>
          ))}
        </ul>

        <div className={css.actions}>
          <button
            ref={continueButtonRef}
            type="button"
            className={css.primary}
            onClick={onContinue}
            data-testid="plan-secondary-reopen-continue"
          >
            I understand, continue
          </button>
        </div>
      </div>
    </div>
  );
}
