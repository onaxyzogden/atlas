// PlanStratumShell — entry point for the OLOS Plan stratum spine (Plan
// Navigation Spec v1). Slice 1.5 adds the right-hand ObjectiveColumn
// that surfaces the active stratum's objectives (NextUpCard, parallel
// callout, ObjectiveCards). Slice 1.6 mounts the ObjectiveDetailPanel
// as a 3rd column when an objective is selected — OBJECTIVE header
// + MAP ACTIVATION strip + embedded ObjectiveMap (Plan stage = DesignMap).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import {
  PLAN_STRATA,
  computeAllObjectiveStatuses,
  computeAllStratumStates,
  findPlanStratum,
  findPlanStratumObjectiveIn,
  getPrimaryDomainForObjective,
} from '@ogden/shared';
import type { PlanStratum, PlanStratumObjective } from '@ogden/shared';
import type { PlanShellMode } from '../../../store/projectStore.js';
import {
  selectCelebratedStrata,
  selectProjectProgress,
  toProgressMap,
  usePlanStratumProgressStore,
} from '../../../store/planStratumStore.js';
import { useProjectStore } from '../../../store/projectStore.js';
import { useV3Project } from '../../data/useV3Project.js';
import PlanNavToggle from '../PlanNavToggle.js';
import StratumSpine from './StratumSpine.js';
import StratumLockedPopover from './StratumLockedPopover.js';
import ObjectiveColumn from './ObjectiveColumn.js';
import ObjectiveDetailPanel from './ObjectiveDetailPanel.js';
import { useProjectObjectives } from './useProjectObjectives.js';
import StratumUnlockCelebration from './StratumUnlockCelebration.js';
import {
  deriveStratum1EvidenceMap,
  deriveStratum1StewardshipMap,
  mergeDerivedIntoProgress,
  type VisionDerivedMap,
} from './visionProfileToChecklist.js';
import css from './PlanStratumShell.module.css';

const HIGHLIGHT_DURATION_MS = 3000;
const S1_STRATUM_ID = 's1-project-foundation';

interface Props {
  shellMode: PlanShellMode;
  onShellModeChange: (mode: PlanShellMode) => void;
}

export default function PlanStratumShell({
  shellMode,
  onShellModeChange,
}: Props) {
  const navigate = useNavigate();
  // Slice 1.3 routes — `plan/stratum/$stratumId` and
  // `plan/stratum/$stratumId/objective/$objectiveId`. Read loosely so the same
  // shell mounts at the bare `plan` route too.
  const params = useParams({ strict: false }) as {
    projectId?: string;
    stratumId?: string;
    objectiveId?: string;
  };
  // Slice 2.4 — wizard completion can deep-link with
  // `?highlightIncomplete=s1` to flash attention onto S1's incomplete
  // objectives. Read non-strict so the same shell handles every plan
  // route (the param is only forwarded by /plan but every plan route
  // mounts this shell).
  const search = useSearch({ strict: false }) as {
    highlightIncomplete?: string;
  };
  const projectId = params.projectId ?? '';
  const project = useV3Project(projectId);
  // Sub-slice D - the Plan spine renders THIS project's resolved objective set
  // (universal + its primary/secondary types with patches applied), not the
  // static skeleton. Falls back to the skeleton for null-type (MTC) and
  // pre-slice projects (see useProjectObjectives).
  const { objectives } = useProjectObjectives(projectId);
  const activeStratumId = params.stratumId ?? null;
  const activeObjective = params.objectiveId
    ? (findPlanStratumObjectiveIn(objectives, params.objectiveId) ?? null)
    : null;
  const activeObjectiveId = activeObjective?.id ?? null;
  // Prefer the URL stratum when present; otherwise fall back to the
  // objective's owning stratum so the panel still mounts if a deep link
  // omits the stratum segment.
  const activeStratum = activeStratumId
    ? (findPlanStratum(activeStratumId) ?? null)
    : activeObjective
      ? (findPlanStratum(activeObjective.stratumId) ?? null)
      : null;

  // Slice 1.7: pull persisted checklist progress for the current project
  // and feed it into the status engine. Item ids are globally unique across
  // all objective catalogues + injected patch items, so the flat
  // `Record<itemId, boolean>` collapse is lossless. Selector returns a stable
  // empty record when the project has no progress, so re-renders stay tight.
  const projectProgress = usePlanStratumProgressStore((s) =>
    selectProjectProgress(s, projectId),
  );

  // Slice 1.12 — Stage Zero Vision Builder bridge. The steward's
  // VisionProfile answers pre-satisfy a subset of the S1 checklist
  // (see visionProfileToChecklist.ts for coverage). Merge the derived
  // completions into the progress map BEFORE the status engine runs
  // so the stratum spine and StratumUnlockCelebration reflect Stage Zero
  // progress without any write to planStratumStore.
  const visionProfile = useProjectStore(
    (s) => s.projects.find((p) => p.id === projectId)?.metadata?.visionProfile,
  );
  const visionDerivedMap = useMemo(
    () => deriveStratum1EvidenceMap(visionProfile),
    [visionProfile],
  );

  // Slice 2.4 — wizard Step 3 Team payload pre-satisfies the
  // `s1-stewardship-*` checklist items. Merged into the same derived
  // map shape as the vision bridge so a single union feeds the status
  // engine and the in-panel evidence chips.
  const team = useProjectStore(
    (s) => s.projects.find((p) => p.id === projectId)?.metadata?.team,
  );
  const stewardshipDerivedMap = useMemo(
    () => deriveStratum1StewardshipMap(team),
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
        objectives,
        mergeDerivedIntoProgress(
          toProgressMap(projectProgress),
          derivedMap,
        ),
      ),
    [objectives, projectProgress, derivedMap],
  );
  const stratumStates = useMemo(
    () =>
      computeAllStratumStates(
        PLAN_STRATA.map((t) => t.id),
        objectives,
        objectiveStatuses,
      ),
    [objectives, objectiveStatuses],
  );

  // The locked-stratum popover is hoisted into the shell so the spine stays
  // presentational. `null` means no popover is open.
  const [lockedPopoverStratum, setLockedPopoverStratum] = useState<PlanStratum | null>(
    null,
  );

  // Slice 2.4 — transient flash on S1's incomplete objectives, driven by
  // `?highlightIncomplete=s1`. The wizard "Continue setup in Plan" CTA is
  // the canonical source; deep links also work. Strip the URL once
  // consumed so a refresh doesn't re-fire.
  const [highlightStratumId, setHighlightStratumId] = useState<string | null>(null);
  const highlightConsumedRef = useRef(false);

  useEffect(() => {
    if (highlightConsumedRef.current) return;
    if (search?.highlightIncomplete !== 's1') return;
    highlightConsumedRef.current = true;
    setHighlightStratumId(S1_STRATUM_ID);
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
      () => setHighlightStratumId(null),
      HIGHLIGHT_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [search?.highlightIncomplete]);

  const highlightObjectiveIds = useMemo<readonly string[]>(() => {
    if (!highlightStratumId) return [];
    return objectives.filter(
      (o) =>
        o.stratumId === highlightStratumId &&
        (objectiveStatuses[o.id] ?? 'locked') !== 'complete',
    ).map((o) => o.id);
  }, [highlightStratumId, objectives, objectiveStatuses]);

  // Slice 1.10 — StratumUnlockCelebration. Watch stratum states and surface a
  // celebration the first time any stratum (other than S1, which has no
  // prereqs to "unlock" from) reaches a non-locked state without having
  // been celebrated yet. Once dismissed or opened, the stratum id is logged
  // to the planStratumStore so it never fires again.
  const celebratedStratumIds = usePlanStratumProgressStore((s) =>
    selectCelebratedStrata(s, projectId),
  );
  const markStratumCelebrated = usePlanStratumProgressStore(
    (s) => s.markStratumCelebrated,
  );
  const [celebratingStratumId, setCelebratingStratumId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!projectId || celebratingStratumId) return;
    for (const stratum of PLAN_STRATA) {
      if (stratum.ordinal === 0) continue;
      const state = stratumStates[stratum.id] ?? 'locked';
      if (state === 'locked') continue;
      if (celebratedStratumIds.includes(stratum.id)) continue;
      setCelebratingStratumId(stratum.id);
      return;
    }
  }, [stratumStates, projectId, celebratingStratumId, celebratedStratumIds]);

  const celebratingStratum = celebratingStratumId
    ? (findPlanStratum(celebratingStratumId) ?? null)
    : null;
  const celebratingFirstObjective = celebratingStratum
    ? (objectives.find(
        (o) =>
          o.stratumId === celebratingStratum.id &&
          (objectiveStatuses[o.id] ?? 'locked') !== 'locked',
      ) ?? null)
    : null;

  const navigateToStratum = (stratum: PlanStratum) => {
    if (!projectId) return;
    navigate({
      to: '/v3/project/$projectId/plan/stratum/$stratumId',
      params: { projectId, stratumId: stratum.id },
    });
  };

  const navigateToObjective = (objectiveId: string, stratumId: string) => {
    if (!projectId) return;
    navigate({
      to: '/v3/project/$projectId/plan/stratum/$stratumId/objective/$objectiveId',
      params: { projectId, stratumId, objectiveId },
    });
  };

  // Slice 4.4 — deep-link from a Plan stratum objective divergence pill
  // into the matching Observe Domain Detail surface so the steward can
  // see the diverged evidence in context (spec §6.4).
  const navigateToDomainDetail = (domainId: string) => {
    if (!projectId) return;
    navigate({
      to: '/v3/project/$projectId/observe/dashboard/domain/$domainId',
      params: { projectId, domainId },
    });
  };

  const handleObjectiveDivergenceClick = (obj: PlanStratumObjective) => {
    const domainId = getPrimaryDomainForObjective(obj);
    if (!domainId) return;
    navigateToDomainDetail(domainId);
  };

  const handleSelectStratum = (stratum: PlanStratum) => {
    const state = stratumStates[stratum.id] ?? 'locked';
    if (state === 'locked') {
      setLockedPopoverStratum(stratum);
      return;
    }
    navigateToStratum(stratum);
  };

  const handleSelectObjective = (obj: PlanStratumObjective) => {
    navigateToObjective(obj.id, obj.stratumId);
  };

  const hasObjectiveColumn = activeStratum !== null;
  const hasDetailPanel = activeObjective !== null && activeStratum !== null;

  return (
    <div className={css.shell}>
      <PlanNavToggle mode={shellMode} onChange={onShellModeChange} />
      <div className={css.intro}>
        <h2 className={css.title}>Plan stratum spine</h2>
        <p className={css.subtitle}>
          7 strata from foundation to phasing. Each stratum unlocks once its
          prerequisites complete.
        </p>
      </div>

      <div
        className={css.layout}
        data-has-objective-column={hasObjectiveColumn}
        data-has-detail-panel={hasDetailPanel}
      >
        <StratumSpine
          strata={PLAN_STRATA}
          objectives={objectives}
          objectiveStatuses={objectiveStatuses}
          stratumStates={stratumStates}
          activeStratumId={activeStratumId}
          highlightStratumId={highlightStratumId}
          onSelectStratum={handleSelectStratum}
        />

        {activeStratum && (
          <ObjectiveColumn
            stratum={activeStratum}
            objectives={objectives}
            objectiveStatuses={objectiveStatuses}
            activeObjectiveId={activeObjectiveId}
            highlightObjectiveIds={highlightObjectiveIds}
            projectId={projectId}
            onSelectObjective={handleSelectObjective}
            onObjectiveDivergenceClick={handleObjectiveDivergenceClick}
          />
        )}

        {hasDetailPanel && activeObjective && activeStratum && (
          <ObjectiveDetailPanel
            key={activeObjective.id}
            projectId={projectId}
            stratum={activeStratum}
            objective={activeObjective}
            status={objectiveStatuses[activeObjective.id] ?? 'locked'}
            project={project}
            onBackToStratum={navigateToStratum}
            visionDerivedMap={derivedMap}
          />
        )}
      </div>

      {lockedPopoverStratum && (
        <StratumLockedPopover
          stratum={lockedPopoverStratum}
          objectives={objectives}
          objectiveStatuses={objectiveStatuses}
          onAcknowledge={(obj) => {
            setLockedPopoverStratum(null);
            navigateToObjective(obj.id, obj.stratumId);
          }}
          onDismiss={() => setLockedPopoverStratum(null)}
        />
      )}

      {celebratingStratum && (
        <StratumUnlockCelebration
          stratum={celebratingStratum}
          firstObjective={celebratingFirstObjective}
          onOpenStratum={() => {
            markStratumCelebrated(projectId, celebratingStratum.id);
            setCelebratingStratumId(null);
            navigateToStratum(celebratingStratum);
          }}
          onDismiss={() => {
            markStratumCelebrated(projectId, celebratingStratum.id);
            setCelebratingStratumId(null);
          }}
        />
      )}
    </div>
  );
}
