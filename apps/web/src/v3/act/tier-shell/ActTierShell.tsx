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
 *   RIGHT  panel     — the already-real ViewBDashboard / ViewAObjectiveExecution
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
import {
  PLAN_STRATA,
  computeAllActStratumStates,
} from '@ogden/shared';
import {
  useProjectStore,
  MTC_SEED,
  type ActShellMode,
} from '../../../store/projectStore.js';
import {
  selectFieldActionsForProject,
  useFieldActionStore,
} from '../../../store/fieldActionStore.js';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import { extractBoundaryGeometry } from '../../../lib/geo.js';
import { useV3Project } from '../../data/useV3Project.js';
import { useProjectObjectives } from '../../plan/strata/useProjectObjectives.js';
import DiagnoseMap, { polygonBounds } from '../../components/DiagnoseMap.js';
import BaseMapCard from '../../plan/canvas/BaseMapCard.js';
import ObserveAnnotationLayers from '../../observe/components/layers/ObserveAnnotationLayers.js';
import SectorCompassOverlay from '../../observe/components/overlays/SectorCompassOverlay.js';
import PlanDataLayers from '../../plan/layers/PlanDataLayers.js';
import StageShell from '../../_shell/StageShell.js';
import ActDataLayers from '../layers/ActDataLayers.js';
import ActStructureClickHandler from '../layers/ActStructureClickHandler.js';
import ActStructurePopover from '../ActStructurePopover.js';
import ActDrawHost from '../draw/ActDrawHost.js';
import ViewBDashboard from '../field-action/ViewBDashboard.js';
import ViewAObjectiveExecution from '../field-action/ViewAObjectiveExecution.js';
import ActShellToggle from '../field-action/ActShellToggle.js';
import ProofSyncIndicator from '../field-action/proof/ProofSyncIndicator.js';
import { seedActionsIfEmpty } from '../field-action/seedDemoActions.js';
import type { ActModule } from '../types.js';
import type { QuickLog } from '../quickLogs.js';
import { computeObjectiveProgress } from './objectiveProgress.js';
import { computeObjectiveMarkerPositions } from './objectiveMarkerGeometry.js';
import ActTierSpine from './ActTierSpine.js';
import ActTierObjectiveRail from './ActTierObjectiveRail.js';
import ActTierMapMarkers from './ActTierMapMarkers.js';
import ActTierToolsRail from './ActTierToolsRail.js';
import styles from './ActTierShell.module.css';

const FALLBACK_CENTROID: [number, number] = [-78.2, 44.5];
const DEFAULT_STRATUM_ID = 's2-land-reading';
const STRATUM_IDS = PLAN_STRATA.map((s) => s.id);

type RightMode = 'dashboard' | 'detail';

interface Props {
  shellMode: ActShellMode;
  onShellModeChange: (mode: ActShellMode) => void;
}

export default function ActTierShell({ shellMode, onShellModeChange }: Props) {
  const params = useParams({ strict: false }) as {
    projectId?: string;
    objectiveId?: string;
  };
  const id = params.projectId ?? 'mtc';
  const objectiveId = params.objectiveId ?? null;
  const navigate = useNavigate();

  const projects = useProjectStore((s) => s.projects);
  const project = useMemo(
    () => projects.find((p) => p.id === id || p.serverId === id) ?? MTC_SEED,
    [projects, id],
  );

  const boundary = extractBoundaryGeometry(project.parcelBoundaryGeojson) as
    | GeoJSON.Polygon
    | undefined;

  // Coords-only fallback (no boundary): prefer the parcel's intake center via
  // the v2->v3 adapter seam over the hard-coded stage centroid.
  const v3Project = useV3Project(params.projectId);
  const fallbackCenter = v3Project?.location.center ?? FALLBACK_CENTROID;

  // One centroid shared by the objective markers so pins sit on the parcel.
  const baseCentroid = useMemo<[number, number]>(() => {
    if (boundary) {
      const bounds = polygonBounds(boundary);
      if (bounds) {
        const center = bounds.getCenter();
        return [center.lng, center.lat];
      }
    }
    return fallbackCenter;
  }, [boundary, fallbackCenter]);

  // Real data: objectives (per-project resolution) + field actions.
  const { objectives } = useProjectObjectives(id);
  const actions = useFieldActionStore((s) =>
    selectFieldActionsForProject(s, id),
  );

  // Defensive first-load seed for a detail-first deep link on a non-MTC
  // project (the dashboard, which normally seeds on mount, may not be
  // mounted yet). Idempotent — a no-op once any action exists. MTC seeds at
  // hydrate via seedMtcDemo, and ViewBDashboard seeds when shown, so this only
  // bites the deep-link-into-detail edge.
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

  const [selectedStratumId, setSelectedStratumId] = useState(DEFAULT_STRATUM_ID);
  const [rightMode, setRightMode] = useState<RightMode>(
    objectiveId ? 'detail' : 'dashboard',
  );
  const [activeModule, setActiveModule] = useState<ActModule | null>(null);

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

  const goToObjective = useCallback(
    (nextObjectiveId: string | null) => {
      if (!params.projectId) return;
      if (nextObjectiveId) {
        navigate({
          to: '/v3/project/$projectId/act/tier-shell/$objectiveId',
          params: { projectId: params.projectId, objectiveId: nextObjectiveId },
        });
      } else {
        navigate({
          to: '/v3/project/$projectId/act/tier-shell',
          params: { projectId: params.projectId },
        });
      }
    },
    [navigate, params.projectId],
  );

  const handleSelectStratum = useCallback(
    (stratumId: string) => {
      setSelectedStratumId(stratumId);
      goToObjective(null);
    },
    [goToObjective],
  );

  const handleSelectObjective = useCallback(
    (nextObjectiveId: string) => {
      setRightMode('detail');
      goToObjective(nextObjectiveId);
    },
    [goToObjective],
  );

  const handleActivateTool = useCallback(
    (log: QuickLog) => {
      setActiveModule(log.module);
      if (log.toolId) setActiveTool(log.toolId);
    },
    [setActiveTool],
  );

  return (
    <div className={styles.tierShell}>
      <ActTierSpine
        strata={PLAN_STRATA}
        objectives={objectives}
        stratumStates={stratumStates}
        activeStratumId={selectedStratumId}
        onSelectStratum={handleSelectStratum}
      />
      <div className={styles.shellWrap}>
        <StageShell
          canvasLabel="Act tier canvas"
          leftRailLabel="Stratum objectives"
          rightRailLabel="Dashboard and objective detail"
          leftRail={
            <ActTierObjectiveRail
              stratum={selectedStratum}
              objectives={stratumObjectives}
              progressByObjective={progressByObjective}
              activeObjectiveId={objectiveId}
              onSelectObjective={handleSelectObjective}
            />
          }
          canvas={
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <DiagnoseMap centroid={baseCentroid} boundary={boundary}>
                {({ map }) => (
                  <>
                    <BaseMapCard stage="act" />
                    <ObserveAnnotationLayers map={map} projectId={id} />
                    <PlanDataLayers map={map} projectId={id} editable={false} />
                    <ActStructureClickHandler map={map} projectId={id} />
                    <ActDataLayers
                      map={map}
                      projectId={id}
                      activeModule={activeModule}
                    />
                    <SectorCompassOverlay projectId={id} map={map} />
                    <ActStructurePopover map={map} projectId={id} />
                    <ActTierMapMarkers
                      map={map}
                      positionByObjective={positionByObjective}
                      objectives={stratumObjectives}
                      progressByObjective={progressByObjective}
                      activeObjectiveId={objectiveId}
                      onSelectObjective={handleSelectObjective}
                    />
                    <ActDrawHost map={map} projectId={params.projectId ?? null} />
                  </>
                )}
              </DiagnoseMap>
              <div className={styles.toggleFloat}>
                <ActShellToggle mode={shellMode} onChange={onShellModeChange} />
              </div>
            </div>
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
              <ProofSyncIndicator />
              <div className={styles.rightBody}>
                {rightMode === 'detail' && objectiveId ? (
                  <ViewAObjectiveExecution projectId={id} objectiveId={objectiveId} />
                ) : (
                  <ViewBDashboard projectId={id} />
                )}
              </div>
            </div>
          }
          bottomTray={
            <ActTierToolsRail
              disabled={!params.projectId}
              onActivate={handleActivateTool}
            />
          }
        />
      </div>
    </div>
  );
}
