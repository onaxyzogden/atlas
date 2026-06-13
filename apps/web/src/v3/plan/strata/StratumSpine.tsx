// StratumSpine — vertical column of 7 StratumSpineCircles forming the LEFT rail
// of the Plan stratum shell (Plan Navigation Spec v1, Slice 1.4; re-skinned to
// the Plan Spine layout). The spine shows the stewardship arc S1 -> S7 + each
// stratum's roll-up state and click behaviour. The parent (PlanStratumShell)
// owns the surrounding 220px column chrome (header + progress footer) and
// decides what tap-on-locked means, so this component stays presentational —
// it renders only the scrollable list of organic stratum circles.

import type {
  PlanStratum,
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
  PlanStratumState,
} from '@ogden/shared';
import StratumSpineCircle from './StratumSpineCircle.js';

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
  /**
   * ADR 11 soft gate — stratum ids that are `locked` by state but contain a
   * previously-completed objective now accessible for review. Rendered as
   * amber accessible tiers rather than dimmed hard locks. Empty/omitted = no
   * soft gates (steady state).
   */
  softStratumIds?: ReadonlySet<string>;
  onSelectStratum: (stratum: PlanStratum) => void;
}

export default function StratumSpine({
  strata,
  objectives,
  objectiveStatuses,
  stratumStates,
  activeStratumId,
  highlightStratumId,
  softStratumIds,
  onSelectStratum,
}: Props) {
  return (
    <ol
      aria-label="Plan stratum spine"
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        listStyle: 'none',
        margin: 0,
        padding: '8px 6px',
      }}
    >
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
          <li key={stratum.id} style={{ margin: 0, padding: 0 }}>
            <StratumSpineCircle
              stratum={stratum}
              state={state}
              objectiveCount={stratumObjectives.length}
              completeCount={completeCount}
              isActive={stratum.id === activeStratumId}
              isHighlighting={isHighlighting}
              isSoftAccessible={softStratumIds?.has(stratum.id) ?? false}
              onSelect={onSelectStratum}
            />
          </li>
        );
      })}
    </ol>
  );
}
