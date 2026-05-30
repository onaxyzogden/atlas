/**
 * ActObjectiveHeader — top of View A per spec §5.2.
 *
 * Renders the parent tier eyebrow, objective title, focused question, and
 * a status badge. The "Back to all tasks" control returns to View B
 * (the All Tasks Dashboard) while preserving the steward's place in the
 * surrounding shell.
 */

import { ArrowLeft } from 'lucide-react';
import type { PlanStratumObjective, PlanStratumObjectiveStatus } from '@ogden/shared';
import { getTierTitle } from './objectiveLookup.js';
import css from './ActObjectiveHeader.module.css';

interface Props {
  objective: PlanStratumObjective;
  status: PlanStratumObjectiveStatus;
  onBack: () => void;
}

const STATUS_LABEL: Record<PlanStratumObjectiveStatus, string> = {
  locked: 'Locked',
  available: 'Available',
  active: 'Active',
  complete: 'Complete',
};

export default function ActObjectiveHeader({ objective, status, onBack }: Props) {
  const tierTitle = getTierTitle(objective.stratumId);
  return (
    <header className={css.header}>
      <div className={css.backRow}>
        <button type="button" className={css.backBtn} onClick={onBack}>
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          <span>Back to all tasks</span>
        </button>
      </div>
      <div className={css.titleRow}>
        <div className={css.titleStack}>
          {tierTitle && <span className={css.eyebrow}>{tierTitle}</span>}
          <h1 className={css.title}>{objective.title}</h1>
          {objective.focusedQuestion && (
            <p className={css.subtitle}>{objective.focusedQuestion}</p>
          )}
        </div>
        <span className={css.statusBadge} data-status={status}>
          {STATUS_LABEL[status]}
        </span>
      </div>
    </header>
  );
}
