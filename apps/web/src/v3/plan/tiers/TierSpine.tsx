// TierSpine — vertical column of 7 TierRows with a connecting line that
// threads through the spine dots (Plan Navigation Spec v1, Slice 1.4).
// The spine is the centrepiece of the Plan tier shell: it shows the
// stewardship arc S1 -> S7 + each tier's roll-up state and click
// behaviour. The parent (PlanTierShell) decides what tap-on-locked means
// so this component stays presentational.

import type {
  PlanStratum,
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
  PlanStratumState,
} from '@ogden/shared';
import TierRow from './TierRow.js';
import css from './TierSpine.module.css';

interface Props {
  tiers: readonly PlanStratum[];
  objectives: readonly PlanStratumObjective[];
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
  tierStates: Readonly<Record<string, PlanStratumState>>;
  activeTierId: string | null;
  /**
   * Slice 2.4 — when set, the matching TierRow renders a transient
   * flash ring to pull attention (wired by PlanTierShell from the
   * `?highlightIncomplete=s1` deep link). Skipped silently when the
   * matching tier is already complete.
   */
  highlightTierId?: string | null;
  onSelectTier: (tier: PlanStratum) => void;
}

export default function TierSpine({
  tiers,
  objectives,
  objectiveStatuses,
  tierStates,
  activeTierId,
  highlightTierId,
  onSelectTier,
}: Props) {
  return (
    <ol className={css.spine} aria-label="Plan stratum spine">
      <span className={css.spineLine} aria-hidden="true" />
      {tiers.map((tier) => {
        const stratumObjectives = objectives.filter(
          (o) => o.stratumId === tier.id,
        );
        const completeCount = stratumObjectives.filter(
          (o) => objectiveStatuses[o.id] === 'complete',
        ).length;
        const state = tierStates[tier.id] ?? 'locked';
        const isHighlighting =
          highlightTierId === tier.id && state !== 'complete';
        return (
          <li key={tier.id} className={css.spineItem}>
            <TierRow
              tier={tier}
              state={state}
              objectiveCount={stratumObjectives.length}
              completeCount={completeCount}
              isActive={tier.id === activeTierId}
              isHighlighting={isHighlighting}
              onSelect={onSelectTier}
            />
          </li>
        );
      })}
    </ol>
  );
}
