/**
 * NextUpCard — single highest-priority field action per spec §4.3.
 *
 * Visually dominant card at the top of View B with a large "Open task"
 * CTA. Priority winner is computed by `useFieldActions` (in_progress
 * first, then submitted-pending-verification, then not_started from the
 * lowest active tier).
 */

import { useNavigate } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type { FieldAction } from '@ogden/shared';
import { getObjectiveTitle, getTierTitle } from './objectiveLookup.js';
import css from './NextUpCard.module.css';

interface Props {
  projectId: string;
  action: FieldAction | undefined;
}

export default function NextUpCard({ projectId, action }: Props) {
  const navigate = useNavigate();
  if (!action) {
    return (
      <div className={css.empty}>
        <span className={css.emptyTitle}>Nothing queued</span>
        <span className={css.emptySub}>
          No active or ready field actions for this project yet.
        </span>
      </div>
    );
  }
  const tierTitle = getTierTitle(action.tierId);
  const objTitle = getObjectiveTitle(action.planObjectiveId);
  const reasonLabel =
    action.status === 'in_progress'
      ? 'In progress'
      : action.status === 'submitted'
        ? 'Pending verification'
        : 'Ready to start';

  const handleOpen = () => {
    navigate({
      to: '/v3/project/$projectId/act/field-action/$objectiveId',
      params: { projectId, objectiveId: action.planObjectiveId },
      search: { taskId: action.id },
    });
  };

  return (
    <div className={css.card}>
      <div className={css.eyebrow}>
        <span className={css.label}>Next up</span>
        <span className={css.reason}>{reasonLabel}</span>
      </div>
      <div className={css.title}>{action.title}</div>
      <div className={css.context}>
        {tierTitle && <span className={css.tierTag}>{tierTitle}</span>}
        {objTitle && <span className={css.objLine}>{objTitle}</span>}
      </div>
      <button type="button" className={css.cta} onClick={handleOpen}>
        <span>Open task</span>
        <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
