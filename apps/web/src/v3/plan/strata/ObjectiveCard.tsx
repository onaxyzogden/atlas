// ObjectiveCard — compact row for a single stratum objective inside
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
import { RefreshCcw, RotateCcw } from 'lucide-react';
import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { getSourceTag } from './sourceTag.js';
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
  /**
   * Plan Nav v1.1 §7 — true when this objective's cyclical review is due
   * (90-day clock elapsed or a forced trigger). Surfaces a small blue
   * "Review" badge. Complete-only by predicate, so it never lights up a
   * locked/active/available card.
   */
  reviewSuggested?: boolean;
  onSelect: (objective: PlanStratumObjective) => void;
  /**
   * Slice 4.4 — optional callback fired when the divergence pill is
   * clicked. Parents wire this to navigate to the matching Observe
   * Domain Detail surface. When omitted, the pill is purely visual.
   */
  onDivergenceClick?: (objective: PlanStratumObjective) => void;
  /**
   * Plan Nav v1.1 §8.3 — optional callback fired when the "Restore"
   * control on a `deferred` card is clicked. Parents wire this to
   * `undeferObjective`, returning the objective to the live status
   * engine. Only rendered when status is `deferred` and this is provided.
   */
  onRestore?: (objective: PlanStratumObjective) => void;
}

const STATUS_LABEL: Record<PlanStratumObjectiveStatus, string> = {
  locked: 'Locked',
  available: 'Ready',
  active: 'In progress',
  complete: 'Complete',
  deferred: 'Deferred',
};

export default function ObjectiveCard({
  objective,
  status,
  isActive,
  isHighlighting,
  divergenceCount = 0,
  reviewSuggested = false,
  onSelect,
  onDivergenceClick,
  onRestore,
}: Props) {
  const hasDivergence = divergenceCount > 0;
  const isDeferred = status === 'deferred';
  const sourceTag = getSourceTag(objective);
  const baseLabel = `${objective.title}: ${STATUS_LABEL[status]}`;
  const ariaParts = [baseLabel];
  if (hasDivergence) {
    ariaParts.push(
      `${divergenceCount} divergence flag${divergenceCount === 1 ? '' : 's'}`,
    );
  }
  if (reviewSuggested) ariaParts.push('review suggested');
  const ariaLabel = ariaParts.join(' — ');
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
  const handleRestoreClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onRestore) onRestore(objective);
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
      <span className={css.body}>
        <span className={css.title}>
          {objective.shortTitle ?? objective.title}
        </span>
      </span>
      <span className={css.trail}>
        <span
          className={css.sourceTag}
          data-source={sourceTag.kind}
          title={sourceTag.label}
        >
          {sourceTag.label}
        </span>
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
        {reviewSuggested && (
          <span className={css.reviewBadge} title="Review suggested">
            <RefreshCcw size={10} strokeWidth={2.5} aria-hidden="true" />
            Review
          </span>
        )}
        {isDeferred && onRestore && (
          <button
            type="button"
            className={css.restoreBtn}
            onClick={handleRestoreClick}
            data-testid={`objective-restore-${objective.id}`}
            title="Restore this objective to active planning"
            aria-label={`Restore ${objective.title}`}
          >
            <RotateCcw size={10} strokeWidth={2.5} aria-hidden="true" />
            Restore
          </button>
        )}
        <span className={css.pill}>{STATUS_LABEL[status]}</span>
      </span>
    </div>
  );
}
