/**
 * FieldActionCard — single field action row per spec §4.4.
 *
 * Visual elements: title, parent objective label, status badge, proof
 * progress (`m / n proof items`), assignee count, divergence indicator.
 * Tapping opens View A scoped to that task — Slice 3.3 wires the actual
 * navigation; this slice routes to View A's route path which renders a
 * placeholder.
 */

import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle, Loader2, Lock } from 'lucide-react';
import type { FieldAction, FieldActionStatus } from '@ogden/shared';
import { requiredSlotsFor } from '@ogden/shared';
import { getObjectiveTitle } from './objectiveLookup.js';
import css from './FieldActionCard.module.css';

interface Props {
  projectId: string;
  action: FieldAction;
  /** Hide the parent-objective sub-line when the parent section already groups by it. */
  hideObjectiveLine?: boolean;
}

const STATUS_LABEL: Record<FieldActionStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  submitted: 'Submitted',
  verified: 'Verified',
  diverged: 'Diverged',
  blocked: 'Blocked',
};

export default function FieldActionCard({ projectId, action, hideObjectiveLine }: Props) {
  const navigate = useNavigate();
  const required = requiredSlotsFor(action.proofSchemaId);
  const filled = action.proofItems.filter(
    (p) => p.slotId && required.includes(p.slotId),
  ).length;
  const progress = required.length > 0 ? `${filled} / ${required.length} proof items` : 'No proof required';
  const assigneeCount = action.assignedTo?.length ?? 0;

  const handleOpen = () => {
    navigate({
      to: '/v3/project/$projectId/act/field-action/$objectiveId',
      params: { projectId, objectiveId: action.planObjectiveId },
      search: { taskId: action.id },
    });
  };

  return (
    <button
      type="button"
      className={css.card}
      data-status={action.status}
      onClick={handleOpen}
    >
      <div className={css.head}>
        <span className={css.title}>{action.title}</span>
        <span className={css.statusBadge} data-status={action.status}>
          {STATUS_LABEL[action.status]}
        </span>
      </div>
      {!hideObjectiveLine && (
        <div className={css.objectiveLine}>
          {getObjectiveTitle(action.planObjectiveId) ?? action.planObjectiveId}
        </div>
      )}
      <div className={css.metaRow}>
        <span className={css.progress}>{progress}</span>
        {assigneeCount > 0 && (
          <span className={css.assignees} title={`${assigneeCount} assignee(s)`}>
            {assigneeCount} assignee{assigneeCount === 1 ? '' : 's'}
          </span>
        )}
        {action.status === 'diverged' && action.divergenceFlag && (
          <span className={css.divergeChip}>
            <AlertTriangle size={11} strokeWidth={1.75} aria-hidden="true" />
            <span>{action.divergenceFlag.type.replace(/_/g, ' ')}</span>
          </span>
        )}
        {action.status === 'blocked' && (
          <span className={css.blockedChip}>
            <Lock size={11} strokeWidth={1.75} aria-hidden="true" />
            <span>Blocked</span>
          </span>
        )}
        {action.status === 'in_progress' && (
          <span className={css.inProgressChip}>
            <Loader2 size={11} strokeWidth={1.75} aria-hidden="true" />
            <span>Working</span>
          </span>
        )}
      </div>
    </button>
  );
}
