// LaunchActButton — bottom-anchored CTA on ObjectiveDetailPanel
// (Plan Navigation Spec v1, Slice 1.9). Surfaces only when the
// objective has an actionable handoff: `outputKind === 'plan-decision-record'`
// AND status is `active` or `complete`. Hidden while `locked` or
// `available` (no decision has been made yet, so there's nothing to
// hand off to Act).
//
// Phase 3 Slice 3.3 retargets the click to the new field-action
// View A scoped to this objective. Legacy command centre stays
// reachable via the in-Act shell toggle.

import { useNavigate } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import css from './LaunchActButton.module.css';

interface Props {
  projectId: string;
  objective: PlanStratumObjective;
  status: PlanStratumObjectiveStatus;
}

export default function LaunchActButton({
  projectId,
  objective,
  status,
}: Props) {
  const navigate = useNavigate();

  // Gate per spec: only plan-decision-record objectives produce a
  // handoff package, and the steward needs to have made meaningful
  // progress (`active`) or signed off (`complete`) before the button is
  // useful. Reference-doc / observation-record objectives never offer
  // this CTA.
  const eligible =
    objective.outputKind === 'plan-decision-record' &&
    (status === 'active' || status === 'complete');

  if (!eligible || !projectId) return null;

  const handleLaunch = () => {
    navigate({
      to: '/v3/project/$projectId/act/field-action/$objectiveId',
      params: { projectId, objectiveId: objective.id },
    });
  };

  const label = status === 'complete' ? 'Launch Act' : 'Continue in Act';

  return (
    <div className={css.dock}>
      <button
        type="button"
        className={css.button}
        onClick={handleLaunch}
        data-testid="plan-launch-act-button"
        data-status={status}
      >
        <span>{label}</span>
        <ArrowRight size={14} aria-hidden />
      </button>
    </div>
  );
}
