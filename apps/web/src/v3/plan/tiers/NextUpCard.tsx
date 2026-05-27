// NextUpCard — featured next-best objective inside an active tier
// (Plan Navigation Spec v1, Slice 1.5). Larger and louder than
// ObjectiveCard; the steward should land here first when entering a
// tier. Hidden if the tier has no `available` or `active` objective.

import { ArrowRight } from 'lucide-react';
import type {
  PlanTierObjective,
  PlanTierObjectiveStatus,
} from '@ogden/shared';
import css from './NextUpCard.module.css';

interface Props {
  objective: PlanTierObjective;
  status: PlanTierObjectiveStatus;
  onSelect: (objective: PlanTierObjective) => void;
}

const STATUS_LABEL: Record<PlanTierObjectiveStatus, string> = {
  locked: 'Locked',
  available: 'Ready to start',
  active: 'In progress',
  complete: 'Complete',
};

export default function NextUpCard({ objective, status, onSelect }: Props) {
  return (
    <button
      type="button"
      className={css.card}
      data-status={status}
      onClick={() => onSelect(objective)}
      aria-label={`Next up: ${objective.title}`}
    >
      <div className={css.body}>
        <p className={css.eyebrow}>Next up</p>
        <h3 className={css.title}>{objective.title}</h3>
        <p className={css.question}>{objective.focusedQuestion}</p>
        <span className={css.statusPill}>{STATUS_LABEL[status]}</span>
      </div>
      <span className={css.cta} aria-hidden="true">
        <span>Open</span>
        <ArrowRight size={14} strokeWidth={2.5} />
      </span>
    </button>
  );
}
