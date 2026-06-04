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
import { LayoutDashboard, Target } from 'lucide-react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useTriggeredProtocols } from '../../../store/protocolStore.js';
import {
  PLAN_STRATA,
  computeAllActStratumStates,
  computeAllObjectiveStatuses,
  getObjectiveActTools,
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
import { usePlanStratumProgressStore } from '../../../store/planStratumStore.js';
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
import ActAsBuiltDrawHandler from '../asBuilt/ActAsBuiltDrawHandler.js';
import ActFlowConnectorPopover from '../asBuilt/ActFlowConnectorPopover.js';
import { useActFlowPopoverStore } from '../asBuilt/actFlowPopoverStore.js';
import ActDrawHost from '../draw/ActDrawHost.js';
import ObserveDrawHost from '../../observe/components/draw/ObserveDrawHost.js';
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
import VisionFormsTabsModal from './VisionFormsTabsModal.js';
import {
  ACT_TOOL_CATEGORIES,
  resolveActTools,
  type ActTool,
} from './actToolCatalog.js';
import { useActEvidenceStore } from '../../../store/actEvidenceStore.js';
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
const STRATUM_IDS = PLAN_STRATA.map((s) => s.id);
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
  const currentUserId = useAuthStore((s) => s.user?.id);
  // Pull this project's ActTasks on mount so the bridge hook can distinguish
  // 'no-task' from 'ready'. No-op for local-only projects.
  useActTaskSync(id, serverId);
  useEffect(() => {
    if (serverId && members.length === 0) void fetchMembers(serverId);
  }, [serverId, members.length, fetchMembers]);
  const myRole = useMemo(
    () => members.find((m) => m.userId === currentUserId)?.role,
    [members, currentUserId],
  );

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

  // Left-rail view: design objectives (default) vs the standing-protocol library.
  const [railMode, setRailMode] = useState<RailMode>('objectives');
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
  // When an as-built deviation is being recorded, the right rail swaps to the
  // as-built form (panel variant) and hides the dashboard/objective toggle;
  // closing/saving clears `active` and reverts the rail.
  const asBuiltActive = useActAsBuiltPopoverStore((s) => s.active != null);
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

  const setActiveTool = useMapToolStore((s) => s.setActiveTool);

  // URL drives detail/dashboard: a selected objective shows detail; clearing
  // it falls back to the dashboard. A local toggle can still flip to dashboard
  // while an objective is selected.
  useEffect(() => {
    setRightMode(objectiveId ? 'detail' : 'dashboard');
  }, [objectiveId]);

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
      goToStratum(stratumId);
    },
    [goToStratum],
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
      setRightMode('detail');
      goToObjective(nextObjectiveId);
    },
    [goToObjective, objectiveId],
  );

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
      // Field log (harvest / water / livestock) — route through the existing
      // QuickLog path so ActDrawHost handles the click-to-log interaction.
      // `arm` is hoisted to a const so the narrowing survives the closure.
      const log = QUICK_LOGS.find((l) => l.id === arm.quickLogId);
      if (!log) return;
      setActiveModule(log.module);
      if (log.toolId) setActiveTool(log.toolId);
    },
    [setActiveModule, setActiveTool, selectedObjective],
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

  return (
    <div className={styles.tierShell}>
      <ActTierSpine
        strata={PLAN_STRATA}
        objectives={objectives}
        stratumStates={stratumStates}
        activeStratumId={selectedStratumId}
        onSelectStratum={handleSelectStratum}
        projectTitle={project.name}
        projectTypeLabel={projectTypeLabel}
      />
      <div className={styles.shellWrap}>
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
                mode={railMode}
                onModeChange={setRailMode}
                triggeredCount={triggeredCount}
                triggeredIds={triggeredIds}
                projectId={id}
                primaryTypeId={primaryTypeId}
                secondaryTypeIds={secondaryTypeIds}
              />
            )
          }
          canvas={
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
                    <ObserveAnnotationLayers map={map} projectId={id} />
                    <PlanDataLayers map={map} projectId={id} editable={false} />
                    <ActStructureClickHandler map={map} projectId={id} />
                    <ActFeatureClickHandler map={map} projectId={id} />
                    <ActDataLayers
                      map={map}
                      projectId={id}
                      activeModule={activeModule}
                    />
                    <SectorCompassOverlay projectId={id} map={map} />
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
          }
          rightRail={
            <div className={styles.rightRail}>
              {asBuiltActive ? (
                // While an as-built deviation is being recorded the rail is
                // taken over by the as-built form (panel variant): the
                // Dashboard/Objective toggle is hidden and reappears when the
                // store's `active` clears (Record/Cancel).
                <div className={styles.rightBody}>
                  <ActAsBuiltPopover variant="panel" projectId={id} />
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
                    {rightMode === 'detail' && selectedObjective ? (
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
                    ) : (
                      <ActOpsDashboard projectId={id} />
                    )}
                  </div>
                </>
              )}
            </div>
          }
          bottomTray={
            <ActTierCategorizedToolsRail
              objective={selectedObjective}
              disabled={!params.projectId}
              onActivate={handleActivateTool}
              activeFormId={openFormGroup?.activeFormId ?? null}
            />
          }
        />
      </div>
      <VisionFormsTabsModal
        open={openFormGroup !== null}
        title={openFormGroup?.title ?? ''}
        tools={openFormGroup?.tools ?? []}
        activeFormId={openFormGroup?.activeFormId ?? ''}
        initialValues={visionForms}
        projectId={id}
        metadata={project.metadata ?? null}
        checklistItems={selectedObjective?.checklist ?? []}
        onTabChange={(formId) =>
          setOpenFormGroup((g) => (g ? { ...g, activeFormId: formId } : g))
        }
        onSave={handleFormSave}
        onClose={() => setOpenFormGroup(null)}
      />
    </div>
  );
}
