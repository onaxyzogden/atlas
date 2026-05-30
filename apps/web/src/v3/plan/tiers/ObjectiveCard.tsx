// ObjectiveCard — compact row for a single tier objective inside
// ObjectiveColumn (Plan Navigation Spec v1, Slice 1.5). Surfaces the
// objective's focused question (one-line excerpt) and the current
// status pill. Click is owned by the parent so the same
// component can be used for navigation or selection.
//
// Slice 4.4 — outer is a div role="button" (instead of a real <button>)
// so the divergence pill can be a nested real <button> that deep-links
// to the Observe Domain Detail surface without HTML-validity warnings
// from a button-in-button structure. Keyboard handling (Enter/Space)
// preserves the prior accessibility contract.

import type { KeyboardEvent, MouseEvent } from 'react';
import { Check, Lock, RefreshCcw } from 'lucide-react';
import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import css from './ObjectiveCard.module.css';

interface Props {
  objective: PlanStratumObjective;
  status: PlanStratumObjectiveStatus;
  isActive: boolean;
  /**
   * Slice 2.4 — true while this card is being flashed (3s animation
   * driven by `?highlightIncomplete=s1`).
   */
  isHighlighting?: boolean;
  /**
   * Slice 3.5 + 4.4 — count of divergence flags filed against this
   * objective by Act (spec §6.4 "the parent objective surfaces a
   * divergence indicator"). Slice 4.4 widens the count to include
   * diverged ObserveDataPoints projected to the objective's mapped
   * domains. Rendered as an amber pill when > 0.
   */
  divergenceCount?: number;
  onSelect: (objective: PlanStratumObjective) => void;
  /**
   * Slice 4.4 — optional callback fired when the divergence pill is
   * clicked. Parents wire this to navigate to the matching Observe
   * Domain Detail surface. When omitted, the pill is purely visual.
   */
  onDivergenceClick?: (objective: PlanStratumObjective) => void;
}

const STATUS_LABEL: Record<PlanStratumObjectiveStatus, string> = {
  locked: 'Locked',
  available: 'Ready',
  active: 'In progress',
  complete: 'Complete',
};

export default function ObjectiveCard({
  objective,
  status,
  isActive,
  isHighlighting,
  divergenceCount = 0,
  onSelect,
  onDivergenceClick,
}: Props) {
  const hasDivergence = divergenceCount > 0;
  const baseLabel = `${objective.title}: ${STATUS_LABEL[status]}`;
  const ariaLabel = hasDivergence
    ? `${baseLabel} — ${divergenceCount} divergence flag${divergenceCount === 1 ? '' : 's'}`
    : baseLabel;
  const handleClick = () => onSelect(objective);
  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(objective);
    }
  };
  const handleDivergenceClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onDivergenceClick) onDivergenceClick(objective);
  };
  return (
    <div
      className={css.card}
      role="button"
      tabIndex={0}
      data-status={status}
      data-active={isActive}
      data-highlighting={isHighlighting ? 'true' : undefined}
      data-has-divergence={hasDivergence ? 'true' : undefined}
      onClick={handleClick}
      onKeyDown={handleKey}
      aria-label={ariaLabel}
    >
      <span className={css.icon} aria-hidden="true">
        {status === 'complete' ? (
          <Check size={14} strokeWidth={2.5} />
        ) : status === 'locked' ? (
          <Lock size={12} strokeWidth={2} />
        ) : (
          <span className={css.dot} />
        )}
      </span>
      <span className={css.body}>
        <span className={css.title}>{objective.focusedQuestion}</span>
      </span>
      <span className={css.trail}>
        {hasDivergence && (
          <button
            type="button"
            className={css.divergencePill}
            data-testid={`objective-divergence-flag-${objective.id}`}
            title={
              onDivergenceClick
                ? `${divergenceCount} divergence flag${divergenceCount === 1 ? '' : 's'} — open Observe Domain Detail`
                : `${divergenceCount} divergence flag${divergenceCount === 1 ? '' : 's'} from Act`
            }
            onClick={handleDivergenceClick}
            disabled={!onDivergenceClick}
            aria-label={`Open Observe domain detail for ${divergenceCount} divergence${divergenceCount === 1 ? '' : 's'}`}
          >
            <RefreshCcw size={10} strokeWidth={2.5} aria-hidden="true" />
            {divergenceCount} divergence{divergenceCount === 1 ? '' : 's'}
          </button>
        )}
        <span className={css.pill}>{STATUS_LABEL[status]}</span>
      </span>
    </div>
  );
}
