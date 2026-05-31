// SecondaryRemoveBlockedModal - shown when a steward tries to remove a
// secondary project type whose delta objectives have already started (OLOS
// Plan Navigation Spec v1.1 section 8.3). Removal is permitted only when none
// of the secondary's objectives are active, complete, or deferred; when one or
// more are, removal is blocked and this named alert lists exactly the blocking
// objectives (each a direct link into its spine detail).
//
// The "Mark as Deferred instead" action is the spec's prescribed alternative:
// it shelves those objectives (progress preserved, hidden from active work,
// dependents stay locked) and KEEPS the secondary. Removal stays blocked - the
// steward chooses to park the work, not discard it. Amber accent matches the
// secondary-driven treatment used across the Plan stage.

import { useEffect, useRef } from 'react';
import { Lock, X, ChevronRight } from 'lucide-react';
import type { PlanStratumObjectiveStatus } from '@ogden/shared';
import type { BlockingObjective } from './useSecondaryRemovePreview.js';
import css from './SecondaryRemoveBlockedModal.module.css';

interface Props {
  /** Label of the secondary type the steward tried to remove. */
  secondaryLabel: string;
  /** The objectives whose status (active/complete/deferred) blocks removal. */
  blockingObjectives: readonly BlockingObjective[];
  /** Deep-link into an objective's spine detail. */
  onNavigate: (objectiveId: string, stratumId: string) => void;
  /** Shelve every blocking objective as Deferred and dismiss. */
  onDefer: () => void;
  /** Dismiss without changing anything. */
  onDismiss: () => void;
}

const STATUS_LABEL: Record<PlanStratumObjectiveStatus, string> = {
  locked: 'Locked',
  available: 'Ready',
  active: 'In progress',
  complete: 'Complete',
  deferred: 'Deferred',
};

export default function SecondaryRemoveBlockedModal({
  secondaryLabel,
  blockingObjectives,
  onNavigate,
  onDefer,
  onDismiss,
}: Props) {
  const deferButtonRef = useRef<HTMLButtonElement | null>(null);
  const count = blockingObjectives.length;

  useEffect(() => {
    deferButtonRef.current?.focus();
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
      data-testid="plan-secondary-remove-blocked-backdrop"
    >
      <div
        className={css.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="secondary-remove-blocked-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="plan-secondary-remove-blocked-card"
      >
        <button
          type="button"
          className={css.close}
          onClick={onDismiss}
          aria-label="Close removal prompt"
          data-testid="plan-secondary-remove-blocked-close"
        >
          <X size={16} aria-hidden />
        </button>

        <div className={css.iconWrap} aria-hidden>
          <Lock size={20} />
        </div>

        <h2 className={css.title} id="secondary-remove-blocked-title">
          Cannot remove {secondaryLabel} yet
        </h2>
        <p className={css.copy}>
          {count === 1 ? 'This objective' : `${count} objectives`} tied to{' '}
          <strong className={css.strong}>{secondaryLabel}</strong>{' '}
          {count === 1 ? 'has' : 'have'} started, so removing it would discard
          that work. Mark{' '}
          {count === 1 ? 'it' : 'them'} as Deferred instead to shelve{' '}
          {count === 1 ? 'it' : 'them'} - your answers are kept and you can
          restore {count === 1 ? 'it' : 'them'} later. The project type stays.
        </p>

        <ul className={css.list}>
          {blockingObjectives.map(({ objective, status }) => (
            <li key={objective.id}>
              <button
                type="button"
                className={css.objectiveRow}
                onClick={() => onNavigate(objective.id, objective.stratumId)}
                data-testid="plan-secondary-remove-blocked-objective"
              >
                <span className={css.objectiveTitle}>{objective.title}</span>
                <span className={css.objectiveStatus}>
                  {STATUS_LABEL[status]}
                </span>
                <ChevronRight size={15} aria-hidden className={css.chevron} />
              </button>
            </li>
          ))}
        </ul>

        <div className={css.actions}>
          <button
            type="button"
            className={css.secondary}
            onClick={onDismiss}
            data-testid="plan-secondary-remove-blocked-cancel"
          >
            Cancel
          </button>
          <button
            ref={deferButtonRef}
            type="button"
            className={css.primary}
            onClick={onDefer}
            data-testid="plan-secondary-remove-blocked-defer"
          >
            Mark as Deferred instead
          </button>
        </div>
      </div>
    </div>
  );
}
