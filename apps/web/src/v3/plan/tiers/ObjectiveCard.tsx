// ObjectiveCard — compact row for a single tier objective inside
// ObjectiveColumn (Plan Navigation Spec v1, Slice 1.5). Surfaces the
// objective title, the focused question (one-line excerpt), and the
// current status pill. Click is owned by the parent so the same
// component can be used for navigation or selection.

import { Check, Lock } from 'lucide-react';
import type {
  PlanTierObjective,
  PlanTierObjectiveStatus,
} from '@ogden/shared';
import css from './ObjectiveCard.module.css';

interface Props {
  objective: PlanTierObjective;
  status: PlanTierObjectiveStatus;
  isActive: boolean;
  /**
   * Slice 2.4 — true while this card is being flashed (3s animation
   * driven by `?highlightIncomplete=t0`).
   */
  isHighlighting?: boolean;
  onSelect: (objective: PlanTierObjective) => void;
}

const STATUS_LABEL: Record<PlanTierObjectiveStatus, string> = {
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
  onSelect,
}: Props) {
  return (
    <button
      type="button"
      className={css.card}
      data-status={status}
      data-active={isActive}
      data-highlighting={isHighlighting ? 'true' : undefined}
      onClick={() => onSelect(objective)}
      aria-label={`${objective.title}: ${STATUS_LABEL[status]}`}
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
        <span className={css.title}>{objective.title}</span>
        <span className={css.question}>{objective.focusedQuestion}</span>
      </span>
      <span className={css.pill}>{STATUS_LABEL[status]}</span>
    </button>
  );
}
