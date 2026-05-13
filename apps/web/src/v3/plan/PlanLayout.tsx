/**
 * PlanLayout — route component for /v3/project/$projectId/plan.
 *
 * Two surfaces, swapped by the `PlanPhaseTabs` top strip:
 *
 * 1. `current` — legacy module-driven UI (PlanTools left, DiagnoseMap +
 *    MapToolbar + ObserveAnnotationLayers, PlanModuleBar bottom).
 *
 * 2. `vision` / `phase-1` / `phase-2` / `terrain3d` — Vision-Layout canvas:
 *    design-element palette (left), VisionLayoutCanvas (centre, with
 *    DesignElementLayers + DesignToolRail + BaseMapCard), no module bar.
 *    Phase tabs filter by Yeomans Scale of Permanence index. `terrain3d`
 *    drapes the same canvas over MapLibre 3D terrain via Terrain3DController.
 *
 * The PlanPhaseTabs strip itself overlays the canvas (absolute, top-centre).
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useProjectStore, MTC_SEED } from '../../store/projectStore.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useServerMachineryInventory } from '../../hooks/useServerMachineryInventory.js';
import { useV3Project } from '../data/useV3Project.js';
import DiagnoseMap from '../components/DiagnoseMap.js';
import MapToolbar from '../observe/components/MapToolbar.js';
import { useMapToolStore } from '../observe/components/measure/useMapToolStore.js';
import ObserveAnnotationLayers from '../observe/components/layers/ObserveAnnotationLayers.js';
import PlanTools from './PlanTools.js';
import PlanChecklistAside from './PlanChecklistAside.js';
import PlanModuleBar from './PlanModuleBar.js';
import PlanModuleSlideUp from './PlanModuleSlideUp.js';
import PlanPhaseTabs from './canvas/PlanPhaseTabs.js';
import DesignToolRail, { type ToolMode } from './canvas/DesignToolRail.js';
import DesignElementLayers from './canvas/layers/DesignElementLayers.js';
import { MapCursorHost } from './canvas/useMapCursor.js';
import BaseMapCard from './canvas/BaseMapCard.js';
import DeckOverlay from '../_shared/deck/DeckOverlay.js';
import {
  BeV2GenericLayer,
  DesignElementExtrusionLayer,
  DesignElementScenegraphLayer,
} from '../builtEnvironment/layers/index.js';
import VisionLayoutCanvas from './canvas/VisionLayoutCanvas.js';
import { isPlanModule, type PlanModule, type PlanView } from './types.js';
import { PlanViewProvider } from './PlanViewContext.js';
import StageShell from '../_shell/StageShell.js';
import PlanDrawHost from './draw/PlanDrawHost.js';
import InlineFeaturePopover from './draw/InlineFeaturePopover.js';
import UtilityConflictDialog from './draw/UtilityConflictDialog.js';
import PlanObserveSelectionHandler from './draw/PlanObserveSelectionHandler.js';
import ObserveLinkPopover from './draw/ObserveLinkPopover.js';
import PlanDataLayers from './layers/PlanDataLayers.js';
import PlanVertexEditHandler from './layers/PlanVertexEditHandler.js';
import PlanContoursOverlay from './layers/PlanContoursOverlay.js';
import PlanZoneRingsOverlay from './layers/PlanZoneRingsOverlay.js';
import PlanSunPathOverlay from './layers/PlanSunPathOverlay.js';
import PlanScheduledMovesOverlay from './layers/PlanScheduledMovesOverlay.js';
import PlanSelectionFloater from './PlanSelectionFloater.js';
import PlanStampToast from './draw/PlanStampToast.js';
import StampModePicker from './canvas/StampModePicker.js';
import TemporalScrubSlider from './canvas/TemporalScrubSlider.js';
import DesignStatusChip from './header/DesignStatusChip.js';

const FALLBACK_CENTROID: [number, number] = [-78.2, 44.5];

export default function PlanLayout() {
  const params = useParams({ strict: false }) as {
    projectId?: string;
    module?: string;
  };
  const navigate = useNavigate();

  const id = params.projectId ?? 'mtc';
  const moduleParam = params.module ?? '';
  const validModule: PlanModule | null = isPlanModule(moduleParam)
    ? moduleParam
    : null;

  const projects = useProjectStore((s) => s.projects);
  const updateProject = useProjectStore((s) => s.updateProject);
  const v3Project = useV3Project(params.projectId);

  const project = useMemo(
    () => projects.find((p) => p.id === id || p.serverId === id) ?? MTC_SEED,
    [projects, id],
  );

  const boundary = v3Project?.location.boundary;

  const [slideUpOpen, setSlideUpOpen] = useState(false);
  const [activeView, setActiveView] = useState<PlanView>('current');
  const [currentMode, setCurrentMode] = useState<ToolMode>('pan');
  const [currentHovering, setCurrentHovering] = useState(false);
  const [currentSelectedId, setCurrentSelectedId] = useState<string | null>(null);
  const activeTool = useMapToolStore((s) => s.activeTool);
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  const armedPlanDrawKind =
    activeTool && activeTool.startsWith('plan.') ? activeTool : null;

  // Plan stage assumes phases exist for phase-tagging on every drawn feature.
  // Seed the default 4 phases (Phase 1–4) on entry so the inline draw popovers'
  // Phase select renders real options instead of just "— Unassigned —".
  useEffect(() => {
    usePhaseStore.getState().ensureDefaults(id);
  }, [id]);

  // Hydrate machinery inventory from the server and bridge local store
  // mutations to /api/v1/machinery-items. Skipped for the MTC fallback id
  // since it isn't a real server project.
  useServerMachineryInventory(id === 'mtc' ? undefined : id);

  const handleSelectModule = (mod: PlanModule | null) => {
    if (!params.projectId) return;
    if (mod === null) {
      navigate({
        to: '/v3/project/$projectId/plan',
        params: { projectId: params.projectId },
      });
      setSlideUpOpen(false);
      return;
    }
    navigate({
      to: '/v3/project/$projectId/plan/$module',
      params: { projectId: params.projectId, module: mod },
    });
    setSlideUpOpen(false);
  };

  const handleBoundaryDrawn = (polygon: GeoJSON.Polygon) => {
    updateProject(id, {
      parcelBoundaryGeojson: {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: polygon }],
      },
      hasParcelBoundary: true,
    });
  };

  const isVisionCanvas =
    activeView === 'vision' ||
    activeView === 'phase-1' ||
    activeView === 'phase-2' ||
    activeView === 'terrain3d';

  // ── Canvas content ───────────────────────────────────────────────────────
  const canvasContent = isVisionCanvas ? (
    <VisionLayoutCanvas
      projectId={id}
      centroid={FALLBACK_CENTROID}
      boundary={boundary}
      view={activeView}
    />
  ) : (
    <DiagnoseMap centroid={FALLBACK_CENTROID} boundary={boundary}>
      {({ map }) => (
        <>
          <MapToolbar
            map={map}
            projectId={id}
            boundary={boundary ?? null}
            onBoundaryDrawn={handleBoundaryDrawn}
            showBoundary={false}
          />
          <MapCursorHost
            map={map}
            drawArmed={armedPlanDrawKind !== null}
            mode={currentMode}
            hovering={currentHovering}
          />
          <DesignToolRail
            map={map}
            activeKind={armedPlanDrawKind}
            projectId={id}
            onDisarmDraw={() => setActiveTool(null)}
            selectedId={currentSelectedId}
            setSelectedId={setCurrentSelectedId}
            mode={currentMode}
            setMode={setCurrentMode}
          />
          <BaseMapCard stage="plan" />
          <ObserveAnnotationLayers map={map} projectId={id} />
          {/* Plan Current mirrors Observe's 3D BE stack (existing-state only).
              Year 1–5 / Vision views layer proposed-state placements on top
              via VisionLayoutCanvas; Current stays a faithful clone of what
              Observe shows. 2026-05-11. */}
          <DesignElementExtrusionLayer
            map={map}
            projectId={id}
            stateFilter="existing"
          />
          <DeckOverlay map={map}>
            <DesignElementScenegraphLayer
              projectId={id}
              stateFilter="existing"
            />
          </DeckOverlay>
          <BeV2GenericLayer
            map={map}
            projectId={id}
            stateFilter="existing"
          />
          <PlanObserveSelectionHandler map={map} />
          <PlanDataLayers map={map} projectId={id} />
          {/* DesignElementLayers also mounts on Current (2026-05-11) so
              orchard / silvopasture / pasture-mix polygons drawn from
              PlanTools persist to designElementsStore and surface their
              acreage label here, not only on the Vision canvas. Layer
              prefix is `design-el-*`; coexists with PlanDataLayers'
              `plan-data-*`. */}
          <DesignElementLayers
            map={map}
            projectId={id}
            view="current"
            selectedId={currentSelectedId}
            onHoverChange={setCurrentHovering}
            onSelect={setCurrentSelectedId}
          />
          <PlanContoursOverlay map={map} />
          <PlanZoneRingsOverlay map={map} projectId={id} />
          <PlanSunPathOverlay
            map={map}
            projectId={id}
            fallbackCentroid={FALLBACK_CENTROID}
            boundary={boundary}
          />
          <PlanScheduledMovesOverlay map={map} projectId={id} />
          <PlanVertexEditHandler map={map} />
          <PlanDrawHost map={map} projectId={id} parcelBoundary={boundary} />
          <InlineFeaturePopover map={map} />
          <UtilityConflictDialog map={map} />
          <ObserveLinkPopover map={map} />
          <PlanSelectionFloater
            onOpenGuildBuilder={() => {
              handleSelectModule('plant-systems');
              setSlideUpOpen(true);
            }}
          />
        </>
      )}
    </DiagnoseMap>
  );

  return (
    <PlanViewProvider view={activeView}>
    <StageShell
      canvasLabel="Plan canvas"
      leftRailLabel="Plan tools"
      rightRailLabel="Plan checklist"
      leftRail={
        <PlanTools
          activeModule={validModule}
          onSelectModule={handleSelectModule}
          onOpenSlideUp={() => setSlideUpOpen(true)}
        />
      }
      canvas={
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {canvasContent}
          <DesignStatusChip
            project={project}
            onOpenAudit={() => {
              handleSelectModule('principle-verification');
              setSlideUpOpen(true);
            }}
          />
          <PlanPhaseTabs active={activeView} onChange={setActiveView} />
          <PlanStampToast />
          <TemporalScrubSlider />
          <StampModePicker />
        </div>
      }
      rightRail={
        <PlanChecklistAside
          activeModule={validModule}
          onSelectModule={handleSelectModule}
          slideUpOpen={slideUpOpen && validModule !== null}
          onOpenSlideUp={() => setSlideUpOpen(true)}
          onCloseSlideUp={() => setSlideUpOpen(false)}
        />
      }
      bottomTray={
        <PlanModuleBar
          activeModule={validModule}
          onSelectModule={handleSelectModule}
          slideUpOpen={slideUpOpen && validModule !== null}
          onOpenSlideUp={() => setSlideUpOpen(true)}
          onCloseSlideUp={() => setSlideUpOpen(false)}
        />
      }
      overlay={
        <PlanModuleSlideUp
          module={validModule}
          open={slideUpOpen && validModule !== null}
          onClose={() => setSlideUpOpen(false)}
          project={project}
          onSwitchModule={(mod) => {
            handleSelectModule(mod);
            setSlideUpOpen(true);
          }}
        />
      }
    />
    </PlanViewProvider>
  );
}
