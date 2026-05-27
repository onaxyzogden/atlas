// PlanTierShell — entry point for the OLOS Plan tier spine (Plan
// Navigation Spec v1). Slice 1.4 wires the real TierSpine + TierRow +
// TierLockedPopover into the placeholder shipped in Slice 1.2 so
// stewards can navigate between tiers + see what unlocks each one.
// ObjectiveColumn / detail panel land in Slices 1.5-1.6.

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  PLAN_TIERS,
  PLAN_TIER_OBJECTIVES,
  computeAllObjectiveStatuses,
  computeAllTierStates,
  findPlanTier,
  findPlanTierObjective,
} from '@ogden/shared';
import type { PlanTier } from '@ogden/shared';
import type { PlanShellMode } from '../../../store/projectStore.js';
import PlanNavToggle from '../PlanNavToggle.js';
import TierSpine from './TierSpine.js';
import TierLockedPopover from './TierLockedPopover.js';
import css from './PlanTierShell.module.css';

interface Props {
  shellMode: PlanShellMode;
  onShellModeChange: (mode: PlanShellMode) => void;
}

export default function PlanTierShell({
  shellMode,
  onShellModeChange,
}: Props) {
  const navigate = useNavigate();
  // Slice 1.3 routes — `plan/tier/$tierId` and
  // `plan/tier/$tierId/objective/$objectiveId`. Read loosely so the same
  // shell mounts at the bare `plan` route too.
  const params = useParams({ strict: false }) as {
    projectId?: string;
    tierId?: string;
    objectiveId?: string;
  };
  const projectId = params.projectId ?? '';
  const activeTierId = params.tierId ?? null;
  const activeObjective = params.objectiveId
    ? (findPlanTierObjective(params.objectiveId) ?? null)
    : null;

  // Empty-progress preview: T0 objectives `available`, T1-T6 `locked`.
  // Slice 1.7 wires real checklist progress in via planTierStore.
  const objectiveStatuses = useMemo(
    () => computeAllObjectiveStatuses(PLAN_TIER_OBJECTIVES, {}),
    [],
  );
  const tierStates = useMemo(
    () =>
      computeAllTierStates(
        PLAN_TIERS.map((t) => t.id),
        PLAN_TIER_OBJECTIVES,
        objectiveStatuses,
      ),
    [objectiveStatuses],
  );

  // The locked-tier popover is hoisted into the shell so the spine stays
  // presentational. `null` means no popover is open.
  const [lockedPopoverTier, setLockedPopoverTier] = useState<PlanTier | null>(
    null,
  );

  const navigateToTier = (tier: PlanTier) => {
    if (!projectId) return;
    navigate({
      to: '/v3/project/$projectId/plan/tier/$tierId',
      params: { projectId, tierId: tier.id },
    });
  };

  const navigateToObjective = (objectiveId: string, tierId: string) => {
    if (!projectId) return;
    navigate({
      to: '/v3/project/$projectId/plan/tier/$tierId/objective/$objectiveId',
      params: { projectId, tierId, objectiveId },
    });
  };

  const handleSelectTier = (tier: PlanTier) => {
    const state = tierStates[tier.id] ?? 'locked';
    if (state === 'locked') {
      setLockedPopoverTier(tier);
      return;
    }
    navigateToTier(tier);
  };

  return (
    <div className={css.shell}>
      <PlanNavToggle mode={shellMode} onChange={onShellModeChange} />
      <div className={css.intro}>
        <h2 className={css.title}>Plan tier spine</h2>
        <p className={css.subtitle}>
          7 tiers from foundation to phasing. Each tier unlocks once its
          prerequisites complete.
        </p>
        {(activeTierId || activeObjective) && (
          <p
            className={css.routeEcho}
            data-testid="plan-tier-route-echo"
          >
            {activeObjective
              ? `Objective: ${activeObjective.title} (tier ${activeTierId ?? activeObjective.tierId})`
              : `Tier: ${findPlanTier(activeTierId ?? '')?.title ?? activeTierId}`}
          </p>
        )}
      </div>

      <TierSpine
        tiers={PLAN_TIERS}
        objectives={PLAN_TIER_OBJECTIVES}
        objectiveStatuses={objectiveStatuses}
        tierStates={tierStates}
        activeTierId={activeTierId}
        onSelectTier={handleSelectTier}
      />

      {lockedPopoverTier && (
        <TierLockedPopover
          tier={lockedPopoverTier}
          objectives={PLAN_TIER_OBJECTIVES}
          objectiveStatuses={objectiveStatuses}
          onAcknowledge={(obj) => {
            setLockedPopoverTier(null);
            navigateToObjective(obj.id, obj.tierId);
          }}
          onDismiss={() => setLockedPopoverTier(null)}
        />
      )}
    </div>
  );
}
