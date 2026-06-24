/**
 * ActTierShell — the promoted, store-backed Act tier shell (default Act mode).
 *
 * The 4-rail map-centric shape validated as a throwaway in ActProtoTierShell,
 * rebuilt on real data. StageShell has no top slot, so the stratum spine wraps
 * ABOVE it; the four rails below are each bound to live stores:
 *
 *   TOP    spine    — real Act-execution rollup per stratum
 *                     (computeAllActStratumStates; never locks).
 *   LEFT   rail      — useProjectObjectives filtered by the selected stratum,
 *                     each card showing real field-action progress.
 *   CENTER map       — the exact read-only Act substrate ActMapFirstLayout
 *                     mounts, PLUS objective markers and ActDrawHost so the
 *                     bottom tools actually arm map tools.
 *   RIGHT  panel     — the already-real ActOpsDashboard / ActTierExecutionPanel
 *                     (progress + checklist + ephemeral evidence capture)
 *                     behind a dashboard/detail toggle.
 *   BOTTOM tools     — real QUICK_LOGS; arming a tool sets the active module +
 *                     the map tool, which ActDrawHost picks up.
 *
 * Objective selection is URL-driven (act/tier-shell/$objectiveId) for deep-link
 * parity with field-action; stratum + right-mode + armed-module are local.
 * The tier-prototype/ folder is left untouched (no-deletion rule); this shell
 * copies its shape and CSS rather than importing them.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, Target, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useTriggeredProtocols } from '../../../store/protocolStore.js';
import {
  PLAN_STRATA,
  computeAllActStratumStates,
  computeAllObjectiveStatuses,
  computeAllStratumStates,
  findProjectType,
  getObjectiveActTools,
  type PlanStratum,
  type PlanStratumObjective,
} from '@ogden/shared';
import {
  useProjectStore,
  MTC_SEED,
} from '../../../store/projectStore.js';
import {
  selectFieldActionsForProject,
  useFieldActionStore,
} from '../../../store/fieldActionStore.js';
import {
  selectDeferredObjectives,
  toDeferredSet,
  usePlanStratumProgressStore,
} from '../../../store/planStratumStore.js';
import {
  useDevUnlockStore,
  liftLockedStatuses,
} from '../../../store/devUnlockStore.js';
import StratumLockedPopover from '../../plan/strata/StratumLockedPopover.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { toast } from '../../../components/Toast.js';
import * as turf from '@turf/turf';
import {
  parcelPolygon,
  clip,
  type PolyFeature,
} from '../../plan/engine/zoneGenerators/parcelGeometry.js';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import {
  extractBoundaryGeometry,
  boundaryCentroid,
  renderablePolygon,
} from '../../../lib/geo.js';
import { useV3Project } from '../../data/useV3Project.js';
import { useProjectObjectives } from '../../plan/strata/useProjectObjectives.js';
import {
  buildPrefillMap,
  type FormPrefillResult,
} from '../../strata/resolveFormPrefill.js';
import { useStewardRoster } from '../../observe/modules/human-context/roster.js';
import DiagnoseMap from '../../components/DiagnoseMap.js';
import BaseMapCard from '../../plan/canvas/BaseMapCard.js';
import PlanZoneRingsOverlay from '../../plan/layers/PlanZoneRingsOverlay.js';
import PlanSunPathOverlay from '../../plan/layers/PlanSunPathOverlay.js';
import PlanScheduledMovesOverlay from '../../plan/layers/PlanScheduledMovesOverlay.js';
import PlanWaterRouterOverlay from '../../plan/layers/PlanWaterRouterOverlay.js';
import MapToolbar from '../../observe/components/MapToolbar.js';
import MapSheetExportControl from '../../plan/MapSheetExportControl.js';
import ObserveAnnotationLayers from '../../observe/components/layers/ObserveAnnotationLayers.js';
import SectorCompassOverlay from '../../observe/components/overlays/SectorCompassOverlay.js';
import PlanDataLayers from '../../plan/layers/PlanDataLayers.js';
import DesignElementLayers from '../../plan/canvas/layers/DesignElementLayers.js';
import StageShell from '../../_shell/StageShell.js';
import ActDataLayers from '../layers/ActDataLayers.js';
import ActStructureClickHandler from '../layers/ActStructureClickHandler.js';
import ActFeatureClickHandler from '../layers/ActFeatureClickHandler.js';
import ActStructurePopover from '../ActStructurePopover.js';
import ActAsBuiltPopover from '../asBuilt/ActAsBuiltPopover.js';
import { useActAsBuiltPopoverStore } from '../asBuilt/actAsBuiltPopoverStore.js';
import SectorsEditorPanel from '../sectors/SectorsEditorPanel.js';
import { useActSectorsEditorStore } from '../sectors/actSectorsEditorStore.js';
import VegetationSurveyPanel from '../ecology/VegetationSurveyPanel.js';
import VegetationSurveyLayer from '../ecology/VegetationSurveyLayer.js';
import VegetationSurveyDrawHost from '../ecology/VegetationSurveyDrawHost.js';
import { useVegetationSurveyStore } from '../../../store/vegetationSurveyStore.js';
import SlopeSurveyPanel from '../terrain/SlopeSurveyPanel.js';
import SlopeSurveyLayer from '../terrain/SlopeSurveyLayer.js';
import SlopeSurveyDrawHost from '../terrain/SlopeSurveyDrawHost.js';
import { useSlopeSurveyStore } from '../../../store/slopeSurveyStore.js';
import { useObjectiveToolsTakeoverStore } from '../../../store/objectiveToolsTakeoverStore.js';
import OpenMapToolsButton from '../../_shared/map-takeover/OpenMapToolsButton.js';
import ObjectiveToolsPanel from '../../_shared/map-takeover/ObjectiveToolsPanel.js';
import ActAsBuiltDrawHandler from '../asBuilt/ActAsBuiltDrawHandler.js';
import ActFlowConnectorPopover from '../asBuilt/ActFlowConnectorPopover.js';
import { useActFlowPopoverStore } from '../asBuilt/actFlowPopoverStore.js';
import ActDrawHost from '../draw/ActDrawHost.js';
import ObserveDrawHost from '../../observe/components/draw/ObserveDrawHost.js';
import AnnotationDragHandler from '../../observe/components/draw/AnnotationDragHandler.js';
import AnnotationVertexEditHandler from '../../observe/components/draw/AnnotationVertexEditHandler.js';
import AnnotationFormSlideUp from '../../observe/components/draw/AnnotationFormSlideUp.js';
import SelectionFloater from '../../observe/components/SelectionFloater.js';
import AnnotationDetailPanel from '../../observe/components/AnnotationDetailPanel.js';
import PlanDrawHost from '../../plan/draw/PlanDrawHost.js';
import ActOpsDashboard from '../field-action/ActOpsDashboard.js';
import { seedActionsIfEmpty } from '../field-action/seedDemoActions.js';
import type { ActModule } from '../types.js';
import { QUICK_LOGS } from '../quickLogs.js';
import {
  computeChecklistProgress,
  computeObjectiveProgress,
} from './objectiveProgress.js';
import { useEffectiveChecklistProgress } from '../../strata/useEffectiveChecklistProgress.js';
import { computeObjectiveMarkerPositions } from './objectiveMarkerGeometry.js';
import { type SpineTypeChip } from './ActTierSpine.js';
import ActTierStratumSwitcher from './ActTierStratumSwitcher.js';
import ActTierObjectiveRail from './ActTierObjectiveRail.js';
import ActSearchRail from './ActSearchRail.js';
import { useViewScope } from '../../roles/useViewScope.js';
import { collectAlwaysSurface } from '../../roles/alwaysSurface.js';
import { useDivergedDomains } from '../../observe/dashboard/revision/useDivergedDomains.js';
import type { RailMode } from './ActRailModeToggle.js';
import ActTierMapMarkers from './ActTierMapMarkers.js';
import ProtocolMapMarkers from './ProtocolMapMarkers.js';
import CommunityMeetingMarker from './CommunityMeetingMarker.js';
import CommunityMeetingPlaceDrawHandler from './CommunityMeetingPlaceDrawHandler.js';
import ActTierCategorizedToolsRail from './ActTierCategorizedToolsRail.js';
import ActTierExecutionPanel from './ActTierExecutionPanel.js';
import ActMandateBriefingCard from './ActMandateBriefingCard.js';
import ActProtocolDetailPane from './ActProtocolDetailPane.js';
import ActTierWeatherPanel from './ActTierWeatherPanel.js';
import ActWorkPanel from './work/ActWorkPanel.js';
import ActWorkHighlightLayer from './work/ActWorkHighlightLayer.js';
import WorkCalendarTakeover from './work/WorkCalendarTakeover.js';
import VisionFormsTabsModal from './VisionFormsTabsModal.js';
import {
  isTierZeroObjective,
  isTierZeroObjectiveId,
} from './tierZeroObjectives.js';
import { decodeSteward, stewardInvitesToQueued } from './StewardCapture.js';
import { FORAGE_PREFIX, planForagePaddockReconcile } from './ForageCapture.js';
import {
  ACT_TOOL_CATEGORIES,
  resolveActTools,
  type ActTool,
  type FormValue,
} from './actToolCatalog.js';
import { useActEvidenceStore } from '../../../store/actEvidenceStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useStageSearchStore } from '../../../store/stageSearchStore.js';
import { useMemberStore } from '../../../store/memberStore.js';
import { useAuthStore } from '../../../store/authStore.js';
import { useReviewFlagCountsByObjective } from '../../../store/reviewFlagStore.js';
import { useActTaskSync } from '../../../hooks/useActTaskSync.js';
import { resolveActSearchMatches } from '../../search/useStageSearchResults.js';
import type { ActToolMatch } from '../../search/useStageSearchResults.js';
import { resolveActStratumId } from './resolveActStratumId.js';
import styles from './ActTierShell.module.css';

const FALLBACK_CENTROID: [number, number] = [-78.2, 44.5];
// Stable empty fallback for the visionForms selector so it never returns a
// new object literal, which would trigger an infinite React re-render loop
// under Zustand v5 (getSnapshot result must be referentially stable).
const EMPTY_FORMS: Readonly<Record<string, string>> = Object.freeze({});
// Stable empty fallback for the visionFormData selector so it never returns a
// fresh object (which would re-render every store update).
const EMPTY_FORM_DATA: Readonly<Record<string, FormValue>> = Object.freeze({});
// Stable empty pre-fill map (same Zustand-v5 referential-stability discipline).
const EMPTY_PREFILL: Readonly<Record<string, FormPrefillResult>> =
  Object.freeze({});
const STRATUM_IDS = PLAN_STRATA.map((s) => s.id);
const NOOP_RAIL_MODE = (_: RailMode) => {};
const NOOP_PROTOCOL = (_: string) => {};
const EMPTY_TRIGGERED_IDS: readonly string[] = [];
// S1 is the canonical cold-entry fallback. PLAN_STRATA is non-empty, but
// noUncheckedIndexedAccess types [0] as possibly-undefined — guard with the
// known S1 id literal so the derived stratum id stays a plain string.
const S1_STRATUM_ID = PLAN_STRATA[0]?.id ?? 's1-project-foundation';

type RightMode = 'dashboard' | 'detail';

export default function ActTierShell() {
  const params = useParams({ strict: false }) as {
    projectId?: string;
    objectiveId?: string;
    stratumId?: string;
  };
  const id = params.projectId ?? 'mtc';
  const objectiveId = params.objectiveId ?? null;
  const navigate = useNavigate();
  // Protocols-mode + protocol selection are URL-derived (deep-linkable, survive
  // reload) — the ?mode / ?protocol search params on the stratum route. Read
  // with strict:false so the bare/$objectiveId routes (which don't validate
  // these keys) yield undefined and fall back to the defaults. Mirrors
  // ObserveLayout's ?section URL-derived pattern.
  const search = useSearch({ strict: false }) as {
    mode?: 'objectives' | 'protocols';
    protocol?: string;
    // Livestock work-schedule drill-down (?panel=work&workFilter=…) — URL-
    // derived so Plan-side "Review in Act" toasts can deep-link it.
    panel?: string;
    workFilter?: string;
    workView?: string;
  };

  const projects = useProjectStore((s) => s.projects);
  const project = useMemo(
    () => projects.find((p) => p.id === id || p.serverId === id) ?? MTC_SEED,
    [projects, id],
  );

  // Formal OLOS proof/verification path (flag-gated, off by default) addresses
  // the API by serverId and mirrors the assignment-substrate RBAC, so it needs
  // the member roster + the caller's role. Resolved here once and threaded into
  // ActTierExecutionPanel; the lightweight ObserveDataPoint completion path is
  // unaffected and remains the offline fallback (no serverId => no formal path).
  // See wiki/decisions/2026-06-04-olos-proof-verification-fork.md.
  const serverId = project.serverId;
  const members = useMemberStore((s) => s.members);
  const fetchMembers = useMemberStore((s) => s.fetchMembers);
  const myRoles = useMemberStore((s) => s.myRoles);
  const fetchMyRoles = useMemberStore((s) => s.fetchMyRoles);
  const currentUserId = useAuthStore((s) => s.user?.id);
  // Pull this project's ActTasks on mount so the bridge hook can distinguish
  // 'no-task' from 'ready'. No-op for local-only projects.
  useActTaskSync(id, serverId);
  useEffect(() => {
    if (serverId && members.length === 0) void fetchMembers(serverId);
  }, [serverId, members.length, fetchMembers]);
  // Resolve the current user's role from the project-scoped myRoles map, not
  // the global `members` array: that array is a single roster shared across
  // projects (and is pre-seeded with a synthetic demo roster by the builtin
  // sample), so deriving role from it returns the wrong project's role -- or
  // undefined for the authenticated user, silently hiding the formal
  // capture/verify controls. myRoles is keyed by serverId. See
  // wiki/decisions/2026-06-04-olos-proof-verification-fork.md.
  useEffect(() => {
    if (serverId) void fetchMyRoles();
  }, [serverId, fetchMyRoles]);
  const myRole = serverId ? myRoles[serverId] : undefined;

  // extractBoundaryGeometry can yield a Polygon OR a MultiPolygon (older/
  // alternate persistence paths). Do NOT cast it to Polygon: a MultiPolygon
  // mis-read as a single-ring Polygon poisons the bounds with NaN and crashes
  // maplibre ("Invalid LngLat object: (NaN, NaN)"). Normalize to a render-safe
  // single Polygon (or undefined) and derive the centroid from a finite-guarded
  // vertex average instead of polygonBounds().getCenter().
  const boundaryGeom = extractBoundaryGeometry(project.parcelBoundaryGeojson);
  const safeBoundary = useMemo(
    () => renderablePolygon(boundaryGeom),
    [boundaryGeom],
  );

  // Coords-only fallback (no boundary): prefer the parcel's intake center via
  // the v2->v3 adapter seam over the hard-coded stage centroid.
  const v3Project = useV3Project(params.projectId);
  const fallbackCenter = v3Project?.location.center ?? FALLBACK_CENTROID;

  // One centroid shared by the objective markers so pins sit on the parcel.
  // boundaryCentroid is finite-guarded and handles MultiPolygon; fallbackCenter
  // is itself always finite -> baseCentroid is guaranteed finite.
  const baseCentroid = useMemo<[number, number]>(
    () => boundaryCentroid(boundaryGeom) ?? fallbackCenter,
    [boundaryGeom, fallbackCenter],
  );

  // Real data: objectives (per-project resolution) + field actions.
  const { objectives } = useProjectObjectives(id);
  const actions = useFieldActionStore((s) =>
    selectFieldActionsForProject(s, id),
  );

  // Defensive first-load seed for a detail-first deep link on a non-MTC
  // project (the dashboard, which normally seeds on mount, may not be
  // mounted yet). Idempotent — a no-op once any action exists. MTC seeds at
  // hydrate via seedMtcDemo; this effect seeds unconditionally on mount, so the
  // ops dashboard (which does not seed) always has data regardless of right-mode.
  const isMtc = useMemo(
    () =>
      id === 'mtc' ||
      project.id === 'mtc' ||
      /moontrance/i.test(project.name ?? ''),
    [id, project.id, project.name],
  );
  useEffect(() => {
    if (!id) return;
    seedActionsIfEmpty(id, isMtc);
  }, [id, isMtc]);

  // Spine state: real Act-execution rollup per stratum (never locks).
  const stratumStates = useMemo(
    () => computeAllActStratumStates(STRATUM_IDS, actions),
    [actions],
  );

  // Per-objective progress computed ONCE; shared by the rail + the markers.
  const progressByObjective = useMemo(
    () => computeObjectiveProgress(objectives, actions),
    [objectives, actions],
  );

  // The URL-selected objective + its Plan tier and real prereq-aware status,
  // feeding the right-rail execution panel. Status mirrors
  // ViewAObjectiveExecution's useObjectiveStatus so the pill is canonical (no mock).
  const selectedObjective = useMemo(
    () => objectives.find((o) => o.id === objectiveId) ?? null,
    [objectives, objectiveId],
  );
  const selectedObjectiveTier = useMemo(
    () =>
      selectedObjective
        ? PLAN_STRATA.find((t) => t.id === selectedObjective.stratumId)
        : undefined,
    [selectedObjective],
  );
  // Single source of truth (2026-05-31): effective checklist progress =
  // stored planStratumStore progress UNIONED with wizard-derived Stratum-1
  // completion. The SAME hook Plan consumes, so Act never shows a
  // freshly-wizard-completed project's S1 items as incomplete when Plan
  // shows them done.
  const effectiveProgress = useEffectiveChecklistProgress(id, objectives);

  // Plan prerequisite lock gating (mirrors PlanStratumShell). The spine's
  // `stratumStates` above is the Act-execution rollup (never locks) and drives
  // progress chips only; THIS map is the Plan dependency gate that decides what
  // the steward may open. Deferred overrides resolve exactly as in Plan.
  const deferredObjectiveIds = usePlanStratumProgressStore((s) =>
    selectDeferredObjectives(s, id),
  );
  const deferredSet = useMemo(
    () => toDeferredSet(deferredObjectiveIds),
    [deferredObjectiveIds],
  );
  // DEV-only: header "Unlock all" toggle lifts every `locked` → `available`.
  const unlockAll = useDevUnlockStore((s) => s.unlockAll);
  const planObjectiveStatuses = useMemo(() => {
    const computed = computeAllObjectiveStatuses(
      objectives,
      effectiveProgress.flatMap,
      deferredSet,
    );
    return unlockAll && import.meta.env.DEV
      ? liftLockedStatuses(computed)
      : computed;
  }, [objectives, effectiveProgress, deferredSet, unlockAll]);
  const planStratumStates = useMemo(
    () => computeAllStratumStates(STRATUM_IDS, objectives, planObjectiveStatuses),
    [objectives, planObjectiveStatuses],
  );
  const lockedStratumIds = useMemo(
    () =>
      new Set(
        STRATUM_IDS.filter((sid) => planStratumStates[sid] === 'locked'),
      ),
    [planStratumStates],
  );
  const [lockedPopoverStratum, setLockedPopoverStratum] =
    useState<PlanStratum | null>(null);

  // Rail cards reflect CHECKLIST completion (effective progress), agreeing with
  // the right-rail execution panel's "N/M steps". The field-action
  // progressByObjective above stays the source for the map markers.
  const checklistProgressByObjective = useMemo(
    () => computeChecklistProgress(objectives, effectiveProgress.byObjective),
    [objectives, effectiveProgress],
  );

  const selectedObjectiveStatus = useMemo(() => {
    if (!selectedObjective) return 'locked' as const;
    const statuses = computeAllObjectiveStatuses(
      objectives,
      effectiveProgress.flatMap,
    );
    return statuses[selectedObjective.id] ?? 'locked';
  }, [selectedObjective, objectives, effectiveProgress]);

  // Triggered protocols drive both the rail's attention badge (count) and the
  // per-card emphasis (ids). useMemo keeps the ids array reference-stable so
  // ProtocolLayerPanel's useMemo(Set) doesn't thrash. (Phase 2 will mount the
  // auto-evaluation engine here; for now these reflect protocolStore records.)
  const triggered = useTriggeredProtocols(id);
  const triggeredCount = triggered.length;
  const triggeredIds = useMemo(
    () => triggered.map((r) => r.templateId),
    [triggered],
  );

  // Project-type record drives the Protocol-mode rail view (same source Plan
  // reads). null for MTC / null-type projects; ProtocolLayerPanel handles that.
  const typeRecord = project.metadata?.projectTypeRecord;
  const primaryTypeId = typeRecord?.primaryTypeId ?? null;
  const secondaryTypeIds = typeRecord?.secondaryTypeIds ?? [];
  // Per-type chips for the rail-header switcher's identity row (mirrors Plan):
  // one primary chip + one chip per secondary, each resolved to its human
  // label. Empty when no primary type is set.
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

  // Left-rail view: design objectives (default) vs the standing-protocol
  // library. URL-derived (?mode=protocols); absence = objectives. Single source
  // of truth — no local state, so it survives reload and is deep-linkable.
  const railMode: RailMode =
    search.mode === 'protocols' ? 'protocols' : 'objectives';
  // The URL is the single source of truth for the rendered stratum (parity with
  // Plan's PlanStratumShell — see plan/stratum/$stratumId). Precedence: an
  // explicit ?$stratumId param (validated against the real strata) → the
  // selected objective's owning stratum → S1. No local state: switching stratum
  // navigates, so the stratum survives a Plan→Act stage switch and is
  // deep-linkable, instead of resetting to a hardcoded default on every mount.
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
  const [rightMode, setRightMode] = useState<RightMode>(
    objectiveId ? 'detail' : 'dashboard',
  );
  // Weather drill-down: a sub-view of Dashboard mode. When true the right-rail
  // dashboard branch shows ActTierWeatherPanel (full 7-day forecast) instead of
  // the dashboard cards. Opened by the WeatherStrip buttons; closed by its back
  // control, the Dashboard tab, or whenever the rail enters objective/protocol
  // detail (see the reconcile effect below).
  const [weatherOpen, setWeatherOpen] = useState(false);
  // Livestock work-schedule drill-down: like the weather panel it lives under
  // Dashboard mode, but it is URL-derived (?panel=work) so Plan can deep-link
  // it. Opened by ActWorkSummaryCard; closed by its back control. Detail views
  // win in the rightBody chain below (no reconcile effect needed).
  const workOpen = search.panel === 'work';
  const workFilter = search.workFilter;
  // Wide-calendar canvas takeover (?panel=work&workView=calendar): the canvas
  // swaps the map for WorkCalendarTakeover while the work panel stays in the
  // rail. URL-derived like the panel itself; closing the panel drops it too.
  const workCalendarActive = workOpen && search.workView === 'calendar';
  // Protocols mode: the clicked protocol whose detail shows in the right rail
  // (mirrors objective selection). URL-derived (?protocol=<templateId>), so it
  // survives reload and is deep-linkable. A stale id (protocol hidden by the
  // current stratum) degrades to ActProtocolDetailPane's empty state; it is
  // dropped from the URL on stratum switch (see goToStratum).
  const selectedProtocolId: string | null = search.protocol ?? null;
  // When an as-built deviation is being recorded, the right rail swaps to the
  // as-built form (panel variant) and hides the dashboard/objective toggle;
  // closing/saving clears `active` and reverts the rail.
  const asBuiltActive = useActAsBuiltPopoverStore((s) => s.active != null);
  const sectorsEditorActive = useActSectorsEditorStore((s) => s.active);
  // s2-ecology-c1 draw-on-map vegetation survey takeover. When active for THIS
  // project, the Tier-0 ecology workbench is overridden by the map shell (see
  // showTierZeroWorkbench below): the right rail swaps to VegetationSurveyPanel
  // and the canvas mounts the survey layer + draw host. Mirrors the
  // sectors-editor / as-built rail-takeover pattern.
  const surveyOpen = useVegetationSurveyStore(
    (s) => s.active && s.activeProjectId === id,
  );
  // Only force the map while the ecology objective is the active route. If the
  // steward navigates to another objective the store stays "open" but latent
  // (like the sectors editor), so returning to s2-ecology resumes the survey.
  const surveyActive = surveyOpen && objectiveId === 's2-ecology';
  // s2-terrain-c2 draw-on-map slope survey takeover. Same rail-takeover pattern
  // as the vegetation survey: forces the map shell + swaps the right rail to
  // SlopeSurveyPanel + mounts the slope layer & draw host, but only while the
  // terrain objective is the active route.
  const slopeOpen = useSlopeSurveyStore(
    (s) => s.active && s.activeProjectId === id,
  );
  const slopeActive = slopeOpen && objectiveId === 's2-terrain';
  // Generic objective-tools takeover (the shell-agnostic generalization of the
  // two bespoke surveys above; mirror of PlanTierShell): any draw/place
  // objective whose catalog resolves to >= 1 map tool can flip into a focused
  // map+tools mode via OpenMapToolsButton. Active only when the store is open
  // for THIS project AND the route's objective matches, so it stays latent on
  // other objectives exactly like the survey takeovers.
  const toolsTakeoverActive = useObjectiveToolsTakeoverStore(
    (s) =>
      s.active && s.activeProjectId === id && s.activeObjectiveId === objectiveId,
  );
  const [activeModule, setActiveModule] = useState<ActModule | null>(null);

  // Form-arm state: which category's tabbed form popup is open (local UI state,
  // ephemeral). One popup holds every kind:'form' tool in the clicked category;
  // `activeFormId` is the focused tab. The text VALUES are persisted in
  // actEvidenceStore.
  const [openFormGroup, setOpenFormGroup] = useState<{
    title: string;
    tools: ActTool[];
    activeFormId: string;
  } | null>(null);

  // Read vision form values from the persisted store (keyed by formId under
  // this project). Falls back to an empty record when nothing is saved yet.
  const visionForms = useActEvidenceStore(
    (s) => s.visionForms[id] ?? EMPTY_FORMS,
  );

  // Structured form values (the SF capture engine) keyed by formId under this
  // project. Falls back to a stable empty record when nothing is saved yet.
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

  const setActiveTool = useMapToolStore((s) => s.setActiveTool);

  // URL drives detail/dashboard: a selected objective shows detail; clearing
  // it falls back to the dashboard. A local toggle can still flip to dashboard
  // while an objective is selected.
  useEffect(() => {
    setRightMode(objectiveId ? 'detail' : 'dashboard');
  }, [objectiveId]);

  // The weather drill-down lives under Dashboard mode only; leaving for any
  // detail view (objective or protocol) closes it so returning to Dashboard
  // lands on the cards rather than re-opening the forecast.
  useEffect(() => {
    if (rightMode === 'detail') setWeatherOpen(false);
  }, [rightMode]);

  const selectedStratum = useMemo(
    () => PLAN_STRATA.find((s) => s.id === selectedStratumId),
    [selectedStratumId],
  );
  const stratumObjectives = useMemo(
    () => objectives.filter((o) => o.stratumId === selectedStratumId),
    [objectives, selectedStratumId],
  );

  // Operational Role Layer (ADR 2026-06-24): the per-shell view-scope gate.
  // Solo / no-role viewers ⇒ inert (layerActive false, scopedDomains undefined),
  // so the rail renders byte-identically to today. When engaged it scopes the
  // objective rail to the viewer's operational domains — never hiding, only
  // de-emphasizing — with a "My focus / Full view" toggle.
  const viewScope = useViewScope(id);
  // Objective ids carrying >=1 OPEN review flag (the counts hook keys). These
  // always surface regardless of focus, so a live amber "Review" is never
  // buried by the role filter.
  const openFlagCounts = useReviewFlagCountsByObjective(id);
  const openFlagObjectiveIds = useMemo(
    () => new Set(Object.keys(openFlagCounts)),
    [openFlagCounts],
  );
  // Domains carrying an ACTIVE Observe divergence this cycle (data points ∪
  // feed), the shared-resource-divergence promotion signal.
  const divergedDomains = useDivergedDomains(id);
  // Promotion map over the PROJECT-WIDE objective set so a cross-role
  // (`feedsInto`) dependency on an in-scope objective in another stratum, an
  // open review flag, or a shared-resource divergence still promotes an
  // out-of-scope objective. The rail looks up by id for whichever stratum it
  // renders. Empty scope (full view / no role) ⇒ empty map.
  const surfaceMap = useMemo(
    () =>
      collectAlwaysSurface({
        objectives,
        scope: viewScope.scope,
        openFlagObjectiveIds,
        divergedDomains,
      }),
    [objectives, viewScope.scope, openFlagObjectiveIds, divergedDomains],
  );

  // Real per-objective marker positions from field-action geometry. Objectives
  // with no logged location are absent here, so the map renders no pin for them
  // (hide-until-real; no synthetic fallback). Scoped to the rendered stratum.
  const positionByObjective = useMemo(
    () => computeObjectiveMarkerPositions(stratumObjectives, actions),
    [stratumObjectives, actions],
  );

  // Navigate to a stratum's dashboard. The stratum now lives in the URL, so this
  // both switches the rendered stratum AND clears any selected objective.
  const goToStratum = useCallback(
    (stratumId: string) => {
      if (!params.projectId) return;
      navigate({
        to: '/v3/project/$projectId/act/tier-shell/stratum/$stratumId',
        params: { projectId: params.projectId, stratumId },
        // navigate REPLACES search — carry mode forward (a stratum switch keeps
        // the steward in Protocols mode) but DROP protocol (the selection may
        // belong to the stratum we're leaving). Preserves Feature-1 hygiene.
        search: (prev: { mode?: 'objectives' | 'protocols' }) => ({
          mode: prev?.mode === 'protocols' ? ('protocols' as const) : undefined,
        }),
      });
    },
    [navigate, params.projectId],
  );

  const goToObjective = useCallback(
    (nextObjectiveId: string | null) => {
      if (!params.projectId) return;
      if (nextObjectiveId) {
        navigate({
          to: '/v3/project/$projectId/act/tier-shell/$objectiveId',
          params: { projectId: params.projectId, objectiveId: nextObjectiveId },
          // The objective route is objectives-mode; drop the protocols search
          // params so a later return to a stratum starts clean.
          search: {},
        });
      } else {
        // Deselect → return to the CURRENT stratum's dashboard (not the bare
        // tier-shell, which would re-derive S1 and silently lose the stratum).
        goToStratum(selectedStratumId);
      }
    },
    [navigate, params.projectId, goToStratum, selectedStratumId],
  );

  const handleSelectStratum = useCallback(
    (stratumId: string) => {
      // Honour the Plan prerequisite gate (mirrors PlanStratumShell): a locked
      // stratum opens the explanatory popover instead of navigating.
      if ((planStratumStates[stratumId] ?? 'locked') === 'locked') {
        setLockedPopoverStratum(
          PLAN_STRATA.find((s) => s.id === stratumId) ?? null,
        );
        return;
      }
      goToStratum(stratumId);
    },
    [goToStratum, planStratumStates],
  );

  const handleSelectObjective = useCallback(
    (nextObjectiveId: string) => {
      // Re-selecting the already-active objective DESELECTS it (back to the
      // stratum dashboard). Drives both the rail card and the map markers, so a
      // second click/tap on either toggles the objective off. The rightMode
      // effect (keyed on objectiveId) flips to 'dashboard' once the route
      // clears, so no explicit setRightMode is needed on the deselect branch.
      if (nextObjectiveId === objectiveId) {
        goToObjective(null);
        return;
      }
      // Honour the Plan prerequisite gate — a locked objective is not openable
      // until its upstream decisions are complete.
      if ((planObjectiveStatuses[nextObjectiveId] ?? 'locked') === 'locked') {
        toast.warning('Locked until its prerequisites are complete.');
        return;
      }
      setRightMode('detail');
      goToObjective(nextObjectiveId);
    },
    [goToObjective, objectiveId, planObjectiveStatuses],
  );

  // Protocol card click → open its detail in the right rail. Re-clicking the
  // active protocol deselects it (back to the dashboard), mirroring objectives.
  // URL-driven: writes ?mode=protocols&protocol=<id> on the current stratum
  // route (toggle-off clears protocol). `replace` keeps selection churn out of
  // history. The rightMode reconcile effect (keyed on railMode/selection) flips
  // the rail to detail/dashboard once the derived selection updates.
  const handleSelectProtocol = useCallback(
    (templateId: string) => {
      if (!params.projectId) return;
      navigate({
        to: '/v3/project/$projectId/act/tier-shell/stratum/$stratumId',
        params: { projectId: params.projectId, stratumId: selectedStratumId },
        search: (prev: { protocol?: string }) => ({
          mode: 'protocols' as const,
          protocol: prev?.protocol === templateId ? undefined : templateId,
        }),
        replace: true,
      });
    },
    [navigate, params.projectId, selectedStratumId],
  );

  // Work-panel open/close — rewrite only the panel/workFilter search params on
  // the CURRENT path (`to: '.'`, the PlanStratumShell planMode pattern), so the
  // drill-down works from the bare, stratum, and objective routes alike.
  // `replace` keeps the open/close churn out of history.
  const openWorkPanel = useCallback(() => {
    navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        panel: 'work',
      }),
      replace: true,
    } as never);
  }, [navigate]);

  const closeWorkPanel = useCallback(() => {
    navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        panel: undefined,
        workFilter: undefined,
        workView: undefined,
      }),
      replace: true,
    } as never);
  }, [navigate]);

  // Wide-calendar takeover open/close — same param-rewrite pattern. Open keeps
  // panel=work (the rail panel stays mounted next to the calendar); close
  // drops only workView, returning the canvas to the map.
  const openWorkCalendar = useCallback(() => {
    navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        panel: 'work',
        workView: 'calendar',
      }),
      replace: true,
    } as never);
  }, [navigate]);

  const closeWorkCalendar = useCallback(() => {
    navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        workView: undefined,
      }),
      replace: true,
    } as never);
  }, [navigate]);

  // Left-rail Objectives/Protocols toggle → write ?mode. Entering Protocols
  // preserves any held ?protocol; leaving drops it (objectives-mode has no
  // protocol selection). Routed onto the current stratum so mode is stratum-
  // scoped and deep-linkable.
  const handleRailModeChange = useCallback(
    (next: RailMode) => {
      if (!params.projectId) return;
      navigate({
        to: '/v3/project/$projectId/act/tier-shell/stratum/$stratumId',
        params: { projectId: params.projectId, stratumId: selectedStratumId },
        search: (prev: { protocol?: string }) => ({
          mode: next === 'protocols' ? ('protocols' as const) : undefined,
          protocol: next === 'protocols' ? prev?.protocol : undefined,
        }),
        replace: true,
      });
    },
    [navigate, params.projectId, selectedStratumId],
  );

  // Stratum-change hygiene: the protocol selection is URL-derived and dropped
  // from the URL on a stratum switch (see goToStratum), so no setter is needed
  // here. We only reconcile the right rail: in Protocols mode with no selection,
  // a detail view has nothing to show — fall back to the dashboard.
  useEffect(() => {
    if (railMode === 'protocols' && !selectedProtocolId) {
      setRightMode((m) => (m === 'detail' ? 'dashboard' : m));
    }
  }, [selectedStratumId, railMode, selectedProtocolId]);

  // Rail-mode-change hygiene: when entering Protocols mode show the selected
  // protocol's detail if one is held, else the dashboard; when entering
  // Objectives mode the objectiveId effect already drives rightMode.
  useEffect(() => {
    if (railMode === 'protocols') {
      setRightMode(selectedProtocolId ? 'detail' : 'dashboard');
    } else {
      setRightMode(objectiveId ? 'detail' : 'dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [railMode]);

  const handleFormSave = useCallback(
    (formId: string, text: string) => {
      useActEvidenceStore.getState().saveVisionForm(id, formId, text);
      // The formId IS the checklist item id (1:1 per actToolCatalog design).
      // Mark it complete so the execution-panel checklist reflects the capture.
      // Uses setItemComplete (add-only) rather than toggleItem so a
      // manually-unchecked item is never accidentally re-checked and then
      // removed by a second form save.
      if (objectiveId) {
        usePlanStratumProgressStore
          .getState()
          .setItemComplete(id, objectiveId, formId);
      }
      // Intentionally do NOT close the popup: saving one tab leaves the tabbed
      // popup open so the steward can fill the remaining fields. Esc /
      // click-outside / the X close it (handled by Modal).
    },
    [id, objectiveId],
  );

  const handleFormDataSave = useCallback(
    (formId: string, value: FormValue, summary: string) => {
      useActEvidenceStore.getState().saveVisionFormData(id, formId, value, summary);
      // Reconcile the steward-capture invite queue into the canonical
      // metadata.team.queuedInvites (local-only). The capture persists invites
      // as a parallel-array FormValue; this mirrors them into the project
      // metadata so they reach the canonical home. RBAC reconciliation RW4.
      if (formId === 's1-vision-steward') {
        const queued = stewardInvitesToQueued(
          decodeSteward(value),
          new Date().toISOString(),
        );
        useProjectStore.getState().reconcileStewardInvites(id, queued);
      }
      // Forage / pasture survey (silv-sec-s3-forage-survey-*): on any item save,
      // re-derive the forage-owned paddock set from the c1 zone register and
      // reconcile it into the livestock store. saveVisionFormData above has
      // already persisted the c1 value, so reading it back here is current.
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
        // Read fresh state per decision: deletes above mutate the store, so the
        // add-vs-update check must not race on a pre-delete snapshot. (The diff
        // never overlaps upsert ids with deleteIds, but this keeps it correct
        // regardless of that contract.)
        upserts.forEach((p) =>
          useLivestockStore.getState().paddocks.some((x) => x.id === p.id)
            ? ls.updatePaddock(p.id, p)
            : ls.addPaddock(p),
        );
      }
      // The formId IS the checklist item id (1:1 per actToolCatalog design).
      // Mark it complete (add-only) so the execution-panel checklist reflects
      // the structured capture, exactly as handleFormSave does for text.
      if (objectiveId) {
        usePlanStratumProgressStore
          .getState()
          .setItemComplete(id, objectiveId, formId);
      }
      // Do NOT close the popup -- the steward continues with other tabs.
    },
    [id, objectiveId],
  );

  const handleActivateTool = useCallback(
    // `formObjective` overrides which objective's sibling form-tools populate the
    // tabbed popup. It defaults to the URL-selected objective for normal rail
    // clicks; a search-result click passes the tool's OWNING objective so the
    // form group is gathered correctly even before the navigation settles
    // selectedObjective (which lags a tick behind the route change).
    (tool: ActTool, formObjective?: PlanStratumObjective | null) => {
      const arm = tool.arm;
      if (arm.kind === 'map') {
        // Toggle: a second click on the already-armed tool disarms it.
        const current = useMapToolStore.getState().activeTool;
        if (current === arm.mapToolId) {
          setActiveTool(null);
          return;
        }
        // Arm a real placement/draw tool. ObserveDrawHost / PlanDrawHost
        // (mounted on this canvas) pick the id up by prefix and open the
        // matching draw dock; placement persists to the shared stores.
        setActiveTool(arm.mapToolId);
        return;
      }
      if (arm.kind === 'form') {
        // Non-spatial checklist item: open ONE tabbed popup holding every
        // kind:'form' tool in this tool's category, focused on the clicked tab.
        const ownerForForms = formObjective ?? selectedObjective;
        const formTools = (
          ownerForForms
            ? resolveActTools(getObjectiveActTools(ownerForForms))
            : []
        ).filter((t) => t.arm.kind === 'form' && t.category === tool.category);
        const cat = ACT_TOOL_CATEGORIES.find((c) => c.id === tool.category);
        setOpenFormGroup({
          title: cat?.label ?? 'Forms',
          tools: formTools.length ? formTools : [tool],
          activeFormId: arm.formId,
        });
        return;
      }
      if (arm.kind === 'flow') {
        // Non-spatial material-flow capture: open the Act-owned popover (renders
        // through Modal; mounted once below). Records a source->sink flow into
        // closedLoopStore with origin 'list'.
        useActFlowPopoverStore.getState().openPopover();
        return;
      }
      if (arm.kind === 'zone-action') {
        // Imperative post-seed actions on the ring-seeded zones. Read the stores
        // imperatively (no reactive subscription needed); feedback is toast-only,
        // mirroring the Plan ZoneCirculationOverviewCard actions.
        const zoneState = useZoneStore.getState();
        if (arm.action === 'clear') {
          const removed = zoneState.clearSeededZones(id);
          if (removed === 0) toast.info('No seeded zones to clear.');
          else toast.success(`Cleared ${removed} seeded zone(s).`);
          return;
        }
        // trim: clip every ring-seeded zone to the parcel polygon; drop any that
        // fall fully outside.
        const project = useProjectStore
          .getState()
          .projects.find((p) => p.id === id);
        const parcel = parcelPolygon(project?.parcelBoundaryGeojson ?? null);
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
      // Field log (harvest / water / livestock) — route through the existing
      // QuickLog path so ActDrawHost handles the click-to-log interaction.
      // `arm` is hoisted to a const so the narrowing survives the closure.
      const log = QUICK_LOGS.find((l) => l.id === arm.quickLogId);
      if (!log) return;
      setActiveModule(log.module);
      if (log.toolId) setActiveTool(log.toolId);
    },
    [setActiveModule, setActiveTool, selectedObjective, id],
  );

  // ---- Header Stage Search (Act) ----------------------------------------
  // While a query is active the left rail broadens to a cross-objective match
  // list (tools across every objective + objectives by text). Selecting a result
  // reveals it: switch the rendered stratum to the owning objective's, navigate
  // to it, and (for a tool) arm the tool on that objective. The query is then
  // cleared so the rail returns to the normal stratum view.
  const searchQuery = useStageSearchStore((s) => s.query);
  const clearSearch = useStageSearchStore((s) => s.clear);
  const searchActive = searchQuery.trim() !== '';
  const actSearch = useMemo(
    () =>
      searchActive
        ? resolveActSearchMatches(objectives, searchQuery)
        : { objectives: [], tools: [] },
    [searchActive, objectives, searchQuery],
  );

  const revealObjective = useCallback(
    (objective: PlanStratumObjective) => {
      // The rendered stratum now derives from the selected objective's
      // stratumId (see selectedStratumId), so navigating to the objective is
      // enough — no separate stratum state to set.
      setRightMode('detail');
      goToObjective(objective.id);
    },
    [goToObjective],
  );

  const handleSelectSearchObjective = useCallback(
    (objective: PlanStratumObjective) => {
      revealObjective(objective);
      clearSearch();
    },
    [revealObjective, clearSearch],
  );

  const handleSelectSearchTool = useCallback(
    (match: ActToolMatch) => {
      revealObjective(match.objective);
      // Pass the owning objective explicitly: the route change above has not yet
      // refreshed selectedObjective, so a form-arm would otherwise gather the
      // wrong (stale) sibling-tool group.
      handleActivateTool(match.tool, match.objective);
      clearSearch();
    },
    [revealObjective, handleActivateTool, clearSearch],
  );

  // A matched tool has a home on the Plan stage iff it survives resolvePlanTools,
  // which drops only `log`-arm field logs (an Act-execution concern). Computed
  // inline from the arm kind rather than importing the Plan catalog, so Act stays
  // independent of Plan. Gates which rows show the "Open in Plan" control.
  const planCapableToolIds = useMemo(
    () =>
      new Set(
        actSearch.tools
          .filter((m) => m.tool.arm.kind !== 'log')
          .map((m) => m.tool.id),
      ),
    [actSearch.tools],
  );

  // "Open in Plan": hand the matched tool off to the Plan stage. Mirrors the
  // ActTierExecutionPanel "Open in Plan" deep-link precedent, but carries
  // ?armTool=<id> so the Plan tier shell arms the tool on arrival (and strips the
  // param). The route's beforeLoad guard redirects a locked target to /plan.
  const handleOpenToolInPlan = useCallback(
    (match: ActToolMatch) => {
      clearSearch();
      navigate({
        to: '/v3/project/$projectId/plan/stratum/$stratumId/objective/$objectiveId',
        params: {
          projectId: id,
          stratumId: match.objective.stratumId,
          objectiveId: match.objective.id,
        },
        search: { armTool: match.tool.id },
      } as never);
    },
    [clearSearch, navigate, id],
  );

  // Tier-0 swap flag: render the execution-only surface (ActTierExecutionPanel)
  // in place of the map shell when the selected objective is a non-spatial
  // Tier-0 one. The interactive decision workbench now lives in the Plan tier
  // shell ("Plan decides, Act executes"); Act only surfaces the recorded
  // decision + evidence capture. Keyed off the URL-synchronous objectiveId first
  // (not only the resolved selectedObjective) so a cold deep-link to a Tier-0
  // route never transiently mounts <StageShell>/<DiagnoseMap> (WebGL) during the
  // tick before objectives hydrate. Falls back to the resolved-objective check
  // so an in-app selection whose route change hasn't landed yet still swaps.
  const showTierZeroWorkbench =
    (isTierZeroObjectiveId(objectiveId) ||
      (selectedObjective != null && isTierZeroObjective(selectedObjective))) &&
    // The vegetation-survey takeover forces the map branch even though
    // s2-ecology is a Tier-0 objective (its c1 decision is surveyed on the map).
    !surveyActive &&
    // Likewise the slope-survey takeover forces the map branch for s2-terrain
    // (its c2 slope decision is drawn on the map).
    !slopeActive &&
    // A generic map-tools takeover also yields the workbench to the map (so a
    // Tier-0 draw/place objective can reach its draw hosts), exactly like the
    // bespoke survey takeovers above.
    !toolsTakeoverActive;

  return (
    <div className={styles.tierShell}>
      {/*
        The horizontal Act spine is hidden: its stratum navigation and project
        identity now live in the rail-header ActTierStratumSwitcher (passed
        below as ActTierObjectiveRail's headerSlot). Act omits the threshold
        props -- it has no planning checkpoints -- so no threshold rows render.
        ActTierSpine is preserved (still standalone-tested), just not mounted
        here. The Plan prerequisite gate survives: handleSelectStratum still
        opens StratumLockedPopover for a locked stratum.
      */}
      <div className={styles.shellWrap}>
        {showTierZeroWorkbench && !selectedObjective ? (
          // Tier-0 route resolved before its objective set hydrated: hold a
          // lightweight non-map placeholder rather than falling through to the
          // map shell (which would mount WebGL and wedge the headless preview).
          // s1-vision is universal across every resolved set, so
          // selectedObjective always arrives — this state is strictly transient.
          <div
            className={styles.tierZeroLoading}
            role="status"
            aria-live="polite"
          >
            <span className={styles.tierZeroLoadingText}>
              Loading…
            </span>
          </div>
        ) : (
        <StageShell
          bottomPlacement="between-rails"
          symmetricRails
          canvasLabel="Act tier canvas"
          leftRailLabel="Stratum objectives"
          rightRailLabel="Dashboard and objective detail"
          leftRail={
            searchActive ? (
              <ActSearchRail
                query={searchQuery}
                toolMatches={actSearch.tools}
                objectiveMatches={actSearch.objectives}
                progressByObjective={checklistProgressByObjective}
                activeObjectiveId={objectiveId}
                onSelectTool={handleSelectSearchTool}
                onSelectObjective={handleSelectSearchObjective}
                planToolIds={planCapableToolIds}
                onOpenToolInPlan={handleOpenToolInPlan}
              />
            ) : (
              <ActTierObjectiveRail
                stratum={selectedStratum}
                objectives={stratumObjectives}
                progressByObjective={checklistProgressByObjective}
                activeObjectiveId={objectiveId}
                onSelectObjective={handleSelectObjective}
                // The rail header IS the stratum switcher (the horizontal spine
                // is hidden), carrying the S1-S7 tabs + Act execution-rollup
                // status dots + project identity. Threshold props are omitted:
                // Act has no planning checkpoints, so no threshold rows render.
                headerSlot={
                  <ActTierStratumSwitcher
                    strata={PLAN_STRATA}
                    stratumStates={stratumStates}
                    lockedStratumIds={lockedStratumIds}
                    activeStratumId={selectedStratumId}
                    activeStratum={selectedStratum}
                    onSelectStratum={handleSelectStratum}
                    projectTitle={project.name}
                    typeChips={spineTypeChips}
                  />
                }
                mode={railMode}
                onModeChange={handleRailModeChange}
                triggeredCount={triggeredCount}
                triggeredIds={triggeredIds}
                projectId={id}
                primaryTypeId={primaryTypeId}
                secondaryTypeIds={secondaryTypeIds}
                activeStratumId={selectedStratumId}
                selectedProtocolId={selectedProtocolId}
                onSelectProtocol={handleSelectProtocol}
                bulkActivation={!showTierZeroWorkbench}
                // Operational Role Layer: scope only when actually engaged
                // (isScoped). The toggle shows whenever the layer is active so a
                // scoped steward can flip to Full view (and back) at will.
                scopedDomains={viewScope.isScoped ? viewScope.scope : undefined}
                surfaceMap={surfaceMap}
                showFocusToggle={viewScope.layerActive}
                focusMode={viewScope.focusMode}
                onFocusModeChange={viewScope.setFocusMode}
              />
            )
          }
          canvas={
            workCalendarActive ? (
              // Wide-calendar takeover: the month schedule across the full
              // canvas (?workView=calendar). Wins over the map AND the Tier-0
              // workbench — the operator explicitly asked for the calendar;
              // "Back to map" / closing the work panel restores the branch
              // below.
              <WorkCalendarTakeover projectId={id} onClose={closeWorkCalendar} />
            ) : showTierZeroWorkbench && selectedObjective ? (
              // Execution-only: the interactive decision workbench moved to the
              // Plan tier shell. Act surfaces the recorded decision (read-only
              // recap) plus evidence capture via ActTierExecutionPanel, in place
              // of the map (which is meaningless for these non-spatial objectives).
              <div className={styles.tierZeroExec}>
                <ActTierExecutionPanel
                  projectId={id}
                  tier={selectedObjectiveTier}
                  objective={selectedObjective}
                  status={selectedObjectiveStatus}
                  serverId={serverId}
                  members={members}
                  currentUserId={currentUserId}
                  myRole={myRole}
                />
              </div>
            ) : (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <DiagnoseMap centroid={baseCentroid} boundary={safeBoundary} projectId={id}>
                  {({ map }) => (
                    <>
                      <BaseMapCard stage="act" projectId={id} />
                      <MapToolbar
                        map={map}
                        projectId={params.projectId ?? null}
                        boundary={safeBoundary ?? null}
                        showBoundary={false}
                      />
                      <MapSheetExportControl
                        map={map}
                        projectId={id}
                        anchor="top-right"
                      />
                      <ObserveAnnotationLayers map={map} projectId={id} />
                      <PlanDataLayers map={map} projectId={id} editable={false} />
                      {/* Design-elements (orchard / silvopasture / pasture-mix /
                          trees / hedgerow / spring / road…) persist to
                          designElementsStore via PlanDesignElementHost. Act
                          places them (PlanDrawHost is mounted below) but, until
                          now, never rendered them. Mounted read-only — Act shows
                          Plan geometry, does not edit it (same stance as
                          PlanDataLayers editable={false}). */}
                      <DesignElementLayers
                        map={map}
                        projectId={id}
                        view="current"
                        activeModule={null}
                        keepAbovePrefix="plan-data-"
                      />
                      <ActStructureClickHandler map={map} projectId={id} />
                      <ActFeatureClickHandler map={map} projectId={id} />
                      <ActDataLayers
                        map={map}
                        projectId={id}
                        activeModule={activeModule}
                      />
                      {/* Plan overlays mounted on Act for legend parity: the
                          BaseMapCard "Overlays" legend now offers the same rows
                          on Plan and Act (presence-gated per project), so the
                          rows must actually render here too. Read-only surfacing
                          — editing still happens on the matching Plan/Act card.
                          seededZones needs nothing new (PlanDataLayers above
                          already renders ring-seeded zones). */}
                      <PlanZoneRingsOverlay map={map} projectId={id} />
                      <PlanSunPathOverlay
                        map={map}
                        projectId={id}
                        fallbackCentroid={baseCentroid}
                        boundary={safeBoundary ?? undefined}
                      />
                      <PlanScheduledMovesOverlay map={map} projectId={id} />
                      <PlanWaterRouterOverlay map={map} projectId={id} />
                      <SectorCompassOverlay
                        projectId={id}
                        map={map}
                        onOpenEditor={() => {
                          // Mutually-exclusive rail takeovers: clear any as-built,
                          // vegetation-survey, or slope-survey session before
                          // arming the sectors editor so the rail never has two
                          // claimants.
                          useActAsBuiltPopoverStore.getState().close();
                          useVegetationSurveyStore.getState().close();
                          useSlopeSurveyStore.getState().close();
                          useActSectorsEditorStore.getState().open();
                        }}
                      />
                      <ActStructurePopover map={map} projectId={id} />
                      <ActAsBuiltDrawHandler map={map} />
                      <ActFlowConnectorPopover projectId={id} />
                      <ActTierMapMarkers
                        map={map}
                        positionByObjective={positionByObjective}
                        objectives={stratumObjectives}
                        progressByObjective={progressByObjective}
                        activeObjectiveId={objectiveId}
                        onSelectObjective={handleSelectObjective}
                        scopedDomains={
                          viewScope.isScoped ? viewScope.scope : undefined
                        }
                        surfaceMap={surfaceMap}
                      />
                      <ProtocolMapMarkers
                        map={map}
                        centroid={baseCentroid}
                        triggeredCount={triggeredCount}
                      />
                      {/*
                        Community (ecovillage) meeting/decision marker: a single
                        pulsing ring at the steward-designated communal meeting
                        place while upcoming governance meetings, commons /
                        adaptive / five-year reviews, or member ratifications
                        exist. Inert on non-ecovillage projects (no confirmed
                        community proposals ⇒ no marker) and until a place is set.
                      */}
                      <CommunityMeetingMarker
                        map={map}
                        projectId={id}
                        onOpenWork={openWorkPanel}
                      />
                      {/*
                        Map-interaction half of the "drop a pin" meeting-place
                        affordance: while the work-panel control has armed pin
                        placement for THIS project, the next map click sets a
                        point meeting place. Renders null otherwise.
                      */}
                      <CommunityMeetingPlaceDrawHandler map={map} projectId={id} />
                      <ActDrawHost map={map} projectId={params.projectId ?? null} />
                      {/*
                        s2-ecology-c1 vegetation survey: the layer renders all
                        drawn community polygons (colour-coded fill/line/label);
                        the draw host arms only when `act.ecology.veg-survey` is
                        the active tool (prefix-guarded), writing each polygon to
                        the dedicated vegetationSurveyStore (NOT designElements).
                      */}
                      <VegetationSurveyLayer map={map} projectId={id} />
                      <VegetationSurveyDrawHost
                        map={map}
                        projectId={params.projectId ?? null}
                        sourceObjectiveId={objectiveId}
                      />
                      {/*
                        s2-terrain-c2 slope survey: same shape as the vegetation
                        survey, but the draw host arms on any of the six
                        `act.terrain.slope-*` tools (the armed tool encodes the
                        class), writing each polygon to slopeSurveyStore.
                      */}
                      <SlopeSurveyLayer map={map} projectId={id} />
                      <SlopeSurveyDrawHost
                        map={map}
                        projectId={params.projectId ?? null}
                        sourceObjectiveId={objectiveId}
                      />
                      {/*
                        Livestock work locate: a WorkItemRow's Locate button
                        sets workExecutionStore.highlightPaddockId; this layer
                        outlines that paddock + fitBounds, then auto-clears.
                      */}
                      <ActWorkHighlightLayer map={map} projectId={id} />
                      {/*
                        ADR-7 tension: the Act canvas adds execution placements
                        via Observe/Plan draw tools (one armed at a time). These
                        hosts hard-guard on their own id prefix and return null
                        otherwise, so they compose safely with ActDrawHost. They
                        write to the SHARED stores (one source of truth); existing
                        Plan features stay read-only here (PlanDataLayers
                        editable={false}) — Act adds, it does not edit Plan
                        decisions.
                      */}
                      <ObserveDrawHost map={map} projectId={id} />
                      {/*
                        Observe annotation interaction cluster — mirrors what
                        ObserveLayout pairs with ObserveDrawHost. Without these the
                        Act surface places a pin (store flips to `active`) but never
                        renders the lab-values form and never reacts to selection,
                        so Act-placed soil samples were neither presented nor
                        editable. All are store-/selection-driven singletons that
                        portal out, so they compose with the Act handlers (which
                        bind disjoint layers).
                      */}
                      <AnnotationDragHandler map={map} />
                      <AnnotationVertexEditHandler map={map} />
                      <AnnotationFormSlideUp />
                      <SelectionFloater projectId={id} />
                      <AnnotationDetailPanel projectId={id} />
                      <PlanDrawHost
                        map={map}
                        projectId={id}
                        variant="current"
                        parcelBoundary={safeBoundary}
                        sourceObjectiveId={objectiveId}
                      />
                    </>
                  )}
                </DiagnoseMap>
              </div>
            )
          }
          rightRail={
            showTierZeroWorkbench ? (
              <div className={styles.rightRail}>
                <div className={styles.rightBody}>
                  {workOpen ? (
                    <ActWorkPanel
                      projectId={id}
                      onBack={closeWorkPanel}
                      initialFilter={workFilter}
                      onOpenCalendar={openWorkCalendar}
                    />
                  ) : (
                    <>
                      {/* Read-only Threshold-3 mandate briefing: self-gates to
                          null until the project has crossed into Act. */}
                      <ActMandateBriefingCard
                        projectId={id}
                        objectives={objectives}
                        objectiveStatuses={planObjectiveStatuses}
                      />
                      <ActOpsDashboard
                        projectId={id}
                        onOpenWeather={() => setWeatherOpen(true)}
                        onOpenWork={openWorkPanel}
                      />
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.rightRail}>
                {toolsTakeoverActive && selectedObjective ? (
                  // Generic objective-tools takeover: while armed for THIS
                  // objective, the focused map-tools panel replaces the rail
                  // (parity with the survey takeovers below). Placed first; the
                  // store's open() already closed the surveys, and the active
                  // flag is route-gated, so it never collides with them. Done in
                  // the panel clears the store.
                  <div className={styles.rightBody}>
                    <ObjectiveToolsPanel projectId={id} objective={selectedObjective} />
                  </div>
                ) : surveyActive ? (
                  // Highest-precedence rail takeover: the vegetation-survey panel
                  // (7 community rows + live auto-%). Opened from the s2-ecology-c1
                  // decision's "Open map survey" button; Done clears `active`.
                  <div className={styles.rightBody}>
                    <VegetationSurveyPanel projectId={id} />
                  </div>
                ) : slopeActive ? (
                  // Slope-survey rail takeover (6 per-class rows + live auto-%).
                  // Opened from the s2-terrain-c2 decision's "Open map survey"
                  // button; Done disarms the slope tool + clears `active`.
                  <div className={styles.rightBody}>
                    <SlopeSurveyPanel projectId={id} />
                  </div>
                ) : asBuiltActive ? (
                  // While an as-built deviation is being recorded the rail is
                  // taken over by the as-built form (panel variant): the
                  // Dashboard/Objective toggle is hidden and reappears when the
                  // store's `active` clears (Record/Cancel).
                  <div className={styles.rightBody}>
                    <ActAsBuiltPopover variant="panel" projectId={id} />
                  </div>
                ) : sectorsEditorActive ? (
                  // Clicking the floating SectorCompass HUD takes the rail over
                  // with the sectors editor; the Dashboard/Objective toggle is
                  // hidden and reappears when the editor's Done clears `active`.
                  // (As-built keeps precedence above.)
                  <div className={styles.rightBody}>
                    <SectorsEditorPanel projectId={id} />
                  </div>
                ) : (
                  <>
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
                        onClick={() => {
                          setRightMode('dashboard');
                          setWeatherOpen(false);
                        }}
                      >
                        <LayoutDashboard size={14} aria-hidden="true" />
                        Dashboard
                      </button>
                      {railMode === 'protocols' ? (
                        // Contextual second tab: in Protocols mode the right rail's
                        // detail slot holds the selected protocol, so the tab reads
                        // "Protocols" and gates on a protocol selection.
                        <button
                          type="button"
                          role="tab"
                          aria-selected={rightMode === 'detail'}
                          className={styles.rightToggleBtn}
                          data-active={rightMode === 'detail'}
                          disabled={!selectedProtocolId}
                          onClick={() =>
                            selectedProtocolId && setRightMode('detail')
                          }
                        >
                          <ShieldCheck size={14} aria-hidden="true" />
                          Protocols
                        </button>
                      ) : (
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
                      )}
                    </div>
                    <div className={styles.rightBody}>
                      {rightMode === 'detail' &&
                      railMode === 'protocols' &&
                      selectedProtocolId ? (
                        <ActProtocolDetailPane
                          projectId={id}
                          primaryTypeId={primaryTypeId}
                          secondaryTypeIds={secondaryTypeIds}
                          templateId={selectedProtocolId}
                        />
                      ) : rightMode === 'detail' && selectedObjective ? (
                        <>
                          {/* Generic "Open map with tools" CTA — self-gates to
                              objectives that resolve to >= 1 map draw/place tool,
                              so it appears only for spatial objectives (the two
                              bespoke surveys keep their own richer buttons). */}
                          <OpenMapToolsButton
                            projectId={id}
                            objective={selectedObjective}
                          />
                          <ActTierExecutionPanel
                            projectId={id}
                            tier={selectedObjectiveTier}
                            objective={selectedObjective}
                            status={selectedObjectiveStatus}
                            serverId={serverId}
                            members={members}
                            currentUserId={currentUserId}
                            myRole={myRole}
                          />
                        </>
                      ) : workOpen ? (
                        <ActWorkPanel
                          projectId={id}
                          onBack={closeWorkPanel}
                          initialFilter={workFilter}
                          onOpenCalendar={openWorkCalendar}
                        />
                      ) : weatherOpen ? (
                        <ActTierWeatherPanel
                          project={project}
                          onBack={() => setWeatherOpen(false)}
                        />
                      ) : (
                        <>
                          {/* Read-only Threshold-3 mandate briefing: self-gates
                              to null until the project has crossed into Act. */}
                          <ActMandateBriefingCard
                            projectId={id}
                            objectives={objectives}
                            objectiveStatuses={planObjectiveStatuses}
                          />
                          <ActOpsDashboard
                            projectId={id}
                            onOpenWeather={() => setWeatherOpen(true)}
                            onOpenWork={openWorkPanel}
                          />
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          }
          bottomTray={
            showTierZeroWorkbench ? undefined : (
              <ActTierCategorizedToolsRail
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
      {lockedPopoverStratum && (
        <StratumLockedPopover
          stratum={lockedPopoverStratum}
          objectives={objectives}
          objectiveStatuses={planObjectiveStatuses}
          currentObjectiveId={objectiveId ?? null}
          onAcknowledge={(obj) => {
            setLockedPopoverStratum(null);
            setRightMode('detail');
            goToObjective(obj.id);
          }}
          onDismiss={() => setLockedPopoverStratum(null)}
        />
      )}
    </div>
  );
}
