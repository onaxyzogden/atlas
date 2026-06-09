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
import { planHeaderProjectTypeLabel } from '../../plan/strata/planHeaderLabel.js';
import DiagnoseMap from '../../components/DiagnoseMap.js';
import BaseMapCard from '../../plan/canvas/BaseMapCard.js';
import MapToolbar from '../../observe/components/MapToolbar.js';
import MapSheetExportControl from '../../plan/MapSheetExportControl.js';
import ObserveAnnotationLayers from '../../observe/components/layers/ObserveAnnotationLayers.js';
import SectorCompassOverlay from '../../observe/components/overlays/SectorCompassOverlay.js';
import PlanDataLayers from '../../plan/layers/PlanDataLayers.js';
import StageShell from '../../_shell/StageShell.js';
import ActDataLayers from '../layers/ActDataLayers.js';
import ActStructureClickHandler from '../layers/ActStructureClickHandler.js';
import ActFeatureClickHandler from '../layers/ActFeatureClickHandler.js';
import ActStructurePopover from '../ActStructurePopover.js';
import ActAsBuiltPopover from '../asBuilt/ActAsBuiltPopover.js';
import { useActAsBuiltPopoverStore } from '../asBuilt/actAsBuiltPopoverStore.js';
import SectorsEditorPanel from '../sectors/SectorsEditorPanel.js';
import { useActSectorsEditorStore } from '../sectors/actSectorsEditorStore.js';
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
import ActTierSpine from './ActTierSpine.js';
import ActTierObjectiveRail from './ActTierObjectiveRail.js';
import ActSearchRail from './ActSearchRail.js';
import type { RailMode } from './ActRailModeToggle.js';
import ActTierMapMarkers from './ActTierMapMarkers.js';
import ProtocolMapMarkers from './ProtocolMapMarkers.js';
import ActTierCategorizedToolsRail from './ActTierCategorizedToolsRail.js';
import ActTierExecutionPanel from './ActTierExecutionPanel.js';
import ActProtocolDetailPane from './ActProtocolDetailPane.js';
import ActTierWeatherPanel from './ActTierWeatherPanel.js';
import VisionFormsTabsModal from './VisionFormsTabsModal.js';
import ActTierZeroWorkbench from './ActTierZeroWorkbench.js';
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
// Stable empty fallbacks for the decision-rationale / deferred-decisions
// selectors so they never return a fresh object literal (which would trigger
// an infinite re-render under Zustand v5), matching the EMPTY_FORMS pattern.
const EMPTY_RATIONALES: Readonly<Record<string, string>> = Object.freeze({});
const EMPTY_DEFERRED: Readonly<Record<string, true>> = Object.freeze({});
const STRATUM_IDS = PLAN_STRATA.map((s) => s.id);
const NOOP_RAIL_MODE = (_: RailMode) => {};
const NOOP_PROTOCOL = (_: string) => {};
const EMPTY_TRIGGERED_IDS: readonly string[] = [];
// S1 is the canonical cold-entry fallback. PLAN_STRATA is non-empty, but
// noUncheckedIndexedAccess types [0] as possibly-undefined — guard with the
// known S1 id literal so the derived stratum id stays a plain string.
const S1_STRATUM_ID = PLAN_STRATA[0]?.id ?? 's1-project-foundation';

// Phase B/C Tier-0 swap: non-spatial foundation objectives render the inline
// non-map decision workbench instead of the map shell. Widened incrementally
// from a single id to a membership set as more objectives convert (Phase C
// part 3 adds 's1-boundaries' then 's1-stakeholders' alongside the universal
// 's1-vision').
const TIER_ZERO_OBJECTIVE_IDS = new Set<string>([
  's1-vision',
  's1-boundaries',
  's1-stakeholders',
  'ev-s1-legal-governance',
  'ev-s1-provision-balance',
  's2-terrain',
  's2-climate',
  's2-ecology',
  'ev-s2-landscape-vectors',
  'ev-s2-carrying-capacity',
  'silv-sec-s3-forage-survey',
]);

/**
 * Tier-0 by resolved-objective identity. Used once the per-project objective
 * set has hydrated and `selectedObjective` is non-null.
 */
function isTierZeroObjective(objective: PlanStratumObjective | null): boolean {
  return objective != null && TIER_ZERO_OBJECTIVE_IDS.has(objective.id);
}

/**
 * Tier-0 by route identity — keys off the synchronous URL `objectiveId` so the
 * map shell is never mounted on a cold deep-link to a Tier-0 route while the
 * objective set is still hydrating (`selectedObjective` lags a tick behind the
 * route). Tests the same membership set the resolved-objective predicate uses,
 * so the two converge once hydration completes.
 */
function isTierZeroObjectiveId(objectiveId: string | null): boolean {
  return objectiveId != null && TIER_ZERO_OBJECTIVE_IDS.has(objectiveId);
}

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
  // Same label the Plan stratum-spine header shows (primary first, ` · `-joined;
  // null when no primary type). Feeds the Act spine's project identity tile.
  const projectTypeLabel = planHeaderProjectTypeLabel(
    primaryTypeId,
    secondaryTypeIds,
  );

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

  // Decision rationale + deferral state for the Tier-0 workbench, keyed by
  // itemId under this project. Stable empty fallbacks (see above) keep the
  // selector referentially stable under Zustand v5.
  const decisionRationales = useActEvidenceStore(
    (s) => s.decisionRationale[id] ?? EMPTY_RATIONALES,
  );
  const deferredDecisions = useActEvidenceStore(
    (s) => s.deferredDecisions[id] ?? EMPTY_DEFERRED,
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

  const handleSaveRationale = useCallback(
    (itemId: string, text: string) => {
      useActEvidenceStore.getState().saveDecisionRationale(id, itemId, text);
    },
    [id],
  );
  const handleToggleDefer = useCallback(
    (itemId: string, deferred: boolean) => {
      useActEvidenceStore.getState().setDecisionDeferred(id, itemId, deferred);
    },
    [id],
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

  // Phase B swap flag: render the inline Tier-0 decision workbench in place of
  // the map shell when the selected objective is the universal s1-vision one.
  // Keyed off the URL-synchronous objectiveId first (not only the resolved
  // selectedObjective) so a cold deep-link to the vision route never transiently
  // mounts <StageShell>/<DiagnoseMap> (WebGL) during the tick before objectives
  // hydrate. Falls back to the resolved-objective check so an in-app selection
  // whose route change hasn't landed yet still swaps.
  const showTierZeroWorkbench =
    isTierZeroObjectiveId(objectiveId) ||
    (selectedObjective != null && isTierZeroObjective(selectedObjective));

  return (
    <div className={styles.tierShell}>
      <ActTierSpine
        strata={PLAN_STRATA}
        objectives={objectives}
        stratumStates={stratumStates}
        lockedStratumIds={lockedStratumIds}
        activeStratumId={selectedStratumId}
        onSelectStratum={handleSelectStratum}
        projectTitle={project.name}
        projectTypeLabel={projectTypeLabel}
      />
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
              Loading decision workbench…
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
              />
            ) : (
              <ActTierObjectiveRail
                stratum={selectedStratum}
                objectives={stratumObjectives}
                progressByObjective={checklistProgressByObjective}
                activeObjectiveId={objectiveId}
                onSelectObjective={handleSelectObjective}
                mode={showTierZeroWorkbench ? 'objectives' : railMode}
                onModeChange={showTierZeroWorkbench ? NOOP_RAIL_MODE : handleRailModeChange}
                triggeredCount={showTierZeroWorkbench ? 0 : triggeredCount}
                triggeredIds={showTierZeroWorkbench ? EMPTY_TRIGGERED_IDS : triggeredIds}
                projectId={id}
                primaryTypeId={primaryTypeId}
                secondaryTypeIds={secondaryTypeIds}
                activeStratumId={selectedStratumId}
                selectedProtocolId={showTierZeroWorkbench ? null : selectedProtocolId}
                onSelectProtocol={showTierZeroWorkbench ? NOOP_PROTOCOL : handleSelectProtocol}
                bulkActivation={!showTierZeroWorkbench}
              />
            )
          }
          canvas={
            showTierZeroWorkbench && selectedObjective ? (
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
              />
            ) : (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <DiagnoseMap centroid={baseCentroid} boundary={safeBoundary}>
                  {({ map }) => (
                    <>
                      <BaseMapCard stage="act" />
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
                      <ActStructureClickHandler map={map} projectId={id} />
                      <ActFeatureClickHandler map={map} projectId={id} />
                      <ActDataLayers
                        map={map}
                        projectId={id}
                        activeModule={activeModule}
                      />
                      <SectorCompassOverlay
                        projectId={id}
                        map={map}
                        onOpenEditor={() => {
                          // Mutually-exclusive rail takeovers: clear any as-built
                          // session before arming the sectors editor so the rail
                          // never has two claimants.
                          useActAsBuiltPopoverStore.getState().close();
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
                      />
                      <ProtocolMapMarkers
                        map={map}
                        centroid={baseCentroid}
                        triggeredCount={triggeredCount}
                      />
                      <ActDrawHost map={map} projectId={params.projectId ?? null} />
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
                  <ActOpsDashboard
                    projectId={id}
                    onOpenWeather={() => setWeatherOpen(true)}
                  />
                </div>
              </div>
            ) : (
              <div className={styles.rightRail}>
                {asBuiltActive ? (
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
                      ) : weatherOpen ? (
                        <ActTierWeatherPanel
                          project={project}
                          onBack={() => setWeatherOpen(false)}
                        />
                      ) : (
                        <ActOpsDashboard
                          projectId={id}
                          onOpenWeather={() => setWeatherOpen(true)}
                        />
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
