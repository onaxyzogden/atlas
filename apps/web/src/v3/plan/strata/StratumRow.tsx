// StratumRow — single row in the Plan stratum spine (Plan Navigation Spec v1).
// Visualises one of the 7 strata with its ordinal badge, title, objective
// count summary, and a state pill driven by `computeStratumState`. Click
// behaviour is owned by the parent (StratumSpine) so the spine can hoist a
// shared locked-stratum popover instead of every row carrying its own.

import { Check, Lock } from 'lucide-react';
import type { PlanStratum, PlanStratumState } from '@ogden/shared';
import css from './StratumRow.module.css';

interface Props {
  stratum: PlanStratum;
  state: PlanStratumState;
  objectiveCount: number;
  completeCount: number;
  isActive: boolean;
  /**
   * Slice 2.4 — true while this row is being flashed (3s animation
   * driven by `?highlightIncomplete=s1`). Pure visual; click behaviour
   * is unchanged.
   */
  isHighlighting?: boolean;
  onSelect: (stratum: PlanStratum) => void;
}

const STATE_LABEL: Record<PlanStratumState, string> = {
  locked: 'Locked',
  available: 'Available',
  active: 'In progress',
  complete: 'Complete',
};

export default function StratumRow({
  stratum,
  state,
  objectiveCount,
  completeCount,
  isActive,
  isHighlighting,
  onSelect,
}: Props) {
  return (
    <button
      type="button"
      className={css.row}
      data-state={state}
      data-active={isActive}
      data-highlighting={isHighlighting ? 'true' : undefined}
      onClick={() => onSelect(stratum)}
      aria-expanded={isActive}
      aria-label={`${stratum.title}: ${STATE_LABEL[state]}, ${completeCount} of ${objectiveCount} objectives complete`}
    >
      <span className={css.spineDot} aria-hidden="true">
        {state === 'complete' ? (
          <Check size={12} strokeWidth={2.5} />
        ) : state === 'locked' ? (
          <Lock size={11} strokeWidth={2} />
        ) : (
          <span className={css.spineDotInner} />
        )}
      </span>
      <span className={css.ordinal}>S{stratum.ordinal}</span>
      <span className={css.body}>
        <span className={css.title}>{stratum.title}</span>
        <span className={css.summary}>
          {objectiveCount === 0
            ? 'No objectives yet'
            : `${completeCount} of ${objectiveCount} complete`}
        </span>
      </span>
      <span className={css.pill}>{STATE_LABEL[state]}</span>
    </button>
  );
}
