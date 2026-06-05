// PlanStratumShell — entry point for the OLOS Plan stratum spine (Plan
// Navigation Spec v1). Slice 1.5 adds the right-hand ObjectiveColumn
// that surfaces the active stratum's objectives (NextUpCard, parallel
// callout, ObjectiveCards). Slice 1.6 mounts the ObjectiveDetailPanel
// as a 3rd column when an objective is selected — OBJECTIVE header
// + MAP ACTIVATION strip + embedded ObjectiveMap (Plan stage = DesignMap).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { Archive, Layers } from 'lucide-react';
import {
  PLAN_STRATA,
  computeAllObjectiveStatuses,
  computeAllStratumStates,
  findPlanStratum,
  findPlanStratumObjectiveIn,
  findProjectType,
  getPrimaryDomainForObjective,
  getTensionConcernObjectiveIds,
  getTensionConcernsByStratum,
} from '@ogden/shared';
import type {
  DesignTension,
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
import { useStageSearchStore } from '../../../store/stageSearchStore.js';
import { resolvePlanSearchMatches } from '../../search/useStageSearchResults.js';
import { useV3Project } from '../../data/useV3Project.js';
import ModeToggle, { type SpinePlanMode } from '../spine/ModeToggle.js';
import StratumSpine from './StratumSpine.js';
import StratumLockedPopover from './StratumLockedPopover.js';
import ObjectiveColumn from './ObjectiveColumn.js';
import PlanSearchColumn from './PlanSearchColumn.js';
import ObjectiveDetailPanel from './ObjectiveDetailPanel.js';
import ProtocolColumn from './ProtocolColumn.js';
import ProtocolDetailColumn from './ProtocolDetailColumn.js';
import { useProtocolLibrary, filterProtocolGroups } from './useProtocolLibrary.js';
import { useProjectObjectives } from './useProjectObjectives.js';
import { planHeaderProjectTypeLabel } from './planHeaderLabel.js';
import StratumUnlockCelebration from './StratumUnlockCelebration.js';
import PrimarySetModal from './PrimarySetModal.js';
import PrimaryChangeModal from './PrimaryChangeModal.js';
import SecondaryAddModal from './SecondaryAddModal.js';
import SecondaryReopenModal from './SecondaryReopenModal.js';
import SecondaryRemoveBlockedModal from './SecondaryRemoveBlockedModal.js';
import PruneLedgerModal from './PruneLedgerModal.js';
import ObserveGapBanner from './ObserveGapBanner.js';
import CoOccurrenceVerdictBanner from './CoOccurrenceVerdictBanner.js';
import ChronicVerdictBanner from './ChronicVerdictBanner.js';
import { useCoOccurrenceClusters } from '../../../store/reviewFlagStore.js';
import { useChronicVerdicts } from '../../../store/chronicVerdicts.js';
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

// Stable empty array for the ObjectiveDetailPanel `completedItemIds` default, so
// an objective with no effective progress does not feed a fresh array each render.
const EMPTY_COMPLETED: readonly string[] = [];

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

  // Plan Nav v1.1 §8 — transient flash on the objective cards a design tension
  // concerns, fired when the steward clicks a tension row in the banner. Reuses
  // the same flash machinery as `highlightStratumId` (below), but holds an
  // explicit id list (authored mapping resolved by getTensionConcernObjectiveIds)
  // rather than a whole-stratum filter, so it pinpoints the conflicting cards.
  const [tensionHighlightIds, setTensionHighlightIds] = useState<readonly string[]>(
    [],
  );
  const tensionHighlightTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Clear any pending flash timer on unmount so it never fires into a
    // torn-down component.
    return () => {
      if (tensionHighlightTimerRef.current !== null) {
        window.clearTimeout(tensionHighlightTimerRef.current);
      }
    };
  }, []);

  const highlightObjectiveIds = useMemo<readonly string[]>(() => {
    const ids = new Set<string>(tensionHighlightIds);
    if (highlightStratumId) {
      for (const o of objectives) {
        if (
          o.stratumId === highlightStratumId &&
          (objectiveStatuses[o.id] ?? 'locked') !== 'complete'
        ) {
          ids.add(o.id);
        }
      }
    }
    return Array.from(ids);
  }, [highlightStratumId, tensionHighlightIds, objectives, objectiveStatuses]);

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
      search: (prev: Record<string, unknown>) => prev,
    } as never);
  };

  const navigateToObjective = (objectiveId: string, stratumId: string) => {
    if (!projectId) return;
    navigate({
      to: '/v3/project/$projectId/plan/stratum/$stratumId/objective/$objectiveId',
      params: { projectId, stratumId, objectiveId },
    });
  };

  // Plan Nav v1.1 §8 — (re-)arm the transient flash for a tension's concerned
  // objective cards and navigate to a given stratum so they are on screen. The
  // flash id set is the FULL concern set (it persists for HIGHLIGHT_DURATION_MS
  // regardless of which stratum is open), but we navigate to a specific stratum
  // — `resolutionStratumId` for a row click, or a cross-stratum chip's stratum.
  const flashTensionAtStratum = (
    tension: DesignTension,
    stratumId: string,
  ) => {
    const ids = getTensionConcernObjectiveIds(tension, objectives);
    if (tensionHighlightTimerRef.current !== null) {
      window.clearTimeout(tensionHighlightTimerRef.current);
    }
    setTensionHighlightIds(ids);
    tensionHighlightTimerRef.current = window.setTimeout(() => {
      setTensionHighlightIds([]);
      tensionHighlightTimerRef.current = null;
    }, HIGHLIGHT_DURATION_MS);
    const target = findPlanStratum(stratumId);
    if (target) navigateToStratum(target);
  };

  // A tension banner row was clicked — flash the concern set and go to the
  // stratum where the tension resolves.
  const handleSelectTension = (tensionId: string) => {
    const tension = activeTensions.find((t) => t.id === tensionId);
    if (!tension) return;
    flashTensionAtStratum(tension, tension.resolutionStratumId);
  };

  // An "Also in {Stratum}" chip was clicked — re-arm the flash (so the cards
  // light up fresh even after a prior window expired) and navigate to that
  // other stratum, where the tension's cross-stratum concerned cards live.
  const handleSelectTensionStratum = (tensionId: string, stratumId: string) => {
    const tension = activeTensions.find((t) => t.id === tensionId);
    if (!tension) return;
    flashTensionAtStratum(tension, stratumId);
  };

  // For each active tension, the strata its concerned objectives live in OTHER
  // than the one the row navigates to (its `resolutionStratumId`). Surfaced as
  // clickable "Also in {Stratum} (n)" chips in the banner so cross-stratum
  // concerns (e.g. tension-3's `con-s5-fencing-exclusion` in S5) are reachable,
  // not latent. Keyed by tension id; tensions with no cross-stratum concern are
  // omitted.
  const tensionStrataHints = useMemo<
    Record<string, { stratumId: string; label: string; count: number }[]>
  >(() => {
    const map: Record<
      string,
      { stratumId: string; label: string; count: number }[]
    > = {};
    for (const tension of activeTensions) {
      const groups = getTensionConcernsByStratum(tension, objectives);
      const hints = groups
        .filter((g) => g.stratumId !== tension.resolutionStratumId)
        .map((g) => ({
          stratumId: g.stratumId,
          label: findPlanStratum(g.stratumId)?.title ?? g.stratumId,
          count: g.objectiveIds.length,
        }));
      if (hints.length > 0) map[tension.id] = hints;
    }
    return map;
  }, [activeTensions, objectives]);

  // Cross-protocol co-occurrence verdict (shell-level, cross-stratum). When >= 2
  // distinct protocols each hold an OPEN review flag in the same season:cycle
  // bucket, the cluster is a single root-cause-collapse signal -- surfaced once
  // above the strata rather than as N separate single-flag chips.
  //
  // We intentionally do NOT pass a currentBucket here. Window-dormancy is keyed
  // on cycleNumber, which is domain-scoped (getCurrentCycle needs a domainId);
  // this shell is cross-stratum / cross-domain and has no single cycle to supply.
  // A season-only bucket would be a verified no-op anyway -- isFlagDormantByWindow
  // returns false whenever the current cycleNumber is absent -- so window-dormancy
  // is left to the domain-scoped Act/Observe surfaces, and the shell shows every
  // currently-open cluster.
  const coOccurrenceClusters = useCoOccurrenceClusters(projectId || null);
  const [coOccurrenceExpanded, setCoOccurrenceExpanded] = useState(false);
  // Slice #3 (chronic): heavier/structural tier mounted ABOVE the single-cycle
  // co-occurrence banner. Same projectId/no-currentBucket contract as the
  // co-occurrence hook above (cross-stratum shell has no single cycle to supply).
  const chronicVerdicts = useChronicVerdicts(projectId || null);
  const [chronicExpanded, setChronicExpanded] = useState(false);
  const handleCoOccurrenceSelectObjective = (objectiveId: string) => {
    const obj = findPlanStratumObjectiveIn(objectives, objectiveId);
    if (obj) navigateToObjective(obj.id, obj.stratumId);
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
  const changePrimaryType = useProjectStore((s) => s.changePrimaryType);
  const duplicateProject = useProjectStore((s) => s.duplicateProject);
  const addSecondaryType = useProjectStore((s) => s.addSecondaryType);
  const removeSecondaryType = useProjectStore((s) => s.removeSecondaryType);
  const acknowledgeReopening = useProjectStore((s) => s.acknowledgeReopening);
  const deferObjective = usePlanStratumProgressStore((s) => s.deferObjective);
  const undeferObjective = usePlanStratumProgressStore((s) => s.undeferObjective);
  const cloneProgressForProject = usePlanStratumProgressStore((s) => s.cloneForProject);
  const primaryTypeId = typeRecord?.primaryTypeId ?? null;
  const currentSecondaryIds = typeRecord?.secondaryTypeIds ?? [];
  // Plan header — surface the project type (steward: "project type ... used to
  // appear here. Bring it back" + "show all chosen project types instead of
  // hiding it behind +#"). All chosen types, primary first, no cycle number.
  const primaryTypeLabel = planHeaderProjectTypeLabel(primaryTypeId, currentSecondaryIds);

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

  // Protocol Mode is navigated BY stratum (route `…/plan/stratum/$stratumId`),
  // so show only the open stratum's protocols rather than all 7 at once. The
  // route param and `protocol.stratumId` share the `PlanStratumId` format, so
  // the match is exact; a null `activeStratumId` (no open stratum) shows all.
  const stratumProtocolGroups = useMemo(
    () => filterProtocolGroups(protocolLib.groups, activeStratumId),
    [protocolLib.groups, activeStratumId],
  );
  // Tensions reconciled AT the open stratum get highlighted in the banner
  // ("this stratum reconciles these"); the rest are still listed for context.
  const protocolHighlightTensionIds = useMemo(
    () =>
      activeStratumId
        ? activeTensions
            .filter((t) => t.resolutionStratumId === activeStratumId)
            .map((t) => t.id)
        : [],
    [activeTensions, activeStratumId],
  );
  // Selection hygiene: when the open stratum changes, clear protocol selections
  // so the detail stack never orphans to a now-hidden stratum's protocols.
  useEffect(() => {
    setSelectedProtocolIds([]);
  }, [activeStratumId]);

  const [primarySetOpen, setPrimarySetOpen] = useState(false);
  const [primaryChangeOpen, setPrimaryChangeOpen] = useState(false);
  const [secondaryAddOpen, setSecondaryAddOpen] = useState(false);
  const [pruneOpen, setPruneOpen] = useState(false);

  // Mid-project PRIMARY-type change (destructive — re-derives the catalogue).
  // Optionally clones the project under the OLD type first (with its progress)
  // as a backup, then switches in place and discards orphaned progress. The
  // modal owns no writes; this orchestrates clone + switch. Order matters: the
  // clone must capture progress BEFORE changePrimaryType discards it.
  const handleConfirmPrimaryChange = (
    nextPrimaryId: ProjectTypeId,
    opts: { clone: boolean },
  ) => {
    if (opts.clone && primaryTypeId) {
      const oldLabel = findProjectType(primaryTypeId)?.label ?? 'previous type';
      const backup = duplicateProject(
        projectId,
        `${project?.name ?? 'Project'} — ${oldLabel} snapshot`,
      );
      if (backup) cloneProgressForProject(projectId, backup.id);
    }
    changePrimaryType(projectId, nextPrimaryId);
    setPrimaryChangeOpen(false);
  };
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

  // Header Stage Search (Phase 2) — while a query is active, the centre column
  // broadens to a flat, cross-stratum match list (PlanSearchColumn) IN PLACE of
  // the active stratum's ObjectiveColumn. The query lives in the ephemeral
  // stageSearchStore and is cleared on stage change by HeaderStageSearch; we
  // only read it here. Selecting a result navigates to its objective and clears
  // the query, dropping back to the normal stratum column.
  const searchQuery = useStageSearchStore((s) => s.query);
  const clearSearch = useStageSearchStore((s) => s.clear);
  const searchActive = searchQuery.trim() !== '';
  const planSearchMatches = useMemo(
    () => (searchActive ? resolvePlanSearchMatches(objectives, searchQuery) : []),
    [searchActive, objectives, searchQuery],
  );
  const handleSelectSearchResult = (obj: PlanStratumObjective) => {
    clearSearch();
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
      {/* The box-sizing + thin-scrollbar reset that used to be injected here
          inline now lives in spine-theme.css (imported above), so every
          `.olos-spine-root` surface — including the Act protocol rail — inherits
          it without each mount re-declaring it. */}

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
            // A primary IS set — the type line is a control that opens the
            // change-primary modal (consequences + opt-in backup + discard).
            <button
              type="button"
              onClick={() => setPrimaryChangeOpen(true)}
              data-testid="plan-primary-change-trigger"
              title="Change project type"
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
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              {primaryTypeLabel}
            </button>
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

          {/* Compact-ledger trigger (B3) - opens the steward-facing prune modal */}
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setPruneOpen(true)}
              data-testid="compact-ledger-trigger"
              style={{
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
              <Archive size={12} aria-hidden />
              <span>Compact ledger</span>
            </button>
          </div>
        </div>

        {/* Chronic structural verdict (heavier tier -- recurs across cycles) */}
        {chronicVerdicts.length > 0 && (
          <div style={{ padding: '8px 12px 0' }}>
            <ChronicVerdictBanner
              verdicts={chronicVerdicts}
              expanded={chronicExpanded}
              onToggle={() => setChronicExpanded((v) => !v)}
              onSelectObjective={handleCoOccurrenceSelectObjective}
            />
          </div>
        )}

        {/* Cross-protocol co-occurrence verdict (shell-level structural signal) */}
        {coOccurrenceClusters.length > 0 && (
          <div style={{ padding: '8px 12px 0' }}>
            <CoOccurrenceVerdictBanner
              clusters={coOccurrenceClusters}
              expanded={coOccurrenceExpanded}
              onToggle={() => setCoOccurrenceExpanded((v) => !v)}
              onSelectObjective={handleCoOccurrenceSelectObjective}
            />
          </div>
        )}

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
          groups={stratumProtocolGroups}
          statusByTemplate={protocolLib.statusByTemplate}
          selectedIds={selectedProtocolIds}
          onToggle={toggleProtocol}
          tensions={activeTensions}
          highlightTensionIds={protocolHighlightTensionIds}
        />
      ) : searchActive ? (
        <PlanSearchColumn
          query={searchQuery}
          matches={planSearchMatches}
          objectiveStatuses={objectiveStatuses}
          activeObjectiveId={activeObjectiveId}
          onSelectObjective={handleSelectSearchResult}
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
          tensionStrataHints={tensionStrataHints}
          onSelectTension={handleSelectTension}
          onSelectTensionStratum={handleSelectTensionStratum}
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
            completedItemIds={
              effectiveProgress.byObjective[activeObjective.id] ?? EMPTY_COMPLETED
            }
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

      {primaryChangeOpen && primaryTypeId && (
        <PrimaryChangeModal
          projectId={projectId}
          primaryTypeId={primaryTypeId}
          onConfirm={handleConfirmPrimaryChange}
          onDismiss={() => setPrimaryChangeOpen(false)}
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

      {pruneOpen && (
        <PruneLedgerModal
          projectId={projectId}
          onClose={() => setPruneOpen(false)}
        />
      )}
    </div>
  );
}
