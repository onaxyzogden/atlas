// PlanTierShell — entry point for the OLOS Plan tier spine (Plan
// Navigation Spec v1). Slice 1.5 adds the right-hand ObjectiveColumn
// that surfaces the active tier's objectives (NextUpCard, parallel
// callout, ObjectiveCards). Slice 1.6 mounts the ObjectiveDetailPanel
// as a 3rd column when an objective is selected — OBJECTIVE header
// + MAP ACTIVATION strip + embedded ObjectiveMap (Plan stage = DesignMap).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import {
  PLAN_TIERS,
  PLAN_TIER_OBJECTIVES,
  computeAllObjectiveStatuses,
  computeAllTierStates,
  findPlanTier,
  findPlanTierObjective,
  getPrimaryDomainForObjective,
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
  deriveTier0StewardshipMap,
  mergeDerivedIntoProgress,
  type VisionDerivedMap,
} from './visionProfileToChecklist.js';
import css from './PlanTierShell.module.css';

const HIGHLIGHT_DURATION_MS = 3000;
const T0_TIER_ID = 't0-project-foundation';

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
  // Slice 2.4 — wizard completion can deep-link with
  // `?highlightIncomplete=t0` to flash attention onto T0's incomplete
  // objectives. Read non-strict so the same shell handles every plan
  // route (the param is only forwarded by /plan but every plan route
  // mounts this shell).
  const search = useSearch({ strict: false }) as {
    highlightIncomplete?: string;
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

  // Slice 2.4 — wizard Step 3 Team payload pre-satisfies the
  // `t0-stewardship-*` checklist items. Merged into the same derived
  // map shape as the vision bridge so a single union feeds the status
  // engine and the in-panel evidence chips.
  const team = useProjectStore(
    (s) => s.projects.find((p) => p.id === projectId)?.metadata?.team,
  );
  const stewardshipDerivedMap = useMemo(
    () => deriveTier0StewardshipMap(team),
    [team],
  );

  const derivedMap = useMemo<VisionDerivedMap>(
    () =>
      Object.keys(stewardshipDerivedMap).length === 0
        ? visionDerivedMap
        : { ...visionDerivedMap, ...stewardshipDerivedMap },
    [visionDerivedMap, stewardshipDerivedMap],
  );

  const objectiveStatuses = useMemo(
    () =>
      computeAllObjectiveStatuses(
        PLAN_TIER_OBJECTIVES,
        mergeDerivedIntoProgress(
          toProgressMap(projectProgress),
          derivedMap,
        ),
      ),
    [projectProgress, derivedMap],
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

  // Slice 2.4 — transient flash on T0's incomplete objectives, driven by
  // `?highlightIncomplete=t0`. The wizard "Continue setup in Plan" CTA is
  // the canonical source; deep links also work. Strip the URL once
  // consumed so a refresh doesn't re-fire.
  const [highlightTierId, setHighlightTierId] = useState<string | null>(null);
  const highlightConsumedRef = useRef(false);

  useEffect(() => {
    if (highlightConsumedRef.current) return;
    if (search?.highlightIncomplete !== 't0') return;
    highlightConsumedRef.current = true;
    setHighlightTierId(T0_TIER_ID);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('highlightIncomplete');
        window.history.replaceState(null, '', url.toString());
      } catch {
        // URL API failure is non-fatal; param will linger but not re-fire
        // because highlightConsumedRef guards re-entry.
      }
    }
    const timer = window.setTimeout(
      () => setHighlightTierId(null),
      HIGHLIGHT_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [search?.highlightIncomplete]);

  const highlightObjectiveIds = useMemo<readonly string[]>(() => {
    if (!highlightTierId) return [];
    return PLAN_TIER_OBJECTIVES.filter(
      (o) =>
        o.tierId === highlightTierId &&
        (objectiveStatuses[o.id] ?? 'locked') !== 'complete',
    ).map((o) => o.id);
  }, [highlightTierId, objectiveStatuses]);

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

  // Slice 4.4 — deep-link from a Plan tier objective divergence pill
  // into the matching Observe Domain Detail surface so the steward can
  // see the diverged evidence in context (spec §6.4).
  const navigateToDomainDetail = (domainId: string) => {
    if (!projectId) return;
    navigate({
      to: '/v3/project/$projectId/observe/dashboard/domain/$domainId',
      params: { projectId, domainId },
    });
  };

  const handleObjectiveDivergenceClick = (obj: PlanTierObjective) => {
    const domainId = getPrimaryDomainForObjective(obj);
    if (!domainId) return;
    navigateToDomainDetail(domainId);
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
          highlightTierId={highlightTierId}
          onSelectTier={handleSelectTier}
        />

        {activeTier && (
          <ObjectiveColumn
            tier={activeTier}
            objectives={PLAN_TIER_OBJECTIVES}
            objectiveStatuses={objectiveStatuses}
            activeObjectiveId={activeObjectiveId}
            highlightObjectiveIds={highlightObjectiveIds}
            projectId={projectId}
            onSelectObjective={handleSelectObjective}
            onObjectiveDivergenceClick={handleObjectiveDivergenceClick}
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
            visionDerivedMap={derivedMap}
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
