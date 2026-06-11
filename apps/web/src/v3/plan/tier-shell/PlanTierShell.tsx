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
 *                     Objectives/Protocols mode toggle is suppressed
 *                     (hideModeToggle) — Plan has no standing-protocol library
 *                     mode in this shell.
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
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  PLAN_STRATA,
  computeAllObjectiveStatuses,
  computeAllStratumStates,
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
import { useEffectiveChecklistProgress } from '../../strata/useEffectiveChecklistProgress.js';
import { planHeaderProjectTypeLabel } from '../strata/planHeaderLabel.js';
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
import ActTierSpine from '../../act/tier-shell/ActTierSpine.js';
import ActTierObjectiveRail from '../../act/tier-shell/ActTierObjectiveRail.js';
import { type RailMode } from '../../act/tier-shell/ActRailModeToggle.js';
import VisionFormsTabsModal from '../../act/tier-shell/VisionFormsTabsModal.js';
import ActTierZeroWorkbench from '../../act/tier-shell/ActTierZeroWorkbench.js';
import {
  isTierZeroObjective,
  isTierZeroObjectiveId,
} from '../../act/tier-shell/tierZeroObjectives.js';
import ActFlowConnectorPopover from '../../act/asBuilt/ActFlowConnectorPopover.js';
import { decodeSteward, stewardInvitesToQueued } from '../../act/tier-shell/StewardCapture.js';
import { FORAGE_PREFIX, planForagePaddockReconcile } from '../../act/tier-shell/ForageCapture.js';
import {
  ACT_TOOL_CATEGORIES,
  resolveActTools,
  type ActTool,
  type FormValue,
} from '../../act/tier-shell/actToolCatalog.js';
import { QUICK_LOGS } from '../../act/quickLogs.js';
import { computeChecklistProgress } from '../../act/tier-shell/objectiveProgress.js';
import { resolveActStratumId } from '../../act/tier-shell/resolveActStratumId.js';
import PlanTierCategorizedToolsRail from './PlanTierCategorizedToolsRail.js';
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
const STRATUM_IDS = PLAN_STRATA.map((s) => s.id);
// S1 is the canonical cold-entry fallback (see ActTierShell). PLAN_STRATA is
// non-empty, but noUncheckedIndexedAccess types [0] as possibly-undefined.
const S1_STRATUM_ID = PLAN_STRATA[0]?.id ?? 's1-project-foundation';
// Inert handlers for the objective rail's protocol-mode props. PlanTierShell
// runs the rail with hideModeToggle, so neither ever fires — but the rail still
// types them as required (parity with Act's NOOP_RAIL_MODE / NOOP_PROTOCOL).
const NOOP_RAIL_MODE = (_: RailMode) => {};
const NOOP_PROTOCOL = (_: string) => {};

type RightMode = 'dashboard' | 'detail';

export default function PlanTierShell() {
  const params = useParams({ strict: false }) as {
    projectId?: string;
    objectiveId?: string;
    stratumId?: string;
  };
  const id = params.projectId ?? 'mtc';
  const objectiveId = params.objectiveId ?? null;
  const navigate = useNavigate();

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

  // Project-type label for the spine identity tile (same source Plan reads).
  const typeRecord = project.metadata?.projectTypeRecord;
  const primaryTypeId = typeRecord?.primaryTypeId ?? null;
  const secondaryTypeIds = typeRecord?.secondaryTypeIds ?? [];
  const projectTypeLabel = planHeaderProjectTypeLabel(
    primaryTypeId,
    secondaryTypeIds,
  );

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

  // Tier-0 swap flag: render the interactive decision workbench in place of the
  // editable map canvas when the selected objective is a non-spatial Tier-0 one
  // ("Plan decides" — the workbench moved here from Act). Keyed off the
  // URL-synchronous objectiveId first so a cold deep-link never transiently
  // mounts VisionLayoutCanvas (WebGL) before objectives hydrate; falls back to
  // the resolved-objective check for in-app selections. Plan has no
  // survey/slope map-takeover stores, so (unlike Act) there are no guards here.
  const showTierZeroWorkbench =
    isTierZeroObjectiveId(objectiveId) ||
    (selectedObjective != null && isTierZeroObjective(selectedObjective));

  const [rightMode, setRightMode] = useState<RightMode>(
    objectiveId ? 'detail' : 'dashboard',
  );
  // URL drives detail/dashboard: a selected objective shows detail; clearing it
  // falls back to the dashboard. A local toggle can still flip to dashboard
  // while an objective is selected.
  useEffect(() => {
    setRightMode(objectiveId ? 'detail' : 'dashboard');
  }, [objectiveId]);

  // Center canvas view (vision design surface by default). PlanPhaseTabs lets
  // the steward swap vision ⇄ terrain3d ⇄ current over the same canvas, exactly
  // as the legacy module-bar PlanLayout does.
  const [activeView, setActiveView] = useState<PlanView>('vision');

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

  return (
    <PlanViewProvider view={activeView}>
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
          ariaLabel="Plan strata"
        />
        <div className={styles.shellWrap}>
          {showTierZeroWorkbench && !selectedObjective ? (
            // Tier-0 route resolved before its objective set hydrated: hold a
            // lightweight non-map placeholder rather than mounting the WebGL
            // VisionLayoutCanvas (which would wedge the headless preview).
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
              <ActTierObjectiveRail
                stratum={selectedStratum}
                objectives={stratumObjectives}
                progressByObjective={checklistProgressByObjective}
                activeObjectiveId={objectiveId}
                onSelectObjective={handleSelectObjective}
                // Plan has no protocol-library mode in this shell: hide the
                // toggle and force the objectives list. The protocol props are
                // inert stubs the rail still requires.
                hideModeToggle
                mode="objectives"
                onModeChange={NOOP_RAIL_MODE}
                triggeredCount={0}
                projectId={id}
                primaryTypeId={primaryTypeId}
                secondaryTypeIds={secondaryTypeIds}
                activeStratumId={selectedStratumId}
                selectedProtocolId={null}
                onSelectProtocol={NOOP_PROTOCOL}
              />
            }
            canvas={
              showTierZeroWorkbench && selectedObjective ? (
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
                  />
                  <PlanPhaseTabs active={activeView} onChange={setActiveView} />
                </div>
              )
            }
            rightRail={
              <div className={styles.rightRail}>
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
                      // The map lives in the CENTER canvas; suppress the panel's
                      // embedded ObjectiveMap so it isn't duplicated.
                      hideMap
                    />
                  ) : (
                    <PlanReadyCue projectId={params.projectId ?? null} />
                  )}
                </div>
              </div>
            }
            bottomTray={
              showTierZeroWorkbench ? undefined : (
                <PlanTierCategorizedToolsRail
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
