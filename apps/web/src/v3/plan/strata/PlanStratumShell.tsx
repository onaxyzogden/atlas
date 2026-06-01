// PlanStratumShell — entry point for the OLOS Plan stratum spine (Plan
// Navigation Spec v1). Slice 1.5 adds the right-hand ObjectiveColumn
// that surfaces the active stratum's objectives (NextUpCard, parallel
// callout, ObjectiveCards). Slice 1.6 mounts the ObjectiveDetailPanel
// as a 3rd column when an objective is selected — OBJECTIVE header
// + MAP ACTIVATION strip + embedded ObjectiveMap (Plan stage = DesignMap).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { Layers } from 'lucide-react';
import {
  PLAN_STRATA,
  computeAllObjectiveStatuses,
  computeAllStratumStates,
  findPlanStratum,
  findPlanStratumObjectiveIn,
  findProjectType,
  getPrimaryDomainForObjective,
} from '@ogden/shared';
import type {
  PlanStratum,
  PlanStratumObjective,
  ProjectTypeId,
} from '@ogden/shared';
import {
  selectCelebratedStrata,
  selectDeferredObjectives,
  toDeferredSet,
  usePlanStratumProgressStore,
} from '../../../store/planStratumStore.js';
import { useProjectStore } from '../../../store/projectStore.js';
import { useV3Project } from '../../data/useV3Project.js';
import ModeToggle, { type SpinePlanMode } from '../spine/ModeToggle.js';
import StratumSpine from './StratumSpine.js';
import StratumLockedPopover from './StratumLockedPopover.js';
import ObjectiveColumn from './ObjectiveColumn.js';
import ObjectiveDetailPanel from './ObjectiveDetailPanel.js';
import ProtocolColumn from './ProtocolColumn.js';
import ProtocolDetailColumn from './ProtocolDetailColumn.js';
import { useProtocolLibrary } from './useProtocolLibrary.js';
import { useProjectObjectives } from './useProjectObjectives.js';
import { planHeaderProjectTypeLabel } from './planHeaderLabel.js';
import StratumUnlockCelebration from './StratumUnlockCelebration.js';
import PrimarySetModal from './PrimarySetModal.js';
import SecondaryAddModal from './SecondaryAddModal.js';
import SecondaryReopenModal from './SecondaryReopenModal.js';
import SecondaryRemoveBlockedModal from './SecondaryRemoveBlockedModal.js';
import ObserveGapBanner from './ObserveGapBanner.js';
import type { SecondaryAddPreview } from './useSecondaryAddPreview.js';
import type { BlockingObjective } from './useSecondaryRemovePreview.js';
import {
  deriveStratum1EvidenceMap,
  deriveStratum1StewardshipMap,
  type VisionDerivedMap,
} from '../../strata/visionProfileToChecklist.js';
import { useEffectiveChecklistProgress } from '../../strata/useEffectiveChecklistProgress.js';
// Plan Spine re-skin — the live strata shell now renders in the prototype's
// dark/gold 3-column spine layout. Colour/font tokens (`C`/`F`/`CA`) resolve to
// the `--spine-*` custom properties declared in spine-theme.css, which is
// scoped to `.olos-spine-root` so it never leaks into sibling surfaces.
import { C, F } from '../spine/tokens.js';
import '../spine/spine-theme.css';

const HIGHLIGHT_DURATION_MS = 3000;
const S1_STRATUM_ID = 's1-project-foundation';

export default function PlanStratumShell() {
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
    planMode?: string;
  };
  // Plan Spine re-skin Phase 2 — Design ⇄ Protocol mode is route-driven via
  // `?planMode=protocol` (consistent with the existing $stratumId/$objectiveId/
  // highlightIncomplete route-as-state pattern), so it survives stratum and
  // objective navigation and is deep-linkable. Anything but 'protocol' is Design.
  const planMode: SpinePlanMode =
    search?.planMode === 'protocol' ? 'protocol' : 'design';
  const projectId = params.projectId ?? '';
  const project = useV3Project(projectId);
  // Sub-slice D - the Plan spine renders THIS project's resolved objective set
  // (universal + its primary/secondary types with patches applied), not the
  // static skeleton. Falls back to the skeleton for null-type (MTC) and
  // pre-slice projects (see useProjectObjectives).
  const { objectives, activeTensions } = useProjectObjectives(projectId);
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
  // Single source of truth (2026-05-31): effective checklist progress =
  // stored planStratumStore progress UNIONED with wizard-derived Stratum-1
  // completion. Shared with Act / Portfolio / Home via
  // useEffectiveChecklistProgress so no surface can drift. `flatMap` feeds the
  // status engine below; the local derivedMap (further down) is kept only for
  // the evidence chips rendered in ObjectiveDetailPanel.
  const effectiveProgress = useEffectiveChecklistProgress(projectId, objectives);

  // Plan Nav v1.1 §8.3 — the steward's explicit Deferred overrides for this
  // project. Threaded into the status engine so deferred objectives resolve to
  // `deferred` (and keep their dependents locked) without any progress change.
  const deferredObjectiveIds = usePlanStratumProgressStore((s) =>
    selectDeferredObjectives(s, projectId),
  );
  const deferredSet = useMemo(
    () => toDeferredSet(deferredObjectiveIds),
    [deferredObjectiveIds],
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
        effectiveProgress.flatMap,
        deferredSet,
      ),
    [objectives, effectiveProgress, deferredSet],
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

  // Overall progress across the project's resolved objective set — drives the
  // footer pinned beneath the strata spine (mirrors the Plan Spine prototype's
  // "Overall progress" footer, wired to real completion).
  const totalObjectives = objectives.length;
  const completedObjectives = useMemo(
    () =>
      objectives.filter((o) => objectiveStatuses[o.id] === 'complete').length,
    [objectives, objectiveStatuses],
  );
  const overallPct = totalObjectives
    ? Math.round((completedObjectives / totalObjectives) * 100)
    : 0;

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

  // Phase B3 (Plan Navigation Spec v1.1 section 9) - mid-project secondary
  // addition. The "Project type" trigger opens the add modal; a successful add
  // may reopen previously-complete objectives (reopen modal) and/or flag an
  // Observe-stage data gap (teal banner). Every piece of state here is
  // transient component state - no persist bump.
  const typeRecord = useProjectStore(
    (s) => s.projects.find((p) => p.id === projectId)?.metadata?.projectTypeRecord,
  );
  const setPrimaryType = useProjectStore((s) => s.setPrimaryType);
  const addSecondaryType = useProjectStore((s) => s.addSecondaryType);
  const removeSecondaryType = useProjectStore((s) => s.removeSecondaryType);
  const acknowledgeReopening = useProjectStore((s) => s.acknowledgeReopening);
  const deferObjective = usePlanStratumProgressStore((s) => s.deferObjective);
  const undeferObjective = usePlanStratumProgressStore((s) => s.undeferObjective);
  const primaryTypeId = typeRecord?.primaryTypeId ?? null;
  const currentSecondaryIds = typeRecord?.secondaryTypeIds ?? [];
  // Plan header — surface the project type (steward: "project type ... used to
  // appear here. Bring it back"). Project type only; no cycle number.
  const secondaryCount = currentSecondaryIds.length;
  const primaryTypeLabel = planHeaderProjectTypeLabel(primaryTypeId, secondaryCount);

  // Plan Protocol mode (Phase 3) — the center column is a multi-select protocol
  // list and the right column stacks the detail of each selection. Selection is
  // transient component state this slice (not persisted to URL/store). The shared
  // useProtocolLibrary hook derives the same templates/groups/status/outputs the
  // Act-rail ProtocolLayerPanel uses, so the two surfaces can never drift.
  const [selectedProtocolIds, setSelectedProtocolIds] = useState<
    readonly string[]
  >([]);
  const toggleProtocol = (id: string) =>
    setSelectedProtocolIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const protocolLib = useProtocolLibrary(
    projectId,
    primaryTypeId,
    currentSecondaryIds,
  );
  // Filter the ORDERED library by selection so the detail stack is in
  // catalogue/tier order (stable), not click order.
  const selectedTemplates = useMemo(
    () =>
      protocolLib.templates.filter((t) => selectedProtocolIds.includes(t.id)),
    [protocolLib.templates, selectedProtocolIds],
  );

  const [primarySetOpen, setPrimarySetOpen] = useState(false);
  const [secondaryAddOpen, setSecondaryAddOpen] = useState(false);
  const [reopenPayload, setReopenPayload] = useState<{
    secondaryTypeId: ProjectTypeId;
    secondaryLabel: string;
    objectives: PlanStratumObjective[];
  } | null>(null);
  const [observeGapCount, setObserveGapCount] = useState(0);

  // Plan Nav v1.1 §8.3 — when a steward tries to remove a secondary whose
  // delta objectives have started (active/complete/deferred), removal is
  // blocked and this payload drives the blocked modal that names the blockers
  // and offers "Mark as Deferred instead".
  const [removeBlockedPayload, setRemoveBlockedPayload] = useState<{
    secondaryTypeId: ProjectTypeId;
    secondaryLabel: string;
    blockingObjectives: BlockingObjective[];
  } | null>(null);

  // The preview snapshot is captured pre-mutation inside the modal and handed
  // up here; after the write the candidate is no longer eligible, so the
  // reopen list / observe-gap count must come from that snapshot, not a
  // re-derivation.
  const handleConfirmSecondaryAdd = (
    secondaryTypeId: ProjectTypeId,
    preview: SecondaryAddPreview,
  ) => {
    const ok = addSecondaryType(projectId, secondaryTypeId);
    setSecondaryAddOpen(false);
    if (!ok) return;
    if (preview.reopenedObjectives.length > 0) {
      setReopenPayload({
        secondaryTypeId,
        secondaryLabel: findProjectType(secondaryTypeId)?.label ?? secondaryTypeId,
        objectives: preview.reopenedObjectives,
      });
    }
    if (preview.observeGapObjectiveIds.length > 0) {
      setObserveGapCount(preview.observeGapObjectiveIds.length);
    }
  };

  const handleReopenContinue = () => {
    if (!reopenPayload) return;
    acknowledgeReopening(
      projectId,
      reopenPayload.secondaryTypeId,
      reopenPayload.objectives.map((o) => o.id),
    );
    setReopenPayload(null);
  };

  // Jumping to a reopened objective is itself engagement with the review, so
  // it records the same append-only acknowledgement the explicit CTA does.
  const handleReopenNavigate = (objectiveId: string, stratumId: string) => {
    if (reopenPayload) {
      acknowledgeReopening(
        projectId,
        reopenPayload.secondaryTypeId,
        reopenPayload.objectives.map((o) => o.id),
      );
    }
    setReopenPayload(null);
    navigateToObjective(objectiveId, stratumId);
  };

  // Plan Nav v1.1 §8.3 — mid-project secondary REMOVAL. The manage surface
  // checks removability per-secondary (useSecondaryRemovePreview) and routes
  // here: a clean removal calls the store action directly; a blocked removal
  // opens the blocked modal with the named blockers (no mutation).
  const handleRemoveSecondary = (secondaryTypeId: ProjectTypeId) => {
    const result = removeSecondaryType(projectId, secondaryTypeId);
    // The row only reaches this path when its preview reported `removable`,
    // but guard defensively: if a race made it blocked, do nothing rather
    // than surface a stale success.
    if (!result.ok) return;
  };

  const handleRemoveSecondaryBlocked = (
    secondaryTypeId: ProjectTypeId,
    blockingObjectives: BlockingObjective[],
  ) => {
    setRemoveBlockedPayload({
      secondaryTypeId,
      secondaryLabel: findProjectType(secondaryTypeId)?.label ?? secondaryTypeId,
      blockingObjectives,
    });
  };

  // "Mark as Deferred instead" — shelve every blocking objective (progress
  // preserved, dependents stay locked) and keep the secondary. Removal stays
  // blocked; this is the alternative path, not a forced removal.
  const handleDeferBlockers = () => {
    if (!removeBlockedPayload) return;
    for (const { objective } of removeBlockedPayload.blockingObjectives) {
      deferObjective(projectId, objective.id);
    }
    setRemoveBlockedPayload(null);
  };

  const handleBlockedNavigate = (objectiveId: string, stratumId: string) => {
    setRemoveBlockedPayload(null);
    navigateToObjective(objectiveId, stratumId);
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

  // Plan Spine re-skin Phase 2 — flip the Design ⇄ Protocol mode by rewriting
  // only the `planMode` search param on the CURRENT path (`to: '.'`), preserving
  // the active stratum/objective segments. Design mode omits the param entirely
  // (validatePlanSearch only honours `planMode: 'protocol'`). `as never` matches
  // the codebase's pattern for loosely-typed search updates.
  const handlePlanModeChange = (mode: SpinePlanMode) => {
    navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        planMode: mode === 'protocol' ? 'protocol' : undefined,
      }),
    } as never);
  };

  const hasDetailPanel = activeObjective !== null && activeStratum !== null;

  return (
    <div
      className="olos-spine-root"
      style={{
        height: '100%',
        display: 'flex',
        background: C.bg,
        fontFamily: F.sans,
        color: C.textPrimary,
        overflow: 'hidden',
      }}
    >
      <style>{`
        .olos-spine-root *, .olos-spine-root *::before, .olos-spine-root *::after { box-sizing: border-box; }
        .olos-spine-root ::-webkit-scrollbar { width: 3px; }
        .olos-spine-root ::-webkit-scrollbar-track { background: transparent; }
        .olos-spine-root ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
      `}</style>

      {/* ── LEFT: stratum spine (flex 2 of the 2-3-5 column ratio) ── */}
      <div
        style={{
          flex: 2,
          minWidth: 0,
          background: C.bg2,
          borderRight: `1px solid ${C.border}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Spine header — title, blurb, Project-type trigger, shell nav toggle */}
        <div
          style={{
            padding: '16px 14px 12px',
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: C.textTertiary,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 6,
            }}
          >
            OLOS · Plan
          </div>
          <h2
            style={{
              margin: '0 0 4px',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: C.textPrimary,
            }}
          >
            {project?.name ?? 'Untitled project'}
          </h2>
          {primaryTypeId ? (
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: C.textSecondary }}>
              {primaryTypeLabel}
            </p>
          ) : (
            // No primary chosen yet (e.g. MTC) - the type line becomes a control
            // that opens the primary-type picker, which derives the objectives.
            <button
              type="button"
              onClick={() => setPrimarySetOpen(true)}
              data-testid="plan-primary-set-trigger"
              style={{
                margin: 0,
                padding: 0,
                border: 'none',
                background: 'transparent',
                font: 'inherit',
                fontSize: 12,
                lineHeight: 1.45,
                color: C.textSecondary,
                textAlign: 'left',
                textDecoration: 'underline dotted',
                textUnderlineOffset: 3,
                cursor: 'pointer',
              }}
            >
              Set project type
            </button>
          )}

          {primaryTypeId && (
            <button
              type="button"
              onClick={() => setSecondaryAddOpen(true)}
              data-testid="plan-secondary-add-trigger"
              style={{
                marginTop: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 11px',
                borderRadius: 999,
                border: `1px solid ${C.border}`,
                background: C.bg3,
                color: C.textSecondary,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: F.sans,
              }}
            >
              <Layers size={12} aria-hidden />
              <span>Project type</span>
            </button>
          )}

          {/* Design ⇄ Protocol mode toggle (Plan Spine re-skin Phase 2) */}
          <div style={{ marginTop: 8 }}>
            <ModeToggle mode={planMode} onChange={handlePlanModeChange} />
          </div>
        </div>

        {/* Observe-stage data-gap banner (transient, from a mid-project add) */}
        {observeGapCount > 0 && (
          <div style={{ padding: '8px 12px 0' }}>
            <ObserveGapBanner
              count={observeGapCount}
              onDismiss={() => setObserveGapCount(0)}
            />
          </div>
        )}

        {/* Strata list (own scroll region) */}
        <StratumSpine
          strata={PLAN_STRATA}
          objectives={objectives}
          objectiveStatuses={objectiveStatuses}
          stratumStates={stratumStates}
          activeStratumId={activeStratumId}
          highlightStratumId={highlightStratumId}
          onSelectStratum={handleSelectStratum}
        />

        {/* Overall progress — pinned footer beneath the strata spine, wired to
            real completion (mirrors the Plan Spine prototype footer). */}
        <div
          data-testid="plan-overall-progress"
          style={{
            padding: '12px 16px',
            borderTop: `1px solid ${C.border}`,
            background: C.bg3,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: C.textTertiary,
              fontFamily: F.sans,
              marginBottom: 6,
            }}
          >
            Overall progress
          </div>
          <div
            role="progressbar"
            aria-label="Overall progress"
            aria-valuemin={0}
            aria-valuemax={totalObjectives}
            aria-valuenow={completedObjectives}
            style={{ height: 3, background: C.bg4, borderRadius: 2 }}
          >
            <div
              style={{
                height: '100%',
                width: `${overallPct}%`,
                background: C.blue,
                borderRadius: 2,
              }}
            />
          </div>
          <div
            style={{
              fontSize: 10,
              color: C.textSecondary,
              marginTop: 5,
              fontFamily: F.mono,
            }}
          >
            {completedObjectives} / {totalObjectives} objectives
          </div>
        </div>
      </div>

      {/* ── CENTRE: Protocol list (Protocol mode) or objective column (Design,
           mounts only when a stratum is open) ── */}
      {planMode === 'protocol' ? (
        <ProtocolColumn
          groups={protocolLib.groups}
          statusByTemplate={protocolLib.statusByTemplate}
          selectedIds={selectedProtocolIds}
          onToggle={toggleProtocol}
        />
      ) : activeStratum ? (
        <ObjectiveColumn
          stratum={activeStratum}
          objectives={objectives}
          objectiveStatuses={objectiveStatuses}
          activeObjectiveId={activeObjectiveId}
          highlightObjectiveIds={highlightObjectiveIds}
          projectId={projectId}
          tensions={activeTensions}
          activeStratumId={activeStratumId}
          onSelectObjective={handleSelectObjective}
          onObjectiveDivergenceClick={handleObjectiveDivergenceClick}
          onRestoreObjective={(obj) => undeferObjective(projectId, obj.id)}
        />
      ) : null}

      {/* ── RIGHT: objective detail panel (flex 5 of the 2-3-5 column ratio) ── */}
      <div
        style={{
          flex: 5,
          minWidth: 0,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {planMode === 'protocol' ? (
          <ProtocolDetailColumn
            selectedTemplates={selectedTemplates}
            statusByTemplate={protocolLib.statusByTemplate}
            outputs={protocolLib.outputs}
          />
        ) : hasDetailPanel && activeObjective && activeStratum ? (
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
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: 24,
              textAlign: 'center',
              color: C.textTertiary,
              fontSize: 13,
              fontFamily: F.sans,
            }}
          >
            {activeStratum
              ? 'Select an objective to view its decisions and map.'
              : 'Select a stratum to begin.'}
          </div>
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

      {primarySetOpen && !primaryTypeId && (
        <PrimarySetModal
          onConfirm={(id) => {
            setPrimaryType(projectId, id);
            setPrimarySetOpen(false);
          }}
          onDismiss={() => setPrimarySetOpen(false)}
        />
      )}

      {secondaryAddOpen && primaryTypeId && (
        <SecondaryAddModal
          projectId={projectId}
          primaryTypeId={primaryTypeId}
          currentSecondaryIds={currentSecondaryIds}
          onConfirm={handleConfirmSecondaryAdd}
          onRemove={handleRemoveSecondary}
          onRemoveBlocked={handleRemoveSecondaryBlocked}
          onDismiss={() => setSecondaryAddOpen(false)}
        />
      )}

      {removeBlockedPayload && (
        <SecondaryRemoveBlockedModal
          secondaryLabel={removeBlockedPayload.secondaryLabel}
          blockingObjectives={removeBlockedPayload.blockingObjectives}
          onNavigate={handleBlockedNavigate}
          onDefer={handleDeferBlockers}
          onDismiss={() => setRemoveBlockedPayload(null)}
        />
      )}

      {reopenPayload && (
        <SecondaryReopenModal
          secondaryLabel={reopenPayload.secondaryLabel}
          objectives={reopenPayload.objectives}
          onNavigate={handleReopenNavigate}
          onContinue={handleReopenContinue}
          onDismiss={() => setReopenPayload(null)}
        />
      )}
    </div>
  );
}
