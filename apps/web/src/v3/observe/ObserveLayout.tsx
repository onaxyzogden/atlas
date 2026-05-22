/**
 * ObserveLayout — route component for /v3/project/$projectId/observe[/$module].
 *
 * Composes the scaffold pieces:
 *   - ObserveTools  (left)          — module-aware tools panel
 *   - DiagnoseMap   (center)        — parcel-boundary-fit MapLibre canvas
 *   - ObserveChecklistAside (right) — module-aware checklist toolbox
 *   - ObserveModuleBar + ModuleSlideUp (bottom) — combined progress + tile
 *     navigator and slide-up detail sheet
 *
 * The Observe/Plan/Act level switcher (title card + side peeks) lives in the
 * AppShell header bar via LevelNavigatorBar; the navigator state is provided
 * by V3LevelNavBridge mounted in AppShell.
 *
 * URL is the source of truth for the active module. Slide-up open/closed is
 * local state — closing the sheet does not navigate. Clicking the active
 * card while the slide-up is closed deselects (URL → /observe with no
 * module).
 */

import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import ObserveDeepLinkFocus from './components/ObserveDeepLinkFocus.js';
import DiagnoseMap from '../components/DiagnoseMap.js';
import { useV3Project } from '../data/useV3Project.js';
import { useProjectStore } from '../../store/projectStore.js';
import { parcelAcreage } from '../../lib/geo.js';
import { useHomesteadStore } from '../../store/homesteadStore.js';
import { useMapToolStore } from './components/measure/useMapToolStore.js';
import TopographyOverlay from '../components/overlays/TopographyOverlay.js';
import WaterOverlay from '../components/overlays/WaterOverlay.js';
import ObserveTools from './tools/ObserveTools.js';
import ObserveChecklistAside from './components/ObserveChecklistAside.js';
import ObserveModuleBar from './components/ObserveModuleBar.js';
import ModuleSlideUp from './components/ModuleSlideUp.js';
import MapToolbar from './components/MapToolbar.js';
import DesignToolRail, { type ToolMode } from '../plan/canvas/DesignToolRail.js';
import { MapCursorHost } from '../plan/canvas/useMapCursor.js';
import BaseMapCard from '../plan/canvas/BaseMapCard.js';
import HomesteadMarker from '../components/overlays/HomesteadMarker.js';
import PlanSelectionFloater from '../plan/PlanSelectionFloater.js';
import ObserveDrawHost from './components/draw/ObserveDrawHost.js';
import AnnotationDragHandler from './components/draw/AnnotationDragHandler.js';
import AnnotationVertexEditHandler from './components/draw/AnnotationVertexEditHandler.js';
import AnnotationSectorHandles from './components/draw/AnnotationSectorHandles.js';
import AnnotationFormSlideUp from './components/draw/AnnotationFormSlideUp.js';
import InlineFeaturePopover from '../plan/draw/InlineFeaturePopover.js';
import AnnotationDetailPanel from './components/AnnotationDetailPanel.js';
import ObserveAnnotationLayers from './components/layers/ObserveAnnotationLayers.js';
import PlanDataLayers from '../plan/layers/PlanDataLayers.js';
import DeckOverlay from '../_shared/deck/DeckOverlay.js';
import {
  AdoptedBuildingsSync,
  BeV2GenericLayer,
  DesignElementExtrusionLayer,
  DesignElementScenegraphLayer,
} from '../builtEnvironment/layers/index.js';
import SelectionFloater from './components/SelectionFloater.js';
import SectorCompassOverlay from './components/overlays/SectorCompassOverlay.js';
import {
  isObserveModule,
  type ObserveModule,
} from './types.js';
import { observeSectionIdModule } from './observeSectionMap.js';
import StageShell from '../_shell/StageShell.js';

const FALLBACK_CENTROID: [number, number] = [-78.2, 44.5];

export default function ObserveLayout() {
  const params = useParams({ strict: false }) as {
    projectId?: string;
    module?: string;
  };
  const navigate = useNavigate();

  // Normalise the route projectId to `'mtc'` when absent. PlanLayout /
  // ActLayout and every BE dashboard already apply this fallback; without
  // it the Observe stage of the sample project (no `$projectId` in the
  // route) was writing entities under `projectId: null` while every
  // consumer was reading under `'mtc'`, so adopt-from-map + new BE
  // placements silently failed to surface in the placed-features list.
  const id = params.projectId ?? 'mtc';
  const moduleParam = params.module ?? '';
  const validModule: ObserveModule | null = isObserveModule(moduleParam)
    ? moduleParam
    : null;

  const project = useV3Project(params.projectId);
  const updateProject = useProjectStore((s) => s.updateProject);
  const units = useProjectStore(
    (s) =>
      s.projects.find((p) => p.id === id || p.serverId === id)?.units ??
      'metric',
  );
  // Prefer the parcel's intake coordinates over the hard-coded stage
  // fallback. DiagnoseMap still wins with fit-to-bounds when a boundary
  // polygon exists, so this only takes effect for coords-only projects.
  const fallbackCenter = project?.location.center ?? FALLBACK_CENTROID;
  // Read-only — the Steward / household annotation tool is now the
  // single surface for placing the Zone 0 anchor; its save() writes to
  // homesteadStore directly (see annotationFieldSchemas.ts).
  const homestead = useHomesteadStore((s) => s.byProject[id]);
  const activeTool = useMapToolStore((s) => s.activeTool);
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  const armedDrawKind =
    activeTool && activeTool.startsWith('observe.') ? activeTool : null;

  const [slideUpOpen, setSlideUpOpen] = useState(false);
  // Which specific rail section the steward picked. The BE categories all
  // route to `built-environment`, so module equality alone lights them all.
  // Lifted here (next to `slideUpOpen`) so BOTH the main rail (`ObserveTools`)
  // and the mini rail (`ObserveChecklistAside`) narrow to the same single
  // section. Derived lazily into `effectiveSectionId`: a stale id routes to a
  // different module and is ignored, falling back to the whole-family view.
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const effectiveSectionId =
    activeSectionId && observeSectionIdModule(activeSectionId) === validModule
      ? activeSectionId
      : null;
  const [mode, setMode] = useState<ToolMode>('pan');
  const [hovering, setHovering] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Pure navigation primitive (the former `handleSelectModule` body).
  const navigateModule = (mod: ObserveModule | null) => {
    if (!params.projectId) return;
    if (mod === null) {
      navigate({
        to: '/v3/project/$projectId/observe',
        params: { projectId: params.projectId },
      });
      setSlideUpOpen(false);
      return;
    }
    navigate({
      to: '/v3/project/$projectId/observe/$module',
      params: { projectId: params.projectId, module: mod },
    });
    setSlideUpOpen(false);
  };

  // Programmatic / bottom-module-bar / slide-up module selection: clears any
  // section narrowing so the picked module shows its whole family.
  const handleSelectModule = (mod: ObserveModule | null) => {
    setActiveSectionId(null);
    navigateModule(mod);
  };

  // Rail section clicks (main rail + mini rail). Toggles on strict identity so
  // re-clicking the sole-active section deselects; otherwise narrows to /
  // switches to the clicked section across both rails.
  const handleSelectSection = (mod: ObserveModule, sectionId: string) => {
    if (!params.projectId) return;
    if (effectiveSectionId === sectionId) {
      setActiveSectionId(null);
      navigateModule(null);
    } else {
      setActiveSectionId(sectionId);
      navigateModule(mod);
    }
  };

  const moduleBar = (
    <ObserveModuleBar
      activeModule={validModule}
      onSelectModule={handleSelectModule}
      slideUpOpen={slideUpOpen && validModule !== null}
      onOpenSlideUp={() => setSlideUpOpen(true)}
      onCloseSlideUp={() => setSlideUpOpen(false)}
    />
  );

  return (
    <StageShell
      canvasLabel="Observe canvas"
      leftRailLabel="Observe tools"
      rightRailLabel="Observe checklist"
      leftRail={
        <ObserveTools
          activeModule={validModule}
          effectiveSectionId={effectiveSectionId}
          onSelectSection={handleSelectSection}
        />
      }
      canvas={
        <DiagnoseMap
          centroid={fallbackCenter}
          boundary={project?.location.boundary}
        >
          {({ map }) => (
            <>
              {/* Tile overlays from MapTiler / OpenMapTiles. The
                  climatology-driven prevailing wind rose
                  (`WindSectorsOverlay`) is intentionally NOT mounted in
                  Observe: the `wind` toggle gates only the steward-drawn
                  wind-type sectors, which now render with
                  intensity-proportional wedge sizing + compass labels in
                  `ObserveAnnotationLayers`. Likewise `ZonesOverlay`
                  (computed default Zone 0–5 rings) is NOT mounted: the
                  Zones toggle gates only the steward-drawn permaculture-
                  zone polygons. */}
              <TopographyOverlay map={map} />
              <WaterOverlay map={map} />
              <MapToolbar
                map={map}
                projectId={id}
                boundary={project?.location.boundary ?? null}
                onBoundaryDrawn={(polygon) => {
                  if (!params.projectId) return;
                  updateProject(params.projectId, {
                    parcelBoundaryGeojson: {
                      type: 'FeatureCollection',
                      features: [
                        {
                          type: 'Feature',
                          properties: {},
                          geometry: polygon,
                        },
                      ],
                    },
                    hasParcelBoundary: true,
                    acreage: parcelAcreage(polygon, units),
                  });
                }}
              />
              <MapCursorHost
                map={map}
                drawArmed={armedDrawKind !== null}
                mode={mode}
                hovering={hovering}
              />
              <DesignToolRail
                map={map}
                activeKind={armedDrawKind}
                projectId={id}
                onDisarmDraw={() => setActiveTool(null)}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                mode={mode}
                setMode={setMode}
              />
              <BaseMapCard stage="observe" />
              {homestead && (
                <HomesteadMarker map={map} projectId={id} point={homestead} />
              )}
              <ObserveAnnotationLayers
                map={map}
                projectId={id}
              />
              {params.projectId ? (
                <PlanDataLayers
                  map={map}
                  projectId={params.projectId}
                  editable={false}
                />
              ) : null}
              {/* 3D extrusion + GLB layers for Built-Environment entities
                  in the existing-state slice. Hidden top-down (pitch
                  collapses extrusions); pitch the camera (or wire a
                  Terrain3D toggle in MapToolbar) to surface them.
                  Mounts unconditionally — empty FC when no eligible
                  entities — so toggling pitch is the only affordance
                  needed. Phase 4.2 of ADR
                  2026-05-10-atlas-built-environment-unification.md */}
              <AdoptedBuildingsSync map={map} projectId={id} />
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
              {/* 2D top-down render + click-to-edit for the 23 BE
                  kinds without bespoke per-kind layers in
                  ObserveAnnotationLayers. The shared 3D layers above
                  collapse to nothing top-down; this layer is the
                  always-visible flat fallback. Phase 5.2.B. */}
              <BeV2GenericLayer
                map={map}
                projectId={id}
                stateFilter="existing"
              />
              <ObserveDrawHost
                map={map}
                projectId={id}
              />
              <AnnotationDragHandler map={map} />
              <AnnotationVertexEditHandler map={map} />
              <AnnotationSectorHandles
                map={map}
                projectId={id}
              />
              <ObserveDeepLinkFocus
                map={map}
                activeModule={validModule}
                projectId={params.projectId ?? null}
              />
              <SelectionFloater projectId={id} />
              <PlanSelectionFloater />
              <InlineFeaturePopover map={map} />
              <SectorCompassOverlay projectId={id} map={map} />
            </>
          )}
        </DiagnoseMap>
      }
      rightRail={
        <ObserveChecklistAside
          activeModule={validModule}
          effectiveSectionId={effectiveSectionId}
          onSelectSection={handleSelectSection}
          slideUpOpen={slideUpOpen && validModule !== null}
          onOpenSlideUp={() => setSlideUpOpen(true)}
          onCloseSlideUp={() => setSlideUpOpen(false)}
        />
      }
      bottomTray={moduleBar}
      overlay={
        <>
          <ModuleSlideUp
            module={validModule}
            open={slideUpOpen && validModule !== null}
            onClose={() => setSlideUpOpen(false)}
            topBar={moduleBar}
          />
          <AnnotationFormSlideUp />
          <AnnotationDetailPanel projectId={id} />
        </>
      }
    />
  );
}
