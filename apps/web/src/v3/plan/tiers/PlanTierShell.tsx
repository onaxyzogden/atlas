// PlanTierShell — entry point for the OLOS Plan tier spine (Plan
// Navigation Spec v1). Slice 1.5 adds the right-hand ObjectiveColumn
// that surfaces the active tier's objectives (NextUpCard, parallel
// callout, ObjectiveCards). Slice 1.6 mounts the ObjectiveDetailPanel
// as a 3rd column when an objective is selected — OBJECTIVE header
// + MAP ACTIVATION strip + embedded ObjectiveMap (Plan stage = DesignMap).

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  PLAN_TIERS,
  PLAN_TIER_OBJECTIVES,
  computeAllObjectiveStatuses,
  computeAllTierStates,
  findPlanTier,
  findPlanTierObjective,
} from '@ogden/shared';
import type { PlanTier, PlanTierObjective } from '@ogden/shared';
import type { PlanShellMode } from '../../../store/projectStore.js';
import {
  selectCelebratedTiers,
  selectProjectProgress,
  toProgressMap,
  usePlanTierProgressStore,
} from '../../../store/planTierStore.js';
import { useProjectStore } from '../../../store/projectStore.js';
import { useV3Project } from '../../data/useV3Project.js';
import PlanNavToggle from '../PlanNavToggle.js';
import TierSpine from './TierSpine.js';
import TierLockedPopover from './TierLockedPopover.js';
import ObjectiveColumn from './ObjectiveColumn.js';
import ObjectiveDetailPanel from './ObjectiveDetailPanel.js';
import TierUnlockCelebration from './TierUnlockCelebration.js';
import {
  deriveTier0EvidenceMap,
  mergeDerivedIntoProgress,
} from './visionProfileToChecklist.js';
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
  const project = useV3Project(projectId);
  const activeTierId = params.tierId ?? null;
  const activeObjective = params.objectiveId
    ? (findPlanTierObjective(params.objectiveId) ?? null)
    : null;
  const activeObjectiveId = activeObjective?.id ?? null;
  // Prefer the URL tier when present; otherwise fall back to the
  // objective's owning tier so the panel still mounts if a deep link
  // omits the tier segment.
  const activeTier = activeTierId
    ? (findPlanTier(activeTierId) ?? null)
    : activeObjective
      ? (findPlanTier(activeObjective.tierId) ?? null)
      : null;

  // Slice 1.7: pull persisted checklist progress for the current project
  // and feed it into the status engine. The store keys are global within
  // PLAN_TIER_OBJECTIVES, so the flat `Record<itemId, boolean>` collapse
  // is lossless. Selector returns a stable empty record when the project
  // has no progress, so re-renders stay tight.
  const projectProgress = usePlanTierProgressStore((s) =>
    selectProjectProgress(s, projectId),
  );

  // Slice 1.12 — Stage Zero Vision Builder bridge. The steward's
  // VisionProfile answers pre-satisfy a subset of the T0 checklist
  // (see visionProfileToChecklist.ts for coverage). Merge the derived
  // completions into the progress map BEFORE the status engine runs
  // so the tier spine and TierUnlockCelebration reflect Stage Zero
  // progress without any write to planTierStore.
  const visionProfile = useProjectStore(
    (s) => s.projects.find((p) => p.id === projectId)?.metadata?.visionProfile,
  );
  const visionDerivedMap = useMemo(
    () => deriveTier0EvidenceMap(visionProfile),
    [visionProfile],
  );

  const objectiveStatuses = useMemo(
    () =>
      computeAllObjectiveStatuses(
        PLAN_TIER_OBJECTIVES,
        mergeDerivedIntoProgress(
          toProgressMap(projectProgress),
          visionDerivedMap,
        ),
      ),
    [projectProgress, visionDerivedMap],
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

  // Slice 1.10 — TierUnlockCelebration. Watch tier states and surface a
  // celebration the first time any tier (other than T0, which has no
  // prereqs to "unlock" from) reaches a non-locked state without having
  // been celebrated yet. Once dismissed or opened, the tier id is logged
  // to the planTierStore so it never fires again.
  const celebratedTierIds = usePlanTierProgressStore((s) =>
    selectCelebratedTiers(s, projectId),
  );
  const markTierCelebrated = usePlanTierProgressStore(
    (s) => s.markTierCelebrated,
  );
  const [celebratingTierId, setCelebratingTierId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!projectId || celebratingTierId) return;
    for (const tier of PLAN_TIERS) {
      if (tier.ordinal === 0) continue;
      const state = tierStates[tier.id] ?? 'locked';
      if (state === 'locked') continue;
      if (celebratedTierIds.includes(tier.id)) continue;
      setCelebratingTierId(tier.id);
      return;
    }
  }, [tierStates, projectId, celebratingTierId, celebratedTierIds]);

  const celebratingTier = celebratingTierId
    ? (findPlanTier(celebratingTierId) ?? null)
    : null;
  const celebratingFirstObjective = celebratingTier
    ? (PLAN_TIER_OBJECTIVES.find(
        (o) =>
          o.tierId === celebratingTier.id &&
          (objectiveStatuses[o.id] ?? 'locked') !== 'locked',
      ) ?? null)
    : null;

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

  const handleSelectObjective = (obj: PlanTierObjective) => {
    navigateToObjective(obj.id, obj.tierId);
  };

  const hasObjectiveColumn = activeTier !== null;
  const hasDetailPanel = activeObjective !== null && activeTier !== null;

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

      <div
        className={css.layout}
        data-has-objective-column={hasObjectiveColumn}
        data-has-detail-panel={hasDetailPanel}
      >
        <TierSpine
          tiers={PLAN_TIERS}
          objectives={PLAN_TIER_OBJECTIVES}
          objectiveStatuses={objectiveStatuses}
          tierStates={tierStates}
          activeTierId={activeTierId}
          onSelectTier={handleSelectTier}
        />

        {activeTier && (
          <ObjectiveColumn
            tier={activeTier}
            objectives={PLAN_TIER_OBJECTIVES}
            objectiveStatuses={objectiveStatuses}
            activeObjectiveId={activeObjectiveId}
            onSelectObjective={handleSelectObjective}
          />
        )}

        {hasDetailPanel && activeObjective && activeTier && (
          <ObjectiveDetailPanel
            key={activeObjective.id}
            projectId={projectId}
            tier={activeTier}
            objective={activeObjective}
            status={objectiveStatuses[activeObjective.id] ?? 'locked'}
            project={project}
            onBackToTier={navigateToTier}
            visionDerivedMap={visionDerivedMap}
          />
        )}
      </div>

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

      {celebratingTier && (
        <TierUnlockCelebration
          tier={celebratingTier}
          firstObjective={celebratingFirstObjective}
          onOpenTier={() => {
            markTierCelebrated(projectId, celebratingTier.id);
            setCelebratingTierId(null);
            navigateToTier(celebratingTier);
          }}
          onDismiss={() => {
            markTierCelebrated(projectId, celebratingTier.id);
            setCelebratingTierId(null);
          }}
        />
      )}
    </div>
  );
}
