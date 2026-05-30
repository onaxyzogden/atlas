// StratumSpine — vertical column of 7 StratumRows with a connecting line that
// threads through the spine dots (Plan Navigation Spec v1, Slice 1.4).
// The spine is the centrepiece of the Plan stratum shell: it shows the
// stewardship arc S1 -> S7 + each stratum's roll-up state and click
// behaviour. The parent (PlanStratumShell) decides what tap-on-locked means
// so this component stays presentational.

import type {
  PlanStratum,
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
  PlanStratumState,
} from '@ogden/shared';
import StratumRow from './StratumRow.js';
import css from './StratumSpine.module.css';

interface Props {
  strata: readonly PlanStratum[];
  objectives: readonly PlanStratumObjective[];
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
  stratumStates: Readonly<Record<string, PlanStratumState>>;
  activeStratumId: string | null;
  /**
   * Slice 2.4 — when set, the matching StratumRow renders a transient
   * flash ring to pull attention (wired by PlanStratumShell from the
   * `?highlightIncomplete=s1` deep link). Skipped silently when the
   * matching stratum is already complete.
   */
  highlightStratumId?: string | null;
  onSelectStratum: (stratum: PlanStratum) => void;
}

export default function StratumSpine({
  strata,
  objectives,
  objectiveStatuses,
  stratumStates,
  activeStratumId,
  highlightStratumId,
  onSelectStratum,
}: Props) {
  return (
    <ol className={css.spine} aria-label="Plan stratum spine">
      <span className={css.spineLine} aria-hidden="true" />
      {strata.map((stratum) => {
        const stratumObjectives = objectives.filter(
          (o) => o.stratumId === stratum.id,
        );
        const completeCount = stratumObjectives.filter(
          (o) => objectiveStatuses[o.id] === 'complete',
        ).length;
        const state = stratumStates[stratum.id] ?? 'locked';
        const isHighlighting =
          highlightStratumId === stratum.id && state !== 'complete';
        return (
          <li key={stratum.id} className={css.spineItem}>
            <StratumRow
              stratum={stratum}
              state={state}
              objectiveCount={stratumObjectives.length}
              completeCount={completeCount}
              isActive={stratum.id === activeStratumId}
              isHighlighting={isHighlighting}
              onSelect={onSelectStratum}
            />
          </li>
        );
      })}
    </ol>
  );
}
