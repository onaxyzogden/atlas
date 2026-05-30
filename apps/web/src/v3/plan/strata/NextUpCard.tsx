// NextUpCard — featured next-best objective inside an active stratum
// (Plan Navigation Spec v1, Slice 1.5). Larger and louder than
// ObjectiveCard; the steward should land here first when entering a
// stratum. Hidden if the stratum has no `available` or `active` objective.

import { ArrowRight, RefreshCcw } from 'lucide-react';
import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { getSourceTag } from './sourceTag.js';
import css from './NextUpCard.module.css';

interface Props {
  objective: PlanStratumObjective;
  status: PlanStratumObjectiveStatus;
  /**
   * Slice 3.5 — count of divergence flags filed against this objective
   * by Act (spec §6.4). Surfaced as an amber pill alongside the status.
   */
  divergenceCount?: number;
  onSelect: (objective: PlanStratumObjective) => void;
}

const STATUS_LABEL: Record<PlanStratumObjectiveStatus, string> = {
  locked: 'Locked',
  available: 'Ready to start',
  active: 'In progress',
  complete: 'Complete',
};

export default function NextUpCard({
  objective,
  status,
  divergenceCount = 0,
  onSelect,
}: Props) {
  const hasDivergence = divergenceCount > 0;
  const sourceTag = getSourceTag(objective);
  return (
    <button
      type="button"
      className={css.card}
      data-status={status}
      data-has-divergence={hasDivergence ? 'true' : undefined}
      onClick={() => onSelect(objective)}
      aria-label={
        hasDivergence
          ? `Next up: ${objective.title} — ${divergenceCount} divergence flag${divergenceCount === 1 ? '' : 's'}`
          : `Next up: ${objective.title}`
      }
    >
      <div className={css.body}>
        <p className={css.eyebrow}>Next up</p>
        <h3 className={css.title}>{objective.focusedQuestion}</h3>
        <div className={css.pillRow}>
          <span className={css.sourceTag} data-source={sourceTag.kind}>
            {sourceTag.label}
          </span>
          <span className={css.statusPill}>{STATUS_LABEL[status]}</span>
          {hasDivergence && (
            <span
              className={css.divergencePill}
              data-testid={`objective-divergence-flag-${objective.id}`}
              title={`${divergenceCount} divergence flag${divergenceCount === 1 ? '' : 's'} from Act`}
            >
              <RefreshCcw size={11} strokeWidth={2.5} aria-hidden="true" />
              {divergenceCount} divergence{divergenceCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>
      <span className={css.cta} aria-hidden="true">
        <span>Open</span>
        <ArrowRight size={14} strokeWidth={2.5} />
      </span>
    </button>
  );
}
