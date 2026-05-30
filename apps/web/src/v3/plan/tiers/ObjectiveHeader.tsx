// ObjectiveHeader — the OBJECTIVE section header inside ObjectiveDetailPanel
// (Plan Navigation Spec v1, Slice 1.6). Tier breadcrumb on top, then the
// objective title and its focused question, then a status pill. Status colors
// mirror TierRow / ObjectiveCard so the spine, column, and panel all read
// the same state at a glance.

import { ArrowLeft } from 'lucide-react';
import type {
  PlanStratum,
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import css from './ObjectiveHeader.module.css';

interface Props {
  tier: PlanStratum;
  objective: PlanStratumObjective;
  status: PlanStratumObjectiveStatus;
  onBackToTier: (tier: PlanStratum) => void;
}

const STATUS_LABEL: Record<PlanStratumObjectiveStatus, string> = {
  locked: 'Locked',
  available: 'Ready',
  active: 'In progress',
  complete: 'Complete',
};

export default function ObjectiveHeader({
  tier,
  objective,
  status,
  onBackToTier,
}: Props) {
  return (
    <header className={css.header} data-status={status}>
      <button
        type="button"
        className={css.crumb}
        onClick={() => onBackToTier(tier)}
        aria-label={`Back to ${tier.title}`}
      >
        <ArrowLeft size={12} aria-hidden="true" />
        <span>
          Stratum {tier.ordinal} &middot; {tier.title}
        </span>
      </button>
      <h1 className={css.title}>{objective.title}</h1>
      <p className={css.question}>{objective.focusedQuestion}</p>
      <span className={css.pill} data-status={status}>
        {STATUS_LABEL[status]}
      </span>
    </header>
  );
}
