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
import ObserveTools from './tools/ObserveTools.js';
import ObserveChecklistAside from './components/ObserveChecklistAside.js';
import ObserveModuleBar from './components/ObserveModuleBar.js';
import ModuleSlideUp from './components/ModuleSlideUp.js';
import MapToolbar from './components/MapToolbar.js';
import ObserveDrawHost from './components/draw/ObserveDrawHost.js';
import AnnotationDragHandler from './components/draw/AnnotationDragHandler.js';
import AnnotationVertexEditHandler from './components/draw/AnnotationVertexEditHandler.js';
import AnnotationFormSlideUp from './components/draw/AnnotationFormSlideUp.js';
import AnnotationDetailPanel from './components/AnnotationDetailPanel.js';
import ObserveAnnotationLayers from './components/layers/ObserveAnnotationLayers.js';
import SelectionFloater from './components/SelectionFloater.js';
import ExportButton from './components/ExportButton.js';
import ImportSiteIntelButton from './components/ImportSiteIntelButton.js';
import useGlobalAnnotationUndo from './hooks/useGlobalAnnotationUndo.js';
import {
  isObserveModule,
  type ObserveModule,
} from './types.js';
import StageShell from '../_shell/StageShell.js';

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

  // Cmd-Z / Cmd-Shift-Z bound while OBSERVE is mounted.
  useGlobalAnnotationUndo();

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
              <ObserveAnnotationLayers
                map={map}
                projectId={params.projectId ?? null}
              />
              <ObserveDrawHost
                map={map}
                projectId={params.projectId ?? null}
              />
              <AnnotationDragHandler map={map} />
              <AnnotationVertexEditHandler map={map} />
              <SelectionFloater projectId={params.projectId ?? null} />
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
