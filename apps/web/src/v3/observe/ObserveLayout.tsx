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
import DiagnoseMap from '../components/DiagnoseMap.js';
import { useV3Project } from '../data/useV3Project.js';
import { useProjectStore } from '../../store/projectStore.js';
import TopographyOverlay from '../components/overlays/TopographyOverlay.js';
import WaterOverlay from '../components/overlays/WaterOverlay.js';
import ObserveTools from './tools/ObserveTools.js';
import ObserveChecklistAside from './components/ObserveChecklistAside.js';
import ObserveModuleBar from './components/ObserveModuleBar.js';
import ModuleSlideUp from './components/ModuleSlideUp.js';
import MapToolbar from './components/MapToolbar.js';
import DesignToolRail from '../plan/canvas/DesignToolRail.js';
import BaseMapCard from '../plan/canvas/BaseMapCard.js';
import ObserveDrawHost from './components/draw/ObserveDrawHost.js';
import AnnotationDragHandler from './components/draw/AnnotationDragHandler.js';
import AnnotationVertexEditHandler from './components/draw/AnnotationVertexEditHandler.js';
import AnnotationSectorHandles from './components/draw/AnnotationSectorHandles.js';
import AnnotationFormSlideUp from './components/draw/AnnotationFormSlideUp.js';
import InlineFeaturePopover from '../plan/draw/InlineFeaturePopover.js';
import AnnotationDetailPanel from './components/AnnotationDetailPanel.js';
import ObserveAnnotationLayers from './components/layers/ObserveAnnotationLayers.js';
import {
  BeV2GenericLayer,
  DesignElementExtrusionLayer,
  DesignElementGlbLayer,
} from '../builtEnvironment/layers/index.js';
import SelectionFloater from './components/SelectionFloater.js';
import ExportButton from './components/ExportButton.js';
import ImportSiteIntelButton from './components/ImportSiteIntelButton.js';
import {
  isObserveModule,
  type ObserveModule,
} from './types.js';
import StageShell from '../_shell/StageShell.js';
import MapOverlaysLegend from '../_shared/components/MapOverlaysLegend.js';

const FALLBACK_CENTROID: [number, number] = [-78.2, 44.5];

export default function ObserveLayout() {
  const params = useParams({ strict: false }) as {
    projectId?: string;
    module?: string;
  };
  const navigate = useNavigate();

  const moduleParam = params.module ?? '';
  const validModule: ObserveModule | null = isObserveModule(moduleParam)
    ? moduleParam
    : null;

  const project = useV3Project(params.projectId);
  const updateProject = useProjectStore((s) => s.updateProject);

  const [slideUpOpen, setSlideUpOpen] = useState(false);

  const handleSelectModule = (mod: ObserveModule | null) => {
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

  return (
    <StageShell
      canvasLabel="Observe canvas"
      leftRailLabel="Observe tools"
      rightRailLabel="Observe checklist"
      leftRail={
        <ObserveTools
          activeModule={validModule}
          onSelectModule={handleSelectModule}
        />
      }
      canvas={
        <DiagnoseMap
          centroid={FALLBACK_CENTROID}
          boundary={project?.location.boundary}
        >
          {({ map }) => (
            <>
              <MapOverlaysLegend />
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
                projectId={params.projectId ?? null}
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
                  });
                }}
              />
              <DesignToolRail
                map={map}
                activeKind={null}
                projectId={params.projectId ?? ''}
                onDisarmDraw={() => {}}
                selectedId={null}
                setSelectedId={() => {}}
              />
              <BaseMapCard />
              <ObserveAnnotationLayers
                map={map}
                projectId={params.projectId ?? null}
              />
              {/* 3D extrusion + GLB layers for Built-Environment entities
                  in the existing-state slice. Hidden top-down (pitch
                  collapses extrusions); pitch the camera (or wire a
                  Terrain3D toggle in MapToolbar) to surface them.
                  Mounts unconditionally — empty FC when no eligible
                  entities — so toggling pitch is the only affordance
                  needed. Phase 4.2 of ADR
                  2026-05-10-atlas-built-environment-unification.md */}
              {params.projectId && (
                <>
                  <DesignElementExtrusionLayer
                    map={map}
                    projectId={params.projectId}
                    stateFilter="existing"
                  />
                  <DesignElementGlbLayer
                    map={map}
                    projectId={params.projectId}
                    stateFilter="existing"
                  />
                  {/* 2D top-down render + click-to-edit for the 23 BE
                      kinds without bespoke per-kind layers in
                      ObserveAnnotationLayers. The shared 3D layers above
                      collapse to nothing top-down; this layer is the
                      always-visible flat fallback. Phase 5.2.B. */}
                  <BeV2GenericLayer
                    map={map}
                    projectId={params.projectId}
                    stateFilter="existing"
                  />
                </>
              )}
              <ObserveDrawHost
                map={map}
                projectId={params.projectId ?? null}
              />
              <AnnotationDragHandler map={map} />
              <AnnotationVertexEditHandler map={map} />
              <AnnotationSectorHandles
                map={map}
                projectId={params.projectId ?? null}
              />
              <SelectionFloater projectId={params.projectId ?? null} />
              <InlineFeaturePopover map={map} />
              <ExportButton projectId={params.projectId ?? null} />
              <ImportSiteIntelButton projectId={params.projectId ?? null} />
            </>
          )}
        </DiagnoseMap>
      }
      rightRail={
        <ObserveChecklistAside
          activeModule={validModule}
          onSelectModule={handleSelectModule}
          slideUpOpen={slideUpOpen && validModule !== null}
          onOpenSlideUp={() => setSlideUpOpen(true)}
          onCloseSlideUp={() => setSlideUpOpen(false)}
        />
      }
      bottomTray={
        <ObserveModuleBar
          activeModule={validModule}
          onSelectModule={handleSelectModule}
          slideUpOpen={slideUpOpen && validModule !== null}
          onOpenSlideUp={() => setSlideUpOpen(true)}
          onCloseSlideUp={() => setSlideUpOpen(false)}
        />
      }
      overlay={
        <>
          <ModuleSlideUp
            module={validModule}
            open={slideUpOpen && validModule !== null}
            onClose={() => setSlideUpOpen(false)}
          />
          <AnnotationFormSlideUp />
          <AnnotationDetailPanel projectId={params.projectId ?? null} />
        </>
      }
    />
  );
}
