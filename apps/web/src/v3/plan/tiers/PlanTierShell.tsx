// PlanTierShell — Phase 1 entry point for the OLOS Plan tier spine
// (Plan Navigation Spec v1). Slice 1.2 ships a placeholder that lists
// the 7 canonical tiers + their current roll-up state, so the steward
// can verify the toggle flips between this surface and the legacy
// module bar. Real TierSpine/TierRow/ObjectiveColumn UI lands in
// Slice 1.4-1.5; this file is then replaced rather than extended.

import {
  PLAN_TIERS,
  PLAN_TIER_OBJECTIVES,
  computeAllObjectiveStatuses,
  computeAllTierStates,
} from '@ogden/shared';
import type { PlanShellMode } from '../../../store/projectStore.js';
import PlanNavToggle from '../PlanNavToggle.js';
import css from './PlanTierShell.module.css';

interface Props {
  shellMode: PlanShellMode;
  onShellModeChange: (mode: PlanShellMode) => void;
}

export default function PlanTierShell({
  shellMode,
  onShellModeChange,
}: Props) {
  // Empty-progress preview: T0 objectives `available`, T1-T6 `locked`.
  // Slice 1.7 wires real checklist progress in via planTierStore.
  const objectiveStatuses = computeAllObjectiveStatuses(
    PLAN_TIER_OBJECTIVES,
    {},
  );
  const tierStates = computeAllTierStates(
    PLAN_TIERS.map((t) => t.id),
    PLAN_TIER_OBJECTIVES,
    objectiveStatuses,
  );

  return (
    <div className={css.shell}>
      <PlanNavToggle mode={shellMode} onChange={onShellModeChange} />
      <div className={css.intro}>
        <h2 className={css.title}>Plan tier spine</h2>
        <p className={css.subtitle}>
          7 tiers from foundation to phasing. Each tier unlocks once its
          prerequisites complete.
        </p>
      </div>
      <ol className={css.tierList}>
        {PLAN_TIERS.map((tier) => {
          const state = tierStates[tier.id] ?? 'locked';
          const count = PLAN_TIER_OBJECTIVES.filter(
            (o) => o.tierId === tier.id,
          ).length;
          return (
            <li key={tier.id} className={css.tier} data-state={state}>
              <span className={css.tierOrdinal}>T{tier.ordinal}</span>
              <span className={css.tierTitle}>{tier.title}</span>
              <span className={css.tierCount}>
                {count} objective{count === 1 ? '' : 's'}
              </span>
              <span className={css.tierState}>{state}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
