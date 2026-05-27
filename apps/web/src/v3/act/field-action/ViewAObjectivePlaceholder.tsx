/**
 * ViewAObjectivePlaceholder — Slice 3.2 placeholder for the
 * Objective Execution view. The real View A (left task list + active task
 * detail + Act Map View) lands in Slice 3.3 per spec §5.4.1
 * ("View A and the Act map view ship as a single unit").
 *
 * Confirms routing wiring (objective id resolved + back-nav works) and
 * gives the verification gate something to click without pretending the
 * full surface exists.
 */

import { ArrowLeft } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { findPlanTierObjective } from '@ogden/shared';
import css from './ViewAObjectivePlaceholder.module.css';

interface Props {
  projectId: string;
  objectiveId: string;
}

export default function ViewAObjectivePlaceholder({ projectId, objectiveId }: Props) {
  const navigate = useNavigate();
  const objective = findPlanTierObjective(objectiveId);

  return (
    <div className={css.scroll}>
      <div className={css.column}>
        <div className={css.backRow}>
          <button
            type="button"
            className={css.backBtn}
            onClick={() =>
              navigate({
                to: '/v3/project/$projectId/act/field-action',
                params: { projectId },
              })
            }
          >
            <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
            <span>Back to all tasks</span>
          </button>
        </div>
        <div className={css.header}>
          <span className={css.eyebrow}>Objective execution</span>
          <h1 className={css.title}>{objective?.title ?? objectiveId}</h1>
          {objective?.focusedQuestion ? (
            <p className={css.subtitle}>{objective.focusedQuestion}</p>
          ) : null}
        </div>
        <div className={css.note}>
          View A — full objective execution with the Act Map View — lands in
          Slice 3.3. For now, this placeholder confirms the route resolves and
          the back link returns to the All Tasks Dashboard. Proof capture and
          the Reality Diverges path arrive in slices 3.4 and 3.5.
        </div>
      </div>
    </div>
  );
}
