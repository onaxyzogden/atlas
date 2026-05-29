/**
 * ActProtoTierShell — PROTOTYPE-ONLY entry component for the map-centric Act
 * tier shell concept. Fuses four rails that today live in different corners of
 * OLOS into one screen:
 *
 *   TOP    — tier spine (Plan tiers T0-T6)            ActProtoSpine
 *   LEFT   — chosen tier's objectives as cards        ActProtoObjectiveRail
 *   CENTER — shared MapLibre canvas + objective pins  DiagnoseMap + ActProtoMapMarkers
 *   BOTTOM — grouped digital-tools rail               ActProtoToolsRail
 *   RIGHT  — dashboard  <->  objective execution      ActProtoDashboard / ActProtoExecutionPanel
 *
 * StageShell has no top slot, so the spine wraps ABOVE it. All interaction
 * state is local (no stores written); tier/objective status, priority, and
 * SEED coordinates are mock (see actProtoMock.ts). Objectives come from the
 * static `PLAN_TIER_OBJECTIVES` skeleton, NOT a project's per-type resolved
 * set (Sub-slice D) - this prototype demonstrates the four-rail layout, not
 * objective resolution, so it intentionally stays on the skeleton. This whole
 * folder is one
 * `rm` away from deletion and coexists with the live ActLayout — it does not
 * replace it. Mounted at the dev route /v3/project/mtc/act/tier-prototype.
 */

import { useCallback, useMemo, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { LayoutDashboard, Target } from 'lucide-react';
import { PLAN_TIERS, PLAN_TIER_OBJECTIVES } from '@ogden/shared';
import { useProjectStore, MTC_SEED } from '../../../store/projectStore.js';
import { extractBoundaryGeometry } from '../../../lib/geo.js';
import DiagnoseMap, { polygonBounds } from '../../components/DiagnoseMap.js';
import BaseMapCard from '../../plan/canvas/BaseMapCard.js';
import StageShell from '../../_shell/StageShell.js';
import ActProtoSpine from './ActProtoSpine.js';
import ActProtoObjectiveRail from './ActProtoObjectiveRail.js';
import ActProtoToolsRail from './ActProtoToolsRail.js';
import ActProtoDashboard from './ActProtoDashboard.js';
import ActProtoExecutionPanel from './ActProtoExecutionPanel.js';
import ActProtoMapMarkers from './ActProtoMapMarkers.js';
import { protoObjectiveStatus, protoTierState } from './actProtoMock.js';
import styles from './ActProtoTierShell.module.css';

const FALLBACK_CENTROID: [number, number] = [-78.2, 44.5];
const DEFAULT_TIER_ID = 't1-land-reading';

type RightMode = 'dashboard' | 'detail';

export default function ActProtoTierShell() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const id = params.projectId ?? 'mtc';

  const projects = useProjectStore((s) => s.projects);
  const project = useMemo(
    () => projects.find((p) => p.id === id || p.serverId === id) ?? MTC_SEED,
    [projects, id],
  );

  const boundary = extractBoundaryGeometry(project.parcelBoundaryGeojson) as
    | GeoJSON.Polygon
    | undefined;

  // One centroid shared by the rail SEED labels and the map pins so they align.
  const baseCentroid = useMemo<[number, number]>(() => {
    if (boundary) {
      const bounds = polygonBounds(boundary);
      if (bounds) {
        const center = bounds.getCenter();
        return [center.lng, center.lat];
      }
    }
    return FALLBACK_CENTROID;
  }, [boundary]);

  const [selectedTierId, setSelectedTierId] = useState(DEFAULT_TIER_ID);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(
    null,
  );
  const [rightMode, setRightMode] = useState<RightMode>('dashboard');
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

  const selectedTier = useMemo(
    () => PLAN_TIERS.find((t) => t.id === selectedTierId),
    [selectedTierId],
  );
  const tierObjectives = useMemo(
    () => PLAN_TIER_OBJECTIVES.filter((o) => o.tierId === selectedTierId),
    [selectedTierId],
  );
  const selectedObjective = useMemo(
    () =>
      selectedObjectiveId
        ? PLAN_TIER_OBJECTIVES.find((o) => o.id === selectedObjectiveId) ?? null
        : null,
    [selectedObjectiveId],
  );
  const selectedObjectiveTier = useMemo(
    () =>
      selectedObjective
        ? PLAN_TIERS.find((t) => t.id === selectedObjective.tierId)
        : undefined,
    [selectedObjective],
  );
  const selectedObjectiveStatus = useMemo(() => {
    if (!selectedObjective) return 'available' as const;
    const index = PLAN_TIER_OBJECTIVES.filter(
      (o) => o.tierId === selectedObjective.tierId,
    ).findIndex((o) => o.id === selectedObjective.id);
    return protoObjectiveStatus(selectedObjective.tierId, index);
  }, [selectedObjective]);

  const handleSelectTier = useCallback((tierId: string) => {
    setSelectedTierId(tierId);
    setSelectedObjectiveId(null);
    setRightMode('dashboard');
  }, []);

  const handleSelectObjective = useCallback((objectiveId: string) => {
    setSelectedObjectiveId(objectiveId);
    setRightMode('detail');
  }, []);

  return (
    <div className={styles.protoShell}>
      <ActProtoSpine
        tiers={PLAN_TIERS}
        objectives={PLAN_TIER_OBJECTIVES}
        tierState={protoTierState}
        activeTierId={selectedTierId}
        onSelectTier={handleSelectTier}
      />
      <div className={styles.shellWrap}>
        <StageShell
          canvasLabel="Act tier canvas"
          leftRailLabel="Tier objectives"
          rightRailLabel="Dashboard and objective detail"
          leftRail={
            <ActProtoObjectiveRail
              tier={selectedTier}
              objectives={tierObjectives}
              centroid={baseCentroid}
              activeObjectiveId={selectedObjectiveId}
              onSelectObjective={handleSelectObjective}
            />
          }
          canvas={
            <DiagnoseMap centroid={baseCentroid} boundary={boundary}>
              {({ map }) => (
                <>
                  <BaseMapCard stage="act" />
                  <ActProtoMapMarkers
                    map={map}
                    centroid={baseCentroid}
                    objectives={tierObjectives}
                    activeObjectiveId={selectedObjectiveId}
                    onSelectObjective={handleSelectObjective}
                  />
                </>
              )}
            </DiagnoseMap>
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
                  disabled={!selectedObjective}
                  onClick={() =>
                    selectedObjective && setRightMode('detail')
                  }
                >
                  <Target size={14} aria-hidden="true" />
                  Objective
                </button>
              </div>
              <div className={styles.rightBody}>
                {rightMode === 'detail' && selectedObjective ? (
                  <ActProtoExecutionPanel
                    tier={selectedObjectiveTier}
                    objective={selectedObjective}
                    status={selectedObjectiveStatus}
                  />
                ) : (
                  <ActProtoDashboard projectId={id} />
                )}
              </div>
            </div>
          }
          bottomTray={
            <ActProtoToolsRail
              activeToolId={activeToolId}
              onSelectTool={setActiveToolId}
            />
          }
        />
      </div>
    </div>
  );
}
