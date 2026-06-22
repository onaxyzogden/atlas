/**
 * PlanTierShell — the promoted, store-backed Plan tier shell (default Plan mode).
 *
 * The Plan twin of ActTierShell: the same 4-rail, map-centric chrome, fed by the
 * Plan stores instead of the Act-execution ones. StageShell has no top slot, so
 * the stratum spine wraps ABOVE it; the four rails below bind to live Plan state:
 *
 *   TOP    spine    — Plan dependency rollup per stratum
 *                     (computeAllStratumStates over the LOCKING objective
 *                     statuses; unlike Act's spine, Plan strata DO lock).
 *   LEFT   rail      — useProjectObjectives filtered by the selected stratum,
 *                     each card showing effective checklist progress. The
 *                     Objectives/Protocols mode toggle is LIVE: Protocols mode
 *                     lists the full S1->S7 standing-protocol library
 *                     (protocolScopeStratumId=null) and the RIGHT rail swaps to
 *                     the full-edit PlanProtocolDetailPane. Mode + selection are
 *                     URL-driven (?planMode=protocol&protocol=<id>), mirroring
 *                     the Act rail but with thresholds editable, since Plan is
 *                     where standing protocols are designed.
 *   CENTER canvas    — the EDITABLE Plan design surface (VisionLayoutCanvas),
 *                     NOT Act's read-only substrate. This is the one structural
 *                     divergence from ActTierShell: Plan edits design geometry
 *                     where Act places evidence read-only.
 *   RIGHT  panel     — a Plan dashboard (PlanReadyCue) / the per-objective
 *                     ObjectiveDetailPanel behind a dashboard/detail toggle. The
 *                     panel runs with hideMap (its embedded ObjectiveMap is
 *                     suppressed — the map already lives in the CENTER canvas).
 *   BOTTOM tools     — the same categorized objective tools as Act
 *                     (PlanTierCategorizedToolsRail), PLUS an always-present
 *                     Modules category that opens the legacy PlanModuleSlideUp.
 *
 * Objective + stratum selection is URL-driven via the existing Plan routes
 * (plan/stratum/$stratumId[/objective/$objectiveId]) for deep-link parity with
 * the legacy spine; right-mode + the open module slide-up are local. The legacy
 * PlanStratumShell / module-bar PlanLayout are left untouched (no-deletion rule)
 * and stay reachable via the per-project shell toggle.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, Target } from 'lucide-react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import {
  PLAN_STRATA,
  computeAllObjectiveStatuses,
  computeAllStratumStates,
  findProjectType,
  getObjectiveActTools,
  type PlanStratum,
  type PlanStratumObjective,
} from '@ogden/shared';
import { useProjectStore, MTC_SEED } from '../../../store/projectStore.js';
import {
  selectDeferredObjectives,
  toDeferredSet,
  usePlanStratumProgressStore,
} from '../../../store/planStratumStore.js';
import {
  useDevUnlockStore,
  liftLockedStatuses,
} from '../../../store/devUnlockStore.js';
import { useActEvidenceStore } from '../../../store/actEvidenceStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { usePhaseStore } from '../../../store/phaseStore.js';
import { useServerMachineryInventory } from '../../../hooks/useServerMachineryInventory.js';
import { useDesignElementsForProject } from '../../../store/builtEnvironmentSelectors.js';
import { useActFlowPopoverStore } from '../../act/asBuilt/actFlowPopoverStore.js';
import * as turf from '@turf/turf';
import {
  parcelPolygon,
  clip,
  type PolyFeature,
} from '../engine/zoneGenerators/parcelGeometry.js';
import { toast } from '../../../components/Toast.js';
import { useV3Project } from '../../data/useV3Project.js';
import { useProjectObjectives } from '../strata/useProjectObjectives.js';
import {
  buildPrefillMap,
  type FormPrefillResult,
} from '../../strata/resolveFormPrefill.js';
import { useStewardRoster } from '../../observe/modules/human-context/roster.js';
import { useEffectiveChecklistProgress } from '../../strata/useEffectiveChecklistProgress.js';
import {
  deriveStratum1EvidenceMap,
  deriveStratum1StewardshipMap,
  type VisionDerivedMap,
} from '../../strata/visionProfileToChecklist.js';
import StageShell from '../../_shell/StageShell.js';
import { PlanViewProvider } from '../PlanViewContext.js';
import VisionLayoutCanvas from '../canvas/VisionLayoutCanvas.js';
import PlanPhaseTabs from '../canvas/PlanPhaseTabs.js';
import PlanReadyCue from '../components/PlanReadyCue.js';
import PlanModuleSlideUp from '../PlanModuleSlideUp.js';
import ObjectiveDetailPanel from '../strata/ObjectiveDetailPanel.js';
import PlanProtocolWorkspace from '../strata/PlanProtocolWorkspace.js';
import ProtocolWiringPane from '../strata/ProtocolWiringPane.js';
import ProtocolsEmptyCue from '../strata/ProtocolsEmptyCue.js';
import { useProtocolLibrary } from '../strata/useProtocolLibrary.js';
import StratumLockedPopover from '../strata/StratumLockedPopover.js';
import { pushHabitatFeaturesToSpine } from '../../../features/biodiversity/habitatFeatureSpineSync.js';
import {
  TREE_PLANTING_KINDS,
  pushTreePlantingsToSpine,
} from '../../../features/vegetation/treePlantingSpineSync.js';
import {
  AGROFORESTRY_KINDS,
  pushAgroforestryToSpine,
} from '../../../features/vegetation/agroforestrySpineSync.js';
import { type SpineTypeChip } from '../../act/tier-shell/ActTierSpine.js';
// Plan-only rail-header stratum switcher. Replaces the horizontal spine on
// Plan: it slots into ActTierObjectiveRail's headerSlot and absorbs the spine's
// stratum navigation, threshold checkpoints, and project identity. PlanSpine /
// ActTierSpine are preserved (Act still renders ActTierSpine directly).
import ActTierStratumSwitcher from '../../act/tier-shell/ActTierStratumSwitcher.js';
import {
  THRESHOLDS,
  REACHABLE_THRESHOLD_IDS,
} from '../../act/tier-shell/declarationModel.js';
// Threshold 1 (The Reality Check) -- the Plan-only structural-hinge surface
// mounted on the plan/threshold/$thresholdId route. Both takeovers render in
// place of the editable map / dashboard (no WebGL), so the threshold-active
// branch must sit FIRST in the center + right-rail ternaries below.
import RealityCheckSurface from '../threshold/RealityCheckSurface.js';
import RealityCheckReferenceRail from '../threshold/RealityCheckReferenceRail.js';
import RealityCheckGateBanner from '../threshold/RealityCheckGateBanner.js';
// Threshold 2 (The Coherence Check) -- the Plan-only audit-hinge surface mounted
// on the SAME plan/threshold/$thresholdId route, dispatched by thresholdId. Like
// Threshold 1 it takes over the center + right rail (no WebGL); the branch
// dispatches on params.thresholdId === 'threshold-2' inside the shared
// threshold-active arms below.
import CoherenceCheckSurface from '../threshold/CoherenceCheckSurface.js';
import CoherenceCheckReferenceRail from '../threshold/CoherenceCheckReferenceRail.js';
import CoherenceGateBanner from '../threshold/CoherenceGateBanner.js';
import { deriveCoherenceProgress } from '../threshold/coherenceCheckModel.js';
// Threshold 3 (The Act Mandate) -- the FINAL Plan-stage surface, after the
// terminal stratum (s7). Dispatched on the SAME plan/threshold/$thresholdId
// route by thresholdId === 'threshold-3'; like T1/T2 it takes over the center +
// right rail (no WebGL). Reached three ways (all navigate-only, none arm the
// lock): the clickable T3 switcher row (REACHABLE_THRESHOLD_IDS includes
// threshold-3 since 2026-06-19), a deep-link, or the deliberate s7-terminal
// ActMandateEntryCue mounted in the objective detail.
import ActMandateSurface from '../threshold/ActMandateSurface.js';
import ActMandateReferenceRail from '../threshold/ActMandateReferenceRail.js';
import ActMandateEntryCue from '../threshold/ActMandateEntryCue.js';
import { useObjectivePlanLock } from '../../../store/actMandateStore.js';
import ActTierObjectiveRail from '../../act/tier-shell/ActTierObjectiveRail.js';
import { type RailMode } from '../../act/tier-shell/ActRailModeToggle.js';
import VisionFormsTabsModal from '../../act/tier-shell/VisionFormsTabsModal.js';
import ActTierZeroWorkbench from '../../act/tier-shell/ActTierZeroWorkbench.js';
// Tier-0 Declaration orientation (canonical-object cards + objective sequencing),
// relocated from the DeclarationCenter header band into the right rail (2026-06-22)
// so the center canvas stays focused on the decision list + working panel.
import DeclarationOrientationRail from '../../act/tier-shell/DeclarationOrientationRail.js';
import {
  isTierZeroObjective,
  isTierZeroObjectiveId,
} from '../../act/tier-shell/tierZeroObjectives.js';
// Tier-2 / Stratum-3 Reception (Systems Reading) workbench: the same shared
// ActTierZeroWorkbench runs in mode="reception" for the five resolved S3 surveys,
// with a Plan-only right-rail reference surface. Membership + cross-tier progress
// come from the pure receptionModel; Act never sets the mode -> byte-identical.
import {
  deriveReceptionProgress,
  isReceptionObjective,
  isReceptionObjectiveId,
  receptionTierOf,
} from '../../act/tier-shell/receptionModel.js';
import ReceptionReferencePanel from '../../act/tier-shell/ReceptionReferencePanel.js';
// s2-ecology / s2-terrain survey map takeover (mirrors ActTierShell). Stores are
// shell-agnostic singletons keyed by projectId; the panels are the Act survey
// panels reused unchanged. The layer/draw-host mount inside VisionLayoutCanvas.
import VegetationSurveyPanel from '../../act/ecology/VegetationSurveyPanel.js';
import { useVegetationSurveyStore } from '../../../store/vegetationSurveyStore.js';
import SlopeSurveyPanel from '../../act/terrain/SlopeSurveyPanel.js';
import { useSlopeSurveyStore } from '../../../store/slopeSurveyStore.js';
// Reception (Tier-2 Systems Reading) survey map takeover — the generic
// SurveyPanel renders the rail editor for whichever of the five Stratum-3
// surveys is open (driven by the receptionSurveys registry). Plan-only.
import SurveyPanel from '../reception/SurveyPanel.js';
import {
  useActiveReceptionSurveyEntry,
  useReceptionSurveyRecordCount,
  closeAllReceptionSurveys,
} from '../../../store/receptionSurveys.js';
import { useObjectiveToolsTakeoverStore } from '../../../store/objectiveToolsTakeoverStore.js';
// Sectors editor reused unchanged from Act (stage-neutral UI flag + panel):
// clicking the Plan SectorCompass HUD takes the right rail over with the editor,
// mirroring ActTierShell.
import { useActSectorsEditorStore } from '../../act/sectors/actSectorsEditorStore.js';
import SectorsEditorPanel from '../../act/sectors/SectorsEditorPanel.js';
import OpenMapToolsButton from '../../_shared/map-takeover/OpenMapToolsButton.js';
import ObjectiveToolsPanel from '../../_shared/map-takeover/ObjectiveToolsPanel.js';
import ActFlowConnectorPopover from '../../act/asBuilt/ActFlowConnectorPopover.js';
import { decodeSteward, stewardInvitesToQueued } from '../../act/tier-shell/StewardCapture.js';
import { FORAGE_PREFIX, planForagePaddockReconcile } from '../../act/tier-shell/ForageCapture.js';
import {
  generateAndApplyLivestockWork,
  isLivestockCaptureForm,
} from '../../../features/livestock/livestockWorkInputs.js';
import {
  generateAndApplyCommunityWork,
  isCommunityCaptureForm,
} from '../../../features/community/communityWorkInputs.js';
import { useLivestockWorkPlanStore } from '../../../store/livestockWorkPlanStore.js';
import {
  ACT_TOOL_CATEGORIES,
  resolveActTools,
  type ActTool,
  type FormValue,
} from '../../act/tier-shell/actToolCatalog.js';
import { QUICK_LOGS } from '../../act/quickLogs.js';
import { computeChecklistProgress } from '../../act/tier-shell/objectiveProgress.js';
import { resolveActStratumId } from '../../act/tier-shell/resolveActStratumId.js';
import PlanToolDock from './PlanToolDock.js';
import PlanTierSearchRail from './PlanTierSearchRail.js';
import { useStageSearchStore } from '../../../store/stageSearchStore.js';
import { resolvePlanSearchMatches } from '../../search/useStageSearchResults.js';
import { resolvePlanTools } from './planToolCatalog.js';
import type { PlanTool } from './planToolCatalog.js';
import type { PlanModule, PlanView } from '../types.js';
import styles from '../../act/tier-shell/ActTierShell.module.css';

const FALLBACK_CENTROID: [number, number] = [-78.2, 44.5];
// Stable empty fallbacks for the actEvidence selectors so they never return a
// fresh object literal — which would trip an infinite re-render loop under
// Zustand v5 (getSnapshot result must be referentially stable). Mirrors the
// EMPTY_FORMS / EMPTY_FORM_DATA pattern in ActTierShell.
const EMPTY_FORMS: Readonly<Record<string, string>> = Object.freeze({});
const EMPTY_FORM_DATA: Readonly<Record<string, FormValue>> = Object.freeze({});
// Stable empty fallbacks for the decision-rationale / deferred-decisions
// selectors (same Zustand-v5 referential-stability reason as the form ones).
const EMPTY_RATIONALES: Readonly<Record<string, string>> = Object.freeze({});
const EMPTY_DEFERRED: Readonly<Record<string, true>> = Object.freeze({});
const EMPTY_COMPLETED: readonly string[] = [];
// Stable empty pre-fill map (same Zustand-v5 referential-stability discipline).
const EMPTY_PREFILL: Readonly<Record<string, FormPrefillResult>> =
  Object.freeze({});
const STRATUM_IDS = PLAN_STRATA.map((s) => s.id);
// S1 is the canonical cold-entry fallback (see ActTierShell). PLAN_STRATA is
// non-empty, but noUncheckedIndexedAccess types [0] as possibly-undefined.
const S1_STRATUM_ID = PLAN_STRATA[0]?.id ?? 's1-project-foundation';

type RightMode = 'dashboard' | 'detail';

export default function PlanTierShell() {
  const params = useParams({ strict: false }) as {
    projectId?: string;
    objectiveId?: string;
    stratumId?: string;
    thresholdId?: string;
  };
  const id = params.projectId ?? 'mtc';
  const objectiveId = params.objectiveId ?? null;
  // Threshold-route flag. Present ONLY on plan/threshold/$thresholdId (the route
  // guard already redirected away if the threshold is not open), so it is
  // mutually exclusive with every objective/stratum-driven takeover below: it
  // carries no objectiveId, and each existing arm requires selectedObjective or
  // a takeover store flag. The threshold branch therefore sits first.
  const thresholdActive = !!params.thresholdId;
  const navigate = useNavigate();

  // Left-rail mode + protocol selection are URL-driven (same ?planMode/?protocol
  // params the Act rail uses, validated by validatePlanSearch on all 3 plan
  // routes). Plan has no evaluation engine, so there is never a triggered set.
  const search = useSearch({ strict: false }) as {
    planMode?: 'protocol';
    protocol?: string;
    // One-shot deep-link flag: "arm this tool on arrival" — set by the Act
    // search rail's "Open in Plan" control, consumed + stripped on mount below.
    armTool?: string;
  };
  const railMode: RailMode =
    search.planMode === 'protocol' ? 'protocols' : 'objectives';
  const selectedProtocolId = search.protocol ?? null;

  // Header Stage Search (objectives + domains) — mirrors the Act tier shell. The
  // ephemeral stageSearchStore is written by HeaderStageSearch; when a query is
  // active the left rail swaps to a cross-stratum match list (PlanTierSearchRail)
  // in place of the normal per-stratum objective rail.
  const searchQuery = useStageSearchStore((s) => s.query);
  const clearSearch = useStageSearchStore((s) => s.clear);
  const searchActive = searchQuery.trim().length > 0;

  // LocalProject (projectStore) — drives the spine identity tile + the
  // PlanModuleSlideUp panels (which take a LocalProject).
  const projects = useProjectStore((s) => s.projects);
  const project = useMemo(
    () => projects.find((p) => p.id === id || p.serverId === id) ?? MTC_SEED,
    [projects, id],
  );

  // v3 Project (adapter seam) — drives the editable canvas geometry + the
  // ObjectiveDetailPanel (which takes the v3 Project shape).
  const v3Project = useV3Project(params.projectId);
  const boundary = v3Project?.location.boundary;
  const fallbackCenter = v3Project?.location.center ?? FALLBACK_CENTROID;

  // Resolved per-project objective set (universal + primary/secondary types).
  const { objectives } = useProjectObjectives(id);

  // Single source of truth: effective checklist progress = stored
  // planStratumStore progress UNIONED with wizard-derived S1 completion. The
  // SAME hook Plan + Act consume, so no surface drifts.
  const effectiveProgress = useEffectiveChecklistProgress(id, objectives);

  // Steward Deferred overrides — threaded into the status engine so deferred
  // objectives resolve to `deferred` (and keep dependents locked) without any
  // progress change.
  const deferredObjectiveIds = usePlanStratumProgressStore((s) =>
    selectDeferredObjectives(s, id),
  );
  const deferredSet = useMemo(
    () => toDeferredSet(deferredObjectiveIds),
    [deferredObjectiveIds],
  );

  // Stage-Zero Vision Builder + Team bridges — pre-satisfy a subset of the S1
  // checklist for the in-panel evidence chips (the status engine already
  // unions these via effectiveProgress.flatMap). Mirrors PlanStratumShell.
  const visionProfile = useProjectStore(
    (s) => s.projects.find((p) => p.id === id)?.metadata?.visionProfile,
  );
  const visionDerivedMap = useMemo(
    () => deriveStratum1EvidenceMap(visionProfile),
    [visionProfile],
  );
  const team = useProjectStore(
    (s) => s.projects.find((p) => p.id === id)?.metadata?.team,
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

  // DEV-only "Unlock all" toggle lifts every `locked` → `available`.
  const unlockAll = useDevUnlockStore((s) => s.unlockAll);
  // Plan LOCKING status engine (the gate that decides what the steward may
  // open). Unlike Act's never-lock execution rollup, THIS is what feeds the
  // spine + the per-objective lock affordance.
  const objectiveStatuses = useMemo(() => {
    const computed = computeAllObjectiveStatuses(
      objectives,
      effectiveProgress.flatMap,
      deferredSet,
    );
    return unlockAll && import.meta.env.DEV
      ? liftLockedStatuses(computed)
      : computed;
  }, [objectives, effectiveProgress, deferredSet, unlockAll]);
  const stratumStates = useMemo(
    () => computeAllStratumStates(STRATUM_IDS, objectives, objectiveStatuses),
    [objectives, objectiveStatuses],
  );
  const lockedStratumIds = useMemo(
    () =>
      new Set(STRATUM_IDS.filter((sid) => stratumStates[sid] === 'locked')),
    [stratumStates],
  );
  const [lockedPopoverStratum, setLockedPopoverStratum] =
    useState<PlanStratum | null>(null);

  // Rail cards reflect CHECKLIST completion (effective progress), agreeing with
  // the right-rail detail panel's "N/M steps".
  const checklistProgressByObjective = useMemo(
    () => computeChecklistProgress(objectives, effectiveProgress.byObjective),
    [objectives, effectiveProgress],
  );

  // Cross-stratum search matches (objectives widened by their mapped Observe
  // domains). Only computed while a query is active; [] otherwise so the rail
  // swap below gates cheaply on searchActive.
  const planSearchMatches = useMemo(
    () => (searchActive ? resolvePlanSearchMatches(objectives, searchQuery) : []),
    [searchActive, objectives, searchQuery],
  );

  // Project-type label for the spine identity tile (same source Plan reads).
  const typeRecord = project.metadata?.projectTypeRecord;
  const primaryTypeId = typeRecord?.primaryTypeId ?? null;
  const secondaryTypeIds = typeRecord?.secondaryTypeIds ?? [];
  // Per-type chips for the switcher identity row (Plan Declaration chrome): one
  // primary chip + one chip per secondary, each resolved to its human label.
  // Passed to the rail-header ActTierStratumSwitcher. Empty when no primary
  // type is set.
  const spineTypeChips = useMemo<SpineTypeChip[]>(() => {
    if (!primaryTypeId) return [];
    const chips: SpineTypeChip[] = [
      {
        label: findProjectType(primaryTypeId)?.label ?? primaryTypeId,
        kind: 'primary',
      },
    ];
    for (const sid of secondaryTypeIds) {
      chips.push({ label: findProjectType(sid)?.label ?? sid, kind: 'secondary' });
    }
    return chips;
  }, [primaryTypeId, secondaryTypeIds]);

  // Resolved standing-protocol library for this project's types — the same hook
  // the left rail's ProtocolLayerPanel calls internally (memoised on type
  // identity, so no extra recompute). Order is S1→S7 and the Plan rail spans the
  // whole library (protocolScopeStratumId={null}), so templates[0] is exactly the
  // first card the steward sees. A type-less project (e.g. mtc) resolves zero.
  const { templates: protocolTemplates } = useProtocolLibrary(
    id,
    primaryTypeId,
    secondaryTypeIds,
  );
  const firstProtocolId = protocolTemplates[0]?.id ?? null;
  const protocolsAvailable = protocolTemplates.length > 0;

  // URL is the single source of truth for the rendered stratum: explicit
  // $stratumId param → the selected objective's owning stratum → S1.
  const selectedObjective = useMemo(
    () => objectives.find((o) => o.id === objectiveId) ?? null,
    [objectives, objectiveId],
  );
  const selectedStratumId = useMemo(
    () =>
      resolveActStratumId({
        paramStratumId: params.stratumId,
        validStratumIds: STRATUM_IDS,
        objectiveStratumId: selectedObjective?.stratumId,
        fallbackStratumId: S1_STRATUM_ID,
      }),
    [params.stratumId, selectedObjective],
  );
  const selectedStratum = useMemo(
    () => PLAN_STRATA.find((s) => s.id === selectedStratumId),
    [selectedStratumId],
  );
  const stratumObjectives = useMemo(
    () => objectives.filter((o) => o.stratumId === selectedStratumId),
    [objectives, selectedStratumId],
  );
  const selectedObjectiveStratum = useMemo(
    () =>
      selectedObjective
        ? PLAN_STRATA.find((t) => t.id === selectedObjective.stratumId)
        : undefined,
    [selectedObjective],
  );
  const selectedObjectiveStatus = selectedObjective
    ? objectiveStatuses[selectedObjective.id] ?? 'locked'
    : 'locked';

  // Threshold-3 (Act Mandate) lock for the active objective. False until Begin
  // Act arms `planReadOnly`. The SHARED workbench (ActTierZeroWorkbench) cannot
  // read this store itself -- it is also Act's surface, and a hook call there
  // would lock Act -- so the Plan host derives it here and threads it down as the
  // `readOnly` prop. (ObjectiveDetailPanel is Plan-only and self-derives, so it
  // needs no prop.) Hook called unconditionally with a '' fallback id.
  const activeObjectiveLocked = useObjectivePlanLock(
    id,
    selectedObjective?.id ?? '',
  );

  // s2-ecology / s2-terrain draw-on-map survey takeover (mirrors ActTierShell:433-447).
  // When a survey is open for THIS project AND its objective is the active route,
  // the Tier-0 workbench yields to the editable map canvas (see the
  // showTierZeroWorkbench gate below) so the steward can draw community/slope
  // polygons; the right rail swaps to the survey panel and VisionLayoutCanvas
  // mounts the survey layer + draw host. The store stays "open" but latent on
  // other objectives, so returning to s2-ecology/s2-terrain resumes the survey.
  const surveyOpen = useVegetationSurveyStore(
    (s) => s.active && s.activeProjectId === id,
  );
  const surveyActive = surveyOpen && objectiveId === 's2-ecology';
  const slopeOpen = useSlopeSurveyStore(
    (s) => s.active && s.activeProjectId === id,
  );
  const slopeActive = slopeOpen && objectiveId === 's2-terrain';

  // Reception (Tier-2 Systems Reading) draw-on-map survey takeover. One of the
  // five Stratum-3 survey stores can be open for THIS project; the active entry
  // (or null) folds all five into one reactive read so the shell stays
  // survey-count-blind. Active only when that survey's objective is also the
  // active route (parity with slope/veg above) — so it stays latent elsewhere.
  // The drawn-feature total across all five stores feeds the reception progress.
  const activeReceptionSurvey = useActiveReceptionSurveyEntry(id);
  const receptionSurveyActive =
    activeReceptionSurvey != null &&
    activeReceptionSurvey.objectiveId === objectiveId;
  // Which reception tier the active survey is in (doc Tier 1 Land Reading = the
  // six S2 surveys; doc Tier 2 Systems Reading = the five S3 surveys). Keyed off
  // the URL-synchronous objectiveId first (cold-deep-link safe, like the
  // membership checks above), then the resolved objective. Defaults to 'tier2'
  // so a non-reception objective and the existing S3 mounts are unchanged.
  // Computed here (ahead of the record-count read) so the survey total is
  // tier-scoped -- the Tier-1 view counts only its four s2-* surveys, the
  // Tier-2 view only its five s3-* surveys (no cross-tier record leak).
  const receptionTier =
    receptionTierOf(objectiveId ?? selectedObjective?.id) ?? 'tier2';
  const receptionRecordCount = useReceptionSurveyRecordCount(id, receptionTier);

  // Generic objective-tools takeover (the shell-agnostic generalization of the
  // two bespoke surveys above): any draw/place objective whose catalog resolves
  // to >= 1 map tool can flip into a focused map+tools mode via
  // OpenMapToolsButton. Active only when the store is open for THIS project AND
  // the route's objective matches, so it stays latent on other objectives
  // exactly like the survey takeovers.
  const toolsTakeoverActive = useObjectiveToolsTakeoverStore(
    (s) =>
      s.active &&
      s.activeProjectId === id &&
      s.activeObjectiveId === objectiveId,
  );

  // Sectors-editor rail takeover (mirrors the survey/slope takeovers above, but
  // stage-neutral — the store carries no project/objective key, so the flag is a
  // plain boolean). Armed by clicking the SectorCompass HUD on the map canvas.
  const sectorsEditorActive = useActSectorsEditorStore((s) => s.active);

  // Tier-0 swap flag: render the interactive decision workbench in place of the
  // editable map canvas when the selected objective is a non-spatial Tier-0 one
  // ("Plan decides" — the workbench moved here from Act). Keyed off the
  // URL-synchronous objectiveId first so a cold deep-link never transiently
  // mounts VisionLayoutCanvas (WebGL) before objectives hydrate; falls back to
  // the resolved-objective check for in-app selections. An armed survey on
  // s2-ecology/s2-terrain suppresses the workbench so the map takeover wins.
  // The same inline workbench now hosts TWO Plan-only modes: Tier-0 Declaration
  // (Stratum-1) and Tier-2 Reception (Stratum-3 systems-reading surveys). Both
  // are keyed off the URL-synchronous objectiveId first (cold deep-link safe),
  // then the resolved-objective check. Reception membership comes from the
  // receptionModel display set; the two id-sets are disjoint.
  const isTierZeroWorkbenchObjective =
    isTierZeroObjectiveId(objectiveId) ||
    (selectedObjective != null && isTierZeroObjective(selectedObjective));
  const isReceptionWorkbenchObjective =
    isReceptionObjectiveId(objectiveId) ||
    (selectedObjective != null && isReceptionObjective(selectedObjective));
  const showTierZeroWorkbench =
    (isTierZeroWorkbenchObjective || isReceptionWorkbenchObjective) &&
    !surveyActive &&
    !slopeActive &&
    // A reception (Tier-2) survey takeover yields the workbench to the editable
    // map canvas so the steward can draw that survey's systems-reading extents,
    // exactly like the bespoke s2-ecology/s2-terrain surveys above.
    !receptionSurveyActive &&
    // A generic map-tools takeover also yields the workbench to the map (so a
    // Tier-0 draw/place objective can reach its draw hosts), exactly like the
    // bespoke survey takeovers above.
    !toolsTakeoverActive &&
    // An open sectors editor keeps the compass-bearing map canvas mounted in
    // the center, even on a Tier-0 objective, so the rail editor has a live
    // compass to edit against (same precedent as the survey takeovers).
    !sectorsEditorActive;
  // Which mode the workbench runs in (reception wins when the objective is one of
  // the five S3 surveys; otherwise the legacy Declaration header). Declaration is
  // the default so a non-reception Tier-0 objective is unchanged.
  const workbenchMode: 'declaration' | 'reception' = isReceptionWorkbenchObjective
    ? 'reception'
    : 'declaration';
  // Tier-0 orientation rail visibility. The canonical-object cards + objective
  // sequencing are TIER-LEVEL (they describe all of Stratum 1 / Tier 0), not
  // per-objective detail, so they ride the right rail across EVERY Project-
  // Foundation objective -- including the spatial/map ones (e.g. the
  // decision-makers/stakeholders objective) where the editable map, not the
  // Declaration workbench, fills the center. Gated purely on the active stratum
  // being S1; the takeover branches in the rail ternary still replace the whole
  // rail when one is armed (this flag is only consulted in the final else, which
  // those branches precede). Stratum 1 carries no Reception (S3) objectives, so
  // the orientation is always the Declaration set here.
  const showFoundationOrientation = selectedStratumId === S1_STRATUM_ID;
  // (receptionTier is computed above, ahead of the survey record-count read.)
  // Cross-tier reception progress (Tier 1 Land-Reading + Tier 2 Systems-Reading
  // completion + the assembled survey-record total). Derived from the FULL
  // resolved objective list (not the current stratum slice) so both tier totals
  // are visible; fed to both the ReceptionCenter gate cards and the right-rail
  // reference panel. Cheap + pure, so computed unconditionally.
  const receptionProgress = useMemo(
    () =>
      deriveReceptionProgress(objectives, objectiveStatuses, receptionRecordCount),
    [objectives, objectiveStatuses, receptionRecordCount],
  );

  // Threshold 2 (Coherence Check) open-state: derived from the FULL resolved
  // objective list -- opens once every s4 + s5 design objective is complete
  // (mirrors receptionProgress.thresholdOpen for Threshold 1). Cheap + pure, so
  // computed unconditionally. DISPLAY-ONLY -- it does NOT gate reachability
  // (thresholds are deliberately always-clickable, see REACHABLE_THRESHOLD_IDS,
  // commit 7b23c547); it is consumed by CoherenceCheckSurface as an honest
  // early-state readiness banner when the Tier 3/4 design is still unfinished.
  const coherenceProgress = useMemo(
    () => deriveCoherenceProgress(objectives, objectiveStatuses),
    [objectives, objectiveStatuses],
  );

  const [rightMode, setRightMode] = useState<RightMode>(
    objectiveId ? 'detail' : 'dashboard',
  );
  // URL drives detail/dashboard: a selected objective shows detail; clearing it
  // falls back to the dashboard. A local toggle can still flip to dashboard
  // while an objective is selected.
  useEffect(() => {
    setRightMode(objectiveId ? 'detail' : 'dashboard');
  }, [objectiveId]);

  // Center canvas view. Opens on Current Land (the existing-state surface) by
  // default; PlanPhaseTabs lets the steward swap current ⇄ vision over the same
  // canvas, exactly as the legacy module-bar PlanLayout does.
  const [activeView, setActiveView] = useState<PlanView>('current');

  // The Modules-category tools open this slide-up. Local state (the tier-shell
  // route carries no $module param, so the panel renders purely from its
  // `module` prop — see PlanModuleSlideUp, cards = MODULE_CARDS[module]).
  const [slideUpModule, setSlideUpModule] = useState<PlanModule | null>(null);

  // ── Spine-sync effects (ported verbatim from PlanLayout) ──────────────────
  // Habitat / tree-planting / agroforestry DesignElements bridge to D0 work
  // items. Keyed on a stable id+kind+phase signature so they don't re-fire on
  // cosmetic re-renders. Behaviour preserved 1:1 from the module-bar shell.
  const planDesignElements = useDesignElementsForProject(id);
  const habitatFeatureSignature = useMemo(
    () =>
      planDesignElements
        .filter((el) => el.category === 'habitat')
        .map((el) => `${el.id}:${el.kind}:${el.phase}`)
        .sort()
        .join('|'),
    [planDesignElements],
  );
  useEffect(() => {
    if (!id) return;
    pushHabitatFeaturesToSpine(id);
  }, [id, habitatFeatureSignature]);

  const treePlantingSignature = useMemo(
    () =>
      planDesignElements
        .filter(
          (el) =>
            el.category === 'vegetation' &&
            (TREE_PLANTING_KINDS as readonly string[]).includes(el.kind) &&
            el.geometry.type === 'Point',
        )
        .map((el) => `${el.id}:${el.kind}:${el.phase}`)
        .sort()
        .join('|'),
    [planDesignElements],
  );
  useEffect(() => {
    if (!id) return;
    pushTreePlantingsToSpine(id);
  }, [id, treePlantingSignature]);

  const agroforestrySignature = useMemo(
    () =>
      planDesignElements
        .filter((el) =>
          (AGROFORESTRY_KINDS as readonly string[]).includes(el.kind),
        )
        .map((el) => `${el.id}:${el.kind}:${el.phase}`)
        .sort()
        .join('|'),
    [planDesignElements],
  );
  useEffect(() => {
    if (!id) return;
    pushAgroforestryToSpine(id);
  }, [id, agroforestrySignature]);

  // Seed the default phases so the inline draw popovers' Phase select renders
  // real options, and hydrate the machinery inventory — both ported from
  // PlanLayout so the tier shell's design canvas behaves identically.
  useEffect(() => {
    usePhaseStore.getState().ensureDefaults(id);
  }, [id]);
  useServerMachineryInventory(id === 'mtc' ? undefined : id);

  // ── Form-arm machinery (reused from ActTierShell verbatim) ────────────────
  const [openFormGroup, setOpenFormGroup] = useState<{
    title: string;
    tools: ActTool[];
    activeFormId: string;
  } | null>(null);
  const visionForms = useActEvidenceStore(
    (s) => s.visionForms[id] ?? EMPTY_FORMS,
  );
  const visionFormData = useActEvidenceStore(
    (s) => s.visionFormData[id] ?? EMPTY_FORM_DATA,
  );
  // Non-destructive pre-fill suggestions for the open form group, drawn from the
  // steward roster + prior objectives (resolveFormPrefill). Memoised on its
  // inputs; passed to the modal as prefillByFormId. Never writes / auto-completes
  // -- a suggestion applies to the local draft only on an explicit "Use this".
  const roster = useStewardRoster(id);
  const prefillByFormId = useMemo(
    () =>
      openFormGroup
        ? buildPrefillMap(openFormGroup.tools, {
            profiles: roster.map((r) => r.profile),
            objectives,
            activeObjectiveId: selectedObjective?.id ?? null,
            savedFormData: visionFormData,
            savedFormText: visionForms,
          })
        : EMPTY_PREFILL,
    [openFormGroup, roster, objectives, selectedObjective, visionFormData, visionForms],
  );
  // Decision rationale + deferral state for the Tier-0 workbench (now hosted in
  // Plan), keyed by itemId under this project. Stable empty fallbacks above.
  const decisionRationales = useActEvidenceStore(
    (s) => s.decisionRationale[id] ?? EMPTY_RATIONALES,
  );
  const deferredDecisions = useActEvidenceStore(
    (s) => s.deferredDecisions[id] ?? EMPTY_DEFERRED,
  );
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);

  const handleFormSave = useCallback(
    (formId: string, text: string) => {
      useActEvidenceStore.getState().saveVisionForm(id, formId, text);
      // The formId IS the checklist item id (1:1 per actToolCatalog design).
      // Mark it complete (add-only) so the detail-panel checklist reflects the
      // capture.
      if (objectiveId) {
        usePlanStratumProgressStore
          .getState()
          .setItemComplete(id, objectiveId, formId);
      }
    },
    [id, objectiveId],
  );

  const handleFormDataSave = useCallback(
    (formId: string, value: FormValue, summary: string) => {
      useActEvidenceStore.getState().saveVisionFormData(id, formId, value, summary);
      // Steward-capture invite reconcile (RBAC RW4) — mirror the parallel-array
      // FormValue invites into metadata.team.queuedInvites.
      if (formId === 's1-vision-steward') {
        const queued = stewardInvitesToQueued(
          decodeSteward(value),
          new Date().toISOString(),
        );
        useProjectStore.getState().reconcileStewardInvites(id, queued);
      }
      // Forage survey — re-derive the forage-owned paddock set from the c1 zone
      // register and reconcile it into the livestock store.
      if (formId.startsWith(FORAGE_PREFIX)) {
        const c1 =
          useActEvidenceStore.getState().visionFormData[id]?.[
            `${FORAGE_PREFIX}-c1`
          ] ?? {};
        const existing = useLivestockStore
          .getState()
          .paddocks.filter((p) => p.projectId === id);
        const { upserts, deleteIds } = planForagePaddockReconcile(
          c1,
          existing,
          id,
        );
        const ls = useLivestockStore.getState();
        deleteIds.forEach((d) => ls.deletePaddock(d));
        upserts.forEach((p) =>
          useLivestockStore.getState().paddocks.some((x) => x.id === p.id)
            ? ls.updatePaddock(p.id, p)
            : ls.addPaddock(p),
        );
      }
      if (objectiveId) {
        usePlanStratumProgressStore
          .getState()
          .setItemComplete(id, objectiveId, formId);
      }
      // Livestock work-management layer: a husbandry / grazing / intent
      // decision save regenerates the PROPOSAL layer (never the spine —
      // sovereign steward) and surfaces a "Review in Act" toast deep-linking
      // the Act work panel, so generated work is reviewed where it runs.
      if (isLivestockCaptureForm(formId)) {
        generateAndApplyLivestockWork(id);
        const proposedCount = useLivestockWorkPlanStore
          .getState()
          .proposals.filter(
            (p) => p.projectId === id && p.status === 'proposed',
          ).length;
        if (proposedCount > 0) {
          toast.action(
            'info',
            `${proposedCount} work item${proposedCount === 1 ? '' : 's'} proposed — review in Act`,
            {
              label: 'Review in Act',
              onClick: () =>
                navigate({
                  to: '/v3/project/$projectId/act/tier-shell',
                  params: { projectId: id },
                  search: { panel: 'work', workFilter: 'proposed' },
                } as never),
            },
          );
        }
      } else if (isCommunityCaptureForm(formId)) {
        // Community work-management layer: a governance / membership /
        // legal / settlement / onboarding decision save regenerates the
        // PROPOSAL layer (never the spine — sovereign steward) and surfaces
        // the same "Review in Act" toast. The count is the proposed-proposal
        // total returned by the community generation seam.
        const proposedCount = generateAndApplyCommunityWork(id);
        if (proposedCount > 0) {
          toast.action(
            'info',
            `${proposedCount} work item${proposedCount === 1 ? '' : 's'} proposed — review in Act`,
            {
              label: 'Review in Act',
              onClick: () =>
                navigate({
                  to: '/v3/project/$projectId/act/tier-shell',
                  params: { projectId: id },
                  search: { panel: 'work', workFilter: 'proposed' },
                } as never),
            },
          );
        }
      }
    },
    [id, objectiveId, navigate],
  );

  const handleSaveRationale = useCallback(
    (itemId: string, text: string) => {
      useActEvidenceStore.getState().saveDecisionRationale(id, itemId, text);
    },
    [id],
  );
  const handleToggleDefer = useCallback(
    (itemId: string, deferred: boolean) => {
      useActEvidenceStore.getState().setDecisionDeferred(id, itemId, deferred);
      // Marking a recorded decision "Not ready" un-records it so the completed
      // appearance + progress credit are undone (the captured form data is kept,
      // so re-recording is one click). Remove-only + idempotent: a no-op when the
      // item was never recorded, and we never re-record on un-defer.
      if (deferred && objectiveId) {
        usePlanStratumProgressStore
          .getState()
          .clearItemComplete(id, objectiveId, itemId);
      }
    },
    [id, objectiveId],
  );

  // ── Navigation (bound to the existing Plan routes) ────────────────────────
  const goToStratum = useCallback(
    (stratumId: string) => {
      if (!params.projectId) return;
      navigate({
        to: '/v3/project/$projectId/plan/stratum/$stratumId',
        params: { projectId: params.projectId, stratumId },
      });
    },
    [navigate, params.projectId],
  );

  const goToObjective = useCallback(
    (nextObjectiveId: string | null, stratumId: string) => {
      if (!params.projectId) return;
      if (nextObjectiveId) {
        navigate({
          to: '/v3/project/$projectId/plan/stratum/$stratumId/objective/$objectiveId',
          params: {
            projectId: params.projectId,
            stratumId,
            objectiveId: nextObjectiveId,
          },
        });
      } else {
        goToStratum(stratumId);
      }
    },
    [navigate, params.projectId, goToStratum],
  );

  // Left-rail Objectives/Protocols toggle → rewrite ?planMode on the current
  // path (`to: '.'`, the planMode pattern), so it works from the bare, stratum,
  // and objective routes alike. Entering Protocols preserves any held ?protocol;
  // leaving drops it (objectives mode has no protocol selection). `replace`
  // keeps mode churn out of history.
  const handleRailModeChange = useCallback(
    (next: RailMode) => {
      navigate({
        to: '.',
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          planMode: next === 'protocols' ? 'protocol' : undefined,
          protocol: next === 'protocols' ? prev?.protocol : undefined,
        }),
        replace: true,
      } as never);
    },
    [navigate],
  );

  // Protocol card click → open it in the center workspace. Under the workspace
  // model there is no "dashboard" to deselect back to, so selecting a protocol
  // always opens it (no toggle-off) — and auto-select would immediately re-fill a
  // cleared selection anyway. Writes ?planMode=protocol&protocol=<id> on the
  // current path; `replace` keeps selection churn out of history.
  const handleSelectProtocol = useCallback(
    (templateId: string) => {
      navigate({
        to: '.',
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          planMode: 'protocol',
          protocol: templateId,
        }),
        replace: true,
      } as never);
    },
    [navigate],
  );

  // Protocols mode auto-selects the first protocol so the center mounts the
  // workspace immediately instead of a bare cue. Fires only when the library has
  // entries — a type-less project (e.g. mtc) resolves none, so the empty cue
  // shows instead. Single fire: once ?protocol is set, selectedProtocolId is
  // truthy and the guard stops it.
  useEffect(() => {
    if (railMode === 'protocols' && !selectedProtocolId && firstProtocolId) {
      handleSelectProtocol(firstProtocolId);
    }
  }, [railMode, selectedProtocolId, firstProtocolId, handleSelectProtocol]);

  const handleSelectStratum = useCallback(
    (stratumId: string) => {
      // Honour the Plan prerequisite gate: a locked stratum opens the
      // explanatory popover instead of navigating.
      if ((stratumStates[stratumId] ?? 'locked') === 'locked') {
        setLockedPopoverStratum(
          PLAN_STRATA.find((s) => s.id === stratumId) ?? null,
        );
        return;
      }
      goToStratum(stratumId);
    },
    [goToStratum, stratumStates],
  );

  const handleSelectObjective = useCallback(
    (nextObjectiveId: string) => {
      // Re-selecting the active objective DESELECTS it (back to the stratum).
      if (nextObjectiveId === objectiveId) {
        goToObjective(null, selectedStratumId);
        return;
      }
      // Honour the Plan prerequisite gate.
      if ((objectiveStatuses[nextObjectiveId] ?? 'locked') === 'locked') {
        toast.warning('Locked until its prerequisites are complete.');
        return;
      }
      const target = objectives.find((o) => o.id === nextObjectiveId);
      setRightMode('detail');
      goToObjective(nextObjectiveId, target?.stratumId ?? selectedStratumId);
    },
    [goToObjective, objectiveId, objectiveStatuses, objectives, selectedStratumId],
  );

  // Search-result selection: clear the query (so the rail swaps back) then reveal
  // the objective. Honours the SAME Plan prerequisite lock as handleSelectObjective
  // — a locked match warns instead of navigating (the route guard would redirect
  // anyway, but warning here is the kinder affordance).
  const handleSelectSearchObjective = useCallback(
    (objective: PlanStratumObjective) => {
      clearSearch();
      if ((objectiveStatuses[objective.id] ?? 'locked') === 'locked') {
        toast.warning('Locked until its prerequisites are complete.');
        return;
      }
      setRightMode('detail');
      goToObjective(objective.id, objective.stratumId);
    },
    [clearSearch, objectiveStatuses, goToObjective],
  );

  // ── Tool dispatch (Act arms 1:1 + the Plan-only `module` arm) ─────────────
  const handleActivateTool = useCallback(
    (tool: PlanTool, formObjective?: PlanStratumObjective | null) => {
      const arm = tool.arm;
      // Plan-only: open the matching module slide-up. No persistent armed state.
      if (arm.kind === 'module') {
        setSlideUpModule(arm.module);
        return;
      }
      if (arm.kind === 'map') {
        // Toggle: a second click on the already-armed tool disarms it. The draw
        // hosts mounted inside VisionLayoutCanvas pick the id up by prefix.
        const current = useMapToolStore.getState().activeTool;
        if (current === arm.mapToolId) {
          setActiveTool(null);
          return;
        }
        setActiveTool(arm.mapToolId);
        return;
      }
      if (arm.kind === 'form') {
        // Open ONE tabbed popup holding every kind:'form' tool in this tool's
        // category, focused on the clicked tab.
        const ownerForForms = formObjective ?? selectedObjective;
        const formTools = (
          ownerForForms
            ? resolveActTools(getObjectiveActTools(ownerForForms))
            : []
        ).filter((t) => t.arm.kind === 'form' && t.category === tool.category);
        const cat = ACT_TOOL_CATEGORIES.find((c) => c.id === tool.category);
        setOpenFormGroup({
          title: cat?.label ?? 'Forms',
          tools: formTools.length ? formTools : [tool as unknown as ActTool],
          activeFormId: arm.formId,
        });
        return;
      }
      if (arm.kind === 'flow') {
        // Non-spatial material-flow capture: open the Act-owned popover (mounted
        // once below; renders through Modal).
        useActFlowPopoverStore.getState().openPopover();
        return;
      }
      if (arm.kind === 'zone-action') {
        // Imperative post-seed actions on the ring-seeded zones (store + turf;
        // feedback is toast-only).
        const zoneState = useZoneStore.getState();
        if (arm.action === 'clear') {
          const removed = zoneState.clearSeededZones(id);
          if (removed === 0) toast.info('No seeded zones to clear.');
          else toast.success(`Cleared ${removed} seeded zone(s).`);
          return;
        }
        const proj = useProjectStore
          .getState()
          .projects.find((p) => p.id === id);
        const parcel = parcelPolygon(proj?.parcelBoundaryGeojson ?? null);
        if (!parcel) {
          toast.warning('Draw the parcel boundary first to trim against it.');
          return;
        }
        const seeded = zoneState.zones.filter(
          (z) => z.projectId === id && z.seedProvenance === 'ring-seed',
        );
        let trimmed = 0;
        let dropped = 0;
        for (const z of seeded) {
          const clipped = clip(turf.feature(z.geometry) as PolyFeature, parcel);
          if (!clipped) {
            zoneState.deleteZone(z.id);
            dropped += 1;
            continue;
          }
          zoneState.updateZone(z.id, {
            geometry: clipped.geometry,
            areaM2: turf.area(clipped),
          });
          trimmed += 1;
        }
        if (trimmed === 0 && dropped === 0) {
          toast.info('No seeded zones to trim.');
        } else {
          toast.success(
            `Trimmed ${trimmed} seeded zone(s) to the parcel` +
              (dropped > 0 ? `; removed ${dropped} fully outside.` : '.'),
          );
        }
        return;
      }
      // Field log (harvest / water / livestock) — arm the QuickLog's map tool.
      const log = QUICK_LOGS.find((l) => l.id === arm.quickLogId);
      if (log?.toolId) setActiveTool(log.toolId);
    },
    [setActiveTool, selectedObjective, id],
  );

  // ── Arm-on-arrival (Act → Plan "Open in Plan" handoff) ────────────────────
  // When the route carries ?armTool=<id> and the matching objective has resolved
  // on the Plan canvas (not the Tier-0 decision workbench, which suppresses the
  // tools rail), arm that tool then strip the param. Stripping makes the effect
  // re-run as a no-op, so it fires exactly once. A locked target never reaches
  // here — the route's beforeLoad guard redirects it to /plan first.
  const armToolId = search.armTool ?? null;
  useEffect(() => {
    if (!armToolId) return;
    if (!selectedObjective || selectedObjective.id !== objectiveId) return;
    if (showTierZeroWorkbench) return;
    const tool = resolvePlanTools(getObjectiveActTools(selectedObjective)).find(
      (t) => t.id === armToolId,
    );
    if (tool) handleActivateTool(tool, selectedObjective);
    // Strip ?armTool regardless of whether it resolved, so a stale/unknown id
    // can't re-fire the effect on every render.
    navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => {
        const { armTool: _drop, ...rest } = prev;
        return rest;
      },
      replace: true,
    } as never);
  }, [
    armToolId,
    selectedObjective,
    objectiveId,
    showTierZeroWorkbench,
    handleActivateTool,
    navigate,
  ]);

  return (
    <PlanViewProvider view={activeView}>
      <div className={styles.tierShell}>
        {/*
          The horizontal Plan spine is hidden: its stratum navigation, threshold
          checkpoints, and project identity now live in the rail-header
          ActTierStratumSwitcher (passed below as ActTierObjectiveRail's
          headerSlot). ActTierSpine / PlanSpine are preserved for reuse.
        */}
        <div className={styles.shellWrap}>
          {showTierZeroWorkbench && !selectedObjective && railMode !== 'protocols' ? (
            // Tier-0 route resolved before its objective set hydrated: hold a
            // lightweight non-map placeholder rather than mounting the WebGL
            // VisionLayoutCanvas (which would wedge the headless preview).
            // Protocols mode never needs an objective, so it always falls through
            // to StageShell even on a stale tier-zero deep-link.
            <div
              className={styles.tierZeroLoading}
              role="status"
              aria-live="polite"
            >
              <span className={styles.tierZeroLoadingText}>Loading…</span>
            </div>
          ) : (
          <StageShell
            bottomPlacement="between-rails"
            symmetricRails
            canvasLabel="Plan tier canvas"
            leftRailLabel="Stratum objectives"
            rightRailLabel="Dashboard and objective detail"
            leftRail={
              searchActive ? (
                <PlanTierSearchRail
                  query={searchQuery}
                  matches={planSearchMatches}
                  progressByObjective={checklistProgressByObjective}
                  activeObjectiveId={objectiveId}
                  onSelectObjective={handleSelectSearchObjective}
                />
              ) : (
              <ActTierObjectiveRail
                stratum={selectedStratum}
                objectives={stratumObjectives}
                progressByObjective={checklistProgressByObjective}
                activeObjectiveId={objectiveId}
                onSelectObjective={handleSelectObjective}
                // Plan-only: the rail header IS the stratum switcher (the
                // horizontal spine is hidden). It absorbs everything the spine
                // carried -- stratum tabs, the reachable threshold checkpoints,
                // and project identity. While a threshold surface is open its
                // name shows in the collapsed header (mirrors the old spine's
                // activeStratumId='' rule). Act passes no headerSlot -> its
                // static railHeader renders, byte-identical.
                headerSlot={
                  <ActTierStratumSwitcher
                    strata={PLAN_STRATA}
                    stratumStates={stratumStates}
                    lockedStratumIds={lockedStratumIds}
                    activeStratumId={thresholdActive ? '' : selectedStratumId}
                    activeStratum={selectedStratum}
                    thresholds={THRESHOLDS}
                    clickableThresholdIds={[...REACHABLE_THRESHOLD_IDS]}
                    thresholdActiveId={params.thresholdId}
                    onSelectStratum={handleSelectStratum}
                    onSelectThreshold={(thresholdId) =>
                      navigate({
                        to: '/v3/project/$projectId/plan/threshold/$thresholdId',
                        params: { projectId: id, thresholdId },
                      })
                    }
                    projectTitle={project.name}
                    typeChips={spineTypeChips}
                  />
                }
                // Protocols mode is LIVE in Plan: the toggle drives ?planMode,
                // and the protocols list spans the full S1->S7 library
                // (protocolScopeStratumId={null}) rather than the active stratum.
                // Plan runs no evaluation engine, so triggeredCount is always 0.
                mode={railMode}
                onModeChange={handleRailModeChange}
                triggeredCount={0}
                projectId={id}
                primaryTypeId={primaryTypeId}
                secondaryTypeIds={secondaryTypeIds}
                activeStratumId={selectedStratumId}
                protocolScopeStratumId={null}
                selectedProtocolId={selectedProtocolId}
                onSelectProtocol={handleSelectProtocol}
              />
              )
            }
            canvas={
              thresholdActive ? (
                // Threshold center takeovers. First arm so the WebGL
                // VisionLayoutCanvas never mounts on a threshold route. The
                // shared `plan/threshold/$thresholdId` route carries all three,
                // so dispatch on params.thresholdId: 'threshold-3' -> the Act
                // Mandate; 'threshold-2' -> the Coherence Check audit; anything
                // else -> the Reality Check.
                params.thresholdId === 'threshold-3' ? (
                  // Threshold 3 (The Act Mandate) center takeover -- the final
                  // Plan-stage surface. Assembles the resolved design + the two
                  // prior threshold records into the handoff to Act; Plan-only,
                  // no map.
                  <ActMandateSurface
                    projectId={id}
                    projectName={project.name}
                    objectives={objectives}
                    objectiveStatuses={objectiveStatuses}
                  />
                ) : params.thresholdId === 'threshold-2' ? (
                  // Threshold 2 (The Coherence Check) center takeover. Audits
                  // the shipped s4 + s5 design objectives (Sections A/B/C);
                  // Plan-only, no map.
                  <CoherenceCheckSurface
                    projectId={id}
                    projectName={project.name}
                    primaryTypeId={primaryTypeId}
                    objectives={objectives}
                    objectiveStatuses={objectiveStatuses}
                    coherenceProgress={coherenceProgress}
                  />
                ) : (
                  // Threshold 1 (The Reality Check) center takeover. Reads the
                  // Tier-0 intent + survey evidence internally; no map.
                  <RealityCheckSurface
                    projectId={id}
                    projectName={project.name}
                    objectives={objectives}
                    objectiveStatuses={objectiveStatuses}
                  />
                )
              ) : railMode === 'protocols' ? (
                // Protocols mode takes over the center: a two-pane workspace
                // (mechanics editor + meaning context) where the steward designs
                // the standing protocol. Placing this branch first guarantees the
                // WebGL VisionLayoutCanvas never mounts in Protocols mode.
                selectedProtocolId ? (
                  <PlanProtocolWorkspace
                    projectId={id}
                    primaryTypeId={primaryTypeId}
                    secondaryTypeIds={secondaryTypeIds}
                    templateId={selectedProtocolId}
                  />
                ) : (
                  <ProtocolsEmptyCue hasProtocols={protocolsAvailable} />
                )
              ) : showTierZeroWorkbench && selectedObjective ? (
                // Interactive decision workbench (moved here from Act): replaces
                // the editable map for non-spatial Tier-0 objectives. Writes flow
                // to the shared actEvidence + planStratumProgress stores via the
                // same handlers the tools-rail form path uses.
                <ActTierZeroWorkbench
                  projectId={id}
                  objectives={stratumObjectives}
                  activeObjectiveId={selectedObjective.id}
                  primaryTypeId={primaryTypeId}
                  secondaryTypeIds={secondaryTypeIds}
                  progressByObjective={effectiveProgress.byObjective}
                  formValues={visionFormData}
                  rationales={decisionRationales}
                  deferredItems={deferredDecisions}
                  onRecord={handleFormDataSave}
                  onSaveRationale={handleSaveRationale}
                  onToggleDefer={handleToggleDefer}
                  // Plan-only workbench chrome. mode="declaration" mounts the
                  // DeclarationCenter header (Tier-0 canonical cards + sequencing)
                  // above the 2-pane grid; mode="reception" mounts ReceptionCenter
                  // (Tier-2 systems-reading mode header + survey sequencing +
                  // Threshold-1 gate) and threads the dual-output chip / intent
                  // lens / builds-on into the list + working panel. Both drive off
                  // the live LOCKING statuses; sequencing nodes select via the same
                  // prerequisite-gated handler the left rail uses. The Act stage
                  // omits mode entirely -> byte-identical legacy workbench.
                  mode={workbenchMode}
                  objectiveStatuses={objectiveStatuses}
                  receptionProgress={receptionProgress}
                  receptionTier={receptionTier}
                  onSelectObjective={handleSelectObjective}
                  // Threshold-3 lock: when the active Plan objective is locked
                  // (post Begin Act) the shared workbench renders display-only.
                  // Defaults false in Act (the prop is absent there), so Act stays
                  // byte-identical.
                  readOnly={activeObjectiveLocked}
                />
              ) : (
                <div
                  style={{ position: 'relative', width: '100%', height: '100%' }}
                >
                  <VisionLayoutCanvas
                    projectId={id}
                    centroid={fallbackCenter}
                    boundary={boundary}
                    view={activeView}
                    surveyActive={surveyActive}
                    slopeActive={slopeActive}
                    receptionActive={receptionSurveyActive}
                    sourceObjectiveId={objectiveId}
                    onOpenSectorsEditor={() => {
                      // Mutually-exclusive rail takeovers (mirror
                      // ActTierShell:1176-1185): clear any survey / slope /
                      // reception / objective-tools session before arming the
                      // sectors editor so the rail never has two claimants.
                      useVegetationSurveyStore.getState().close();
                      useSlopeSurveyStore.getState().close();
                      closeAllReceptionSurveys();
                      useObjectiveToolsTakeoverStore.getState().close();
                      useActSectorsEditorStore.getState().open();
                    }}
                  />
                  <PlanPhaseTabs active={activeView} onChange={setActiveView} />
                </div>
              )
            }
            rightRail={
              // Threshold reference rail (first arm, mirrors the center
              // takeover). Read-only; no objective/takeover state, so it
              // precedes them all. Dispatch on params.thresholdId to match the
              // center arm: 'threshold-2' -> the Coherence audit digest,
              // otherwise the Reality Check digest.
              thresholdActive ? (
                <div className={styles.rightRail}>
                  <div className={styles.rightBody}>
                    {params.thresholdId === 'threshold-3' ? (
                      <ActMandateReferenceRail
                        projectId={id}
                        objectives={objectives}
                        objectiveStatuses={objectiveStatuses}
                      />
                    ) : params.thresholdId === 'threshold-2' ? (
                      <CoherenceCheckReferenceRail
                        projectId={id}
                        primaryTypeId={primaryTypeId}
                        objectives={objectives}
                        objectiveStatuses={objectiveStatuses}
                      />
                    ) : (
                      <RealityCheckReferenceRail
                        projectId={id}
                        objectives={objectives}
                        objectiveStatuses={objectiveStatuses}
                      />
                    )}
                  </div>
                </div>
              ) : // Generic objective-tools takeover: while armed for THIS objective,
              // the focused map-tools panel replaces the rail (parity with the
              // survey takeovers below). Done in the panel clears the store.
              toolsTakeoverActive && selectedObjective ? (
                <div className={styles.rightRail}>
                  <div className={styles.rightBody}>
                    <ObjectiveToolsPanel
                      projectId={id}
                      objective={selectedObjective}
                    />
                  </div>
                </div>
              ) : // Survey rail takeover (mirrors ActTierShell:1126-1139): while a
              // survey is armed on s2-ecology/s2-terrain, the panel replaces the
              // dashboard/detail toggle. Done in the panel clears the store.
              surveyActive ? (
                <div className={styles.rightRail}>
                  <div className={styles.rightBody}>
                    <VegetationSurveyPanel projectId={id} />
                  </div>
                </div>
              ) : slopeActive ? (
                <div className={styles.rightRail}>
                  <div className={styles.rightBody}>
                    <SlopeSurveyPanel projectId={id} />
                  </div>
                </div>
              ) : receptionSurveyActive && activeReceptionSurvey ? (
                // Reception (Tier-2 Systems Reading) survey takeover: while one
                // of the five Stratum-3 surveys is armed on its objective, the
                // generic SurveyPanel replaces the rail (parity with the
                // veg/slope panels above). The bundle drives every class row +
                // tool id; the 2.5 stock-water panel surfaces the
                // stock-water-demand formula reference via `footnote`. Done in
                // the panel clears the active tool + closes the store.
                <div className={styles.rightRail}>
                  <div className={styles.rightBody}>
                    <SurveyPanel
                      bundle={activeReceptionSurvey.bundle}
                      projectId={id}
                      title={selectedObjective?.title ?? 'Reception survey'}
                      footnote={
                        activeReceptionSurvey.objectiveId ===
                        'silv-sec-s3-stock-water'
                          ? 'Stock-water demand = herd size x species daily intake x climate factor (peak-season). Draw the served reach and any seasonal-shortfall zones to read supply against that demand; this records the observed picture, not an allocation.'
                          : undefined
                      }
                    />
                  </div>
                </div>
              ) : sectorsEditorActive ? (
                // Sectors-editor takeover (mirrors ActTierShell:1348-1355):
                // clicking the floating SectorCompass HUD swaps the rail to the
                // editor. Done in the panel clears the store. Reciprocity is
                // structural — while this is active the rail hides the
                // OpenMapToolsButton / survey triggers, so no other takeover can
                // be armed without first closing this one.
                <div className={styles.rightRail}>
                  <div className={styles.rightBody}>
                    <SectorsEditorPanel projectId={id} />
                  </div>
                </div>
              ) : railMode === 'protocols' ? (
                // Protocols mode: the editor now lives in the center workspace, so
                // the right rail carries the WIRING & STATE summary (stratum,
                // objective anchor, feeds-into, lifecycle status, expected rate) —
                // the complement of the center MEANING pane. Dashboard cue until a
                // protocol is picked. No Objective tab — protocols mode has no
                // objective selection.
                <div className={styles.rightRail}>
                  <div className={styles.rightBody}>
                    {selectedProtocolId ? (
                      <ProtocolWiringPane
                        projectId={id}
                        primaryTypeId={primaryTypeId}
                        secondaryTypeIds={secondaryTypeIds}
                        templateId={selectedProtocolId}
                      />
                    ) : (
                      <ProtocolsEmptyCue
                        hasProtocols={protocolsAvailable}
                        compact
                      />
                    )}
                  </div>
                </div>
              ) : isReceptionWorkbenchObjective && selectedObjective ? (
                // Plan Reception: the right rail is the read-only systems-reading
                // REFERENCE surface for the selected survey (still-listening rule
                // + intent lens + dual Observe/Act outputs + builds-on +
                // cross-tier progress). The capture itself is the center working
                // panel; this is its sibling reference, like the dashboard/detail
                // toggle it replaces. No Act analog -- Act never sets
                // mode="reception". Reached only after the takeover + protocols
                // branches above fall through, so a map/tools takeover still wins.
                <div className={styles.rightRail}>
                  <div className={styles.rightBody}>
                    <ReceptionReferencePanel
                      objective={selectedObjective}
                      status={selectedObjectiveStatus}
                      progress={receptionProgress}
                      tier={receptionTier}
                    />
                  </div>
                </div>
              ) : (
              <div className={styles.rightRail}>
                {/* Tier-0 orientation: the canonical-object cards + objective-
                    sequencing diagram, relocated from the center header band
                    (2026-06-22). Persistently at the TOP of the rail (above the
                    Dashboard/Detail toggle) across EVERY Stratum-1 Project-
                    Foundation objective -- including the spatial/map ones, where
                    the center is the editable map rather than the Declaration
                    workbench (operator decision 2026-06-22: tier-level orientation
                    should not vanish when moving between foundation objectives).
                    Fed the stratum slice + statuses; the sequencing nodes select
                    objectives via handleSelectObjective. */}
                {showFoundationOrientation ? (
                  <DeclarationOrientationRail
                    objectives={stratumObjectives}
                    objectiveStatuses={objectiveStatuses}
                    activeObjectiveId={selectedObjective?.id}
                    onSelectObjective={handleSelectObjective}
                  />
                ) : null}
                <div
                  className={styles.rightToggle}
                  role="tablist"
                  aria-label="Right rail mode"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rightMode === 'dashboard'}
                    className={styles.rightToggleBtn}
                    data-active={rightMode === 'dashboard'}
                    onClick={() => setRightMode('dashboard')}
                  >
                    <LayoutDashboard size={14} aria-hidden="true" />
                    Dashboard
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rightMode === 'detail'}
                    className={styles.rightToggleBtn}
                    data-active={rightMode === 'detail'}
                    disabled={!objectiveId}
                    onClick={() => objectiveId && setRightMode('detail')}
                  >
                    <Target size={14} aria-hidden="true" />
                    Objective
                  </button>
                </div>
                <div className={styles.rightBody}>
                  {rightMode === 'detail' &&
                  selectedObjective &&
                  selectedObjectiveStratum ? (
                    <>
                      {/* Soft Mode-4 gate (Threshold 1). Renders only on the
                          four Design strata: an amber "approve Threshold 1
                          first" reminder while unapproved, the Conditional/
                          Deferred/Released register once approved. Derived +
                          display-only -- it NEVER blocks navigation and NEVER
                          touches prerequisiteObjectiveIds; returns null off
                          Mode-4 so Reception details are undisturbed. */}
                      <RealityCheckGateBanner
                        projectId={id}
                        stratumId={selectedObjectiveStratum.id}
                        objectives={objectives}
                        objectiveStatuses={objectiveStatuses}
                      />
                      {/* Soft Coherence seal banner (Threshold 2). Renders only
                          on the two downstream strata (s6 / s7): an amber "seal
                          the Coherence Check first" reminder while unsealed, a
                          calm "sealed" reading once sealed. Derived + display-
                          only -- it NEVER blocks navigation and NEVER touches
                          STRATUM_PREREQS; returns null off s6 / s7. */}
                      <CoherenceGateBanner
                        projectId={id}
                        stratumId={selectedObjectiveStratum.id}
                      />
                      {/* Contextual doorway into Threshold 3 (The Act Mandate).
                          Self-gates to the terminal stratum (s7) only -- the one
                          place the steward crosses from planning into doing. One
                          of several navigate-only entry paths (alongside the
                          clickable T3 switcher row and a deep-link); the one-way
                          crossing is entered via the surface's own CTA. Plan-only. */}
                      <ActMandateEntryCue
                        projectId={id}
                        stratumId={selectedObjectiveStratum.id}
                      />
                      {/* Generic "Open map with tools" CTA — self-gates to
                          objectives that resolve to >= 1 map draw/place tool, so
                          it appears only for spatial objectives (the two bespoke
                          surveys keep their own richer summary buttons). */}
                      <OpenMapToolsButton
                        projectId={id}
                        objective={selectedObjective}
                      />
                      <ObjectiveDetailPanel
                        key={selectedObjective.id}
                        projectId={id}
                        stratum={selectedObjectiveStratum}
                        objective={selectedObjective}
                        status={selectedObjectiveStatus}
                        project={v3Project}
                        onBackToStratum={(stratum) => goToStratum(stratum.id)}
                        completedItemIds={
                          effectiveProgress.byObjective[selectedObjective.id] ??
                          EMPTY_COMPLETED
                        }
                        visionDerivedMap={derivedMap}
                        // The map lives in the CENTER canvas; suppress the
                        // panel's embedded ObjectiveMap so it isn't duplicated.
                        hideMap
                        // Threshold-3 lock (explicit; the panel also self-derives
                        // the same value -- this keeps the wiring symmetric with
                        // the workbench above). False until Begin Act.
                        readOnly={activeObjectiveLocked}
                      />
                    </>
                  ) : (
                    <PlanReadyCue projectId={params.projectId ?? null} />
                  )}
                </div>
              </div>
              )
            }
            bottomTray={
              // The threshold surface is non-spatial -- no objective tools dock
              // (mirrors the Tier-0 workbench suppression).
              thresholdActive || showTierZeroWorkbench ? undefined : (
                <PlanToolDock
                  objective={selectedObjective}
                  disabled={!params.projectId}
                  onActivate={handleActivateTool}
                  activeFormId={openFormGroup?.activeFormId ?? null}
                />
              )
            }
          />
          )}
        </div>
        {!showTierZeroWorkbench && (
          <VisionFormsTabsModal
            open={openFormGroup !== null}
            title={openFormGroup?.title ?? ''}
            tools={openFormGroup?.tools ?? []}
            activeFormId={openFormGroup?.activeFormId ?? ''}
            initialValues={visionForms}
            initialData={visionFormData}
            prefillByFormId={prefillByFormId}
            projectId={id}
            metadata={project.metadata ?? null}
            checklistItems={selectedObjective?.checklist ?? []}
            onTabChange={(formId) =>
              setOpenFormGroup((g) => (g ? { ...g, activeFormId: formId } : g))
            }
            onSave={handleFormSave}
            onSaveData={handleFormDataSave}
            onClose={() => setOpenFormGroup(null)}
          />
        )}
        {/* Material-flow popover singleton (renders through Modal). Mounted so
            the inherited Act `flow` tool arm has somewhere to render. */}
        <ActFlowConnectorPopover projectId={id} />
        <PlanModuleSlideUp
          module={slideUpModule}
          open={slideUpModule !== null}
          onClose={() => setSlideUpModule(null)}
          project={project}
          onSwitchModule={(mod) => setSlideUpModule(mod)}
        />
        {lockedPopoverStratum && (
          <StratumLockedPopover
            stratum={lockedPopoverStratum}
            objectives={objectives}
            objectiveStatuses={objectiveStatuses}
            currentObjectiveId={objectiveId ?? null}
            onAcknowledge={(obj) => {
              setLockedPopoverStratum(null);
              setRightMode('detail');
              goToObjective(obj.id, obj.stratumId);
            }}
            onDismiss={() => setLockedPopoverStratum(null)}
          />
        )}
      </div>
    </PlanViewProvider>
  );
}
