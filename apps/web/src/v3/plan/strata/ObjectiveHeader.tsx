// ObjectiveHeader — the OBJECTIVE section header inside ObjectiveDetailPanel
// (Plan Navigation Spec v1, Slice 1.6). Stratum breadcrumb on top, then the
// objective title and its focused question, then a status pill. Status colors
// mirror StratumRow / ObjectiveCard so the spine, column, and panel all read
// the same state at a glance.

import { ArrowLeft } from 'lucide-react';
import type {
  PlanStratum,
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { getSourceTag } from './sourceTag.js';
import css from './ObjectiveHeader.module.css';

interface Props {
  stratum: PlanStratum;
  objective: PlanStratumObjective;
  status: PlanStratumObjectiveStatus;
  onBackToStratum: (stratum: PlanStratum) => void;
}

const STATUS_LABEL: Record<PlanStratumObjectiveStatus, string> = {
  locked: 'Locked',
  available: 'Ready',
  active: 'In progress',
  complete: 'Complete',
  deferred: 'Deferred',
};

export default function ObjectiveHeader({
  stratum,
  objective,
  status,
  onBackToStratum,
}: Props) {
  const sourceTag = getSourceTag(objective);
  return (
    <header className={css.header} data-status={status}>
      <button
        type="button"
        className={css.crumb}
        onClick={() => onBackToStratum(stratum)}
        aria-label={`Back to ${stratum.title}`}
      >
        <ArrowLeft size={12} aria-hidden="true" />
        <span>
          Stratum {stratum.ordinal} &middot; {stratum.title}
        </span>
      </button>
      <h1 className={css.title}>{objective.title}</h1>
      <p className={css.question}>{objective.focusedQuestion}</p>
      <div className={css.pillRow}>
        <span className={css.sourceTag} data-source={sourceTag.kind}>
          {sourceTag.label}
        </span>
        <span className={css.pill} data-status={status}>
          {STATUS_LABEL[status]}
        </span>
      </div>
    </header>
  );
}
