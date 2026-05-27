// TierSpine — vertical column of 7 TierRows with a connecting line that
// threads through the spine dots (Plan Navigation Spec v1, Slice 1.4).
// The spine is the centrepiece of the Plan tier shell: it shows the
// stewardship arc T0 -> T6 + each tier's roll-up state and click
// behaviour. The parent (PlanTierShell) decides what tap-on-locked means
// so this component stays presentational.

import type {
  PlanTier,
  PlanTierObjective,
  PlanTierObjectiveStatus,
  PlanTierState,
} from '@ogden/shared';
import TierRow from './TierRow.js';
import css from './TierSpine.module.css';

interface Props {
  tiers: readonly PlanTier[];
  objectives: readonly PlanTierObjective[];
  objectiveStatuses: Readonly<Record<string, PlanTierObjectiveStatus>>;
  tierStates: Readonly<Record<string, PlanTierState>>;
  activeTierId: string | null;
  onSelectTier: (tier: PlanTier) => void;
}

export default function TierSpine({
  tiers,
  objectives,
  objectiveStatuses,
  tierStates,
  activeTierId,
  onSelectTier,
}: Props) {
  return (
    <ol className={css.spine} aria-label="Plan tier spine">
      <span className={css.spineLine} aria-hidden="true" />
      {tiers.map((tier) => {
        const tierObjectives = objectives.filter(
          (o) => o.tierId === tier.id,
        );
        const completeCount = tierObjectives.filter(
          (o) => objectiveStatuses[o.id] === 'complete',
        ).length;
        const state = tierStates[tier.id] ?? 'locked';
        return (
          <li key={tier.id} className={css.spineItem}>
            <TierRow
              tier={tier}
              state={state}
              objectiveCount={tierObjectives.length}
              completeCount={completeCount}
              isActive={tier.id === activeTierId}
              onSelect={onSelectTier}
            />
          </li>
        );
      })}
    </ol>
  );
}
