/**
 * ActLayout — route component for /v3/project/$projectId/act and /act/$module.
 *
 * Mirrors PlanLayout structure (StageShell with the same 5 slots) but uses
 * the Observe URL-routing pattern: the active module is read from the
 * `$module` URL segment so deep links like /act/maintain land directly on
 * the right tab. The map reuses ObserveAnnotationLayers read-only — no
 * draw tools — since the Act stage is for execution, not authoring.
 *
 * Project bridge: reads LocalProject from useProjectStore; falls back to
 * an MTC stub so the dev sentinel /v3/project/mtc/act renders without
 * server data.
 *
 * Tool model: Act tools log execution events against existing features
 * (e.g., harvest entries on Plan crop areas) — no new geometry authoring.
 * Plan/Observe layers render here as a read-only substrate so the steward
 * can hit-test their authored features when logging events.
 */

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useProjectStore } from '../../store/projectStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import DiagnoseMap from '../components/DiagnoseMap.js';
import MapToolbar from '../observe/components/MapToolbar.js';
import ObserveAnnotationLayers from '../observe/components/layers/ObserveAnnotationLayers.js';
import PlanDataLayers from '../plan/layers/PlanDataLayers.js';
import InlineFeaturePopover from '../plan/draw/InlineFeaturePopover.js';
import ActTools from './ActTools.js';
import ActChecklistAside from './ActChecklistAside.js';
import ActModuleBar from './ActModuleBar.js';
import ActModuleSlideUp from './ActModuleSlideUp.js';
import ActDrawHost from './draw/ActDrawHost.js';
import ActDataLayers from './layers/ActDataLayers.js';
import ActStructureClickHandler from './layers/ActStructureClickHandler.js';
import ActStructurePopover from './ActStructurePopover.js';
import { isActModule, type ActModule } from './types.js';
import StageShell from '../_shell/StageShell.js';
import MapOverlaysLegend from '../_shared/components/MapOverlaysLegend.js';

const FALLBACK_CENTROID: [number, number] = [-78.2, 44.5];

/** MTC fallback so /v3/project/mtc/act renders deterministically. */
const MTC_FALLBACK: LocalProject = {
  id: 'mtc',
  name: 'Moontrance Creek',
  description: null,
  status: 'active',
  projectType: null,
  country: 'CA',
  provinceState: 'ON',
  conservationAuthId: null,
  address: null,
  parcelId: null,
  acreage: null,
  dataCompletenessScore: null,
  hasParcelBoundary: false,
  createdAt: '',
  updatedAt: '',
  parcelBoundaryGeojson: null,
  ownerNotes: null,
  zoningNotes: null,
  accessNotes: null,
  waterRightsNotes: null,
  visionStatement: null,
  units: 'metric',
  attachments: [],
};

export default function ActLayout() {
  const params = useParams({ strict: false }) as {
    projectId?: string;
    module?: string;
  };
  const navigate = useNavigate();

  const id = params.projectId ?? 'mtc';
  const moduleParam = params.module ?? '';
  const validModule: ActModule | null = isActModule(moduleParam)
    ? moduleParam
    : null;

  const projects = useProjectStore((s) => s.projects);
  const updateProject = useProjectStore((s) => s.updateProject);

  const project = useMemo(
    () => projects.find((p) => p.id === id || p.serverId === id) ?? MTC_FALLBACK,
    [projects, id],
  );

  const boundary = project.parcelBoundaryGeojson?.features[0]?.geometry as
    | GeoJSON.Polygon
    | undefined;

  const [slideUpOpen, setSlideUpOpen] = useState(false);

  const handleSelectModule = (mod: ActModule | null) => {
    if (!params.projectId) return;
    if (mod === null) {
      navigate({
        to: '/v3/project/$projectId/act',
        params: { projectId: params.projectId },
      });
      setSlideUpOpen(false);
      return;
    }
    navigate({
      to: '/v3/project/$projectId/act/$module',
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

  return (
    <StageShell
      canvasLabel="Act canvas"
      leftRailLabel="Act tools"
      rightRailLabel="Act checklist"
      leftRail={
        <ActTools
          activeModule={validModule}
          onSelectModule={handleSelectModule}
          onOpenSlideUp={() => setSlideUpOpen(true)}
        />
      }
      canvas={
        <DiagnoseMap
          centroid={FALLBACK_CENTROID}
          boundary={boundary}
        >
          {({ map }) => (
            <>
              <MapOverlaysLegend />
              <MapToolbar
                map={map}
                projectId={params.projectId ?? null}
                boundary={boundary ?? null}
                onBoundaryDrawn={handleBoundaryDrawn}
                showBoundary={false}
              />
              <ObserveAnnotationLayers
                map={map}
                projectId={params.projectId ?? null}
              />
              {params.projectId ? (
                <PlanDataLayers
                  map={map}
                  projectId={params.projectId}
                  editable={false}
                />
              ) : null}
              {params.projectId ? (
                <ActStructureClickHandler map={map} projectId={params.projectId} />
              ) : null}
              {params.projectId ? (
                <ActDataLayers map={map} projectId={params.projectId} />
              ) : null}
              <ActDrawHost map={map} projectId={params.projectId ?? null} />
              <InlineFeaturePopover map={map} />
              <ActStructurePopover map={map} projectId={params.projectId ?? null} />
            </>
          )}
        </DiagnoseMap>
      }
      rightRail={
        <ActChecklistAside
          activeModule={validModule}
          onSelectModule={handleSelectModule}
          slideUpOpen={slideUpOpen && validModule !== null}
          onOpenSlideUp={() => setSlideUpOpen(true)}
          onCloseSlideUp={() => setSlideUpOpen(false)}
        />
      }
      bottomTray={
        <ActModuleBar
          activeModule={validModule}
          onSelectModule={handleSelectModule}
          slideUpOpen={slideUpOpen && validModule !== null}
          onOpenSlideUp={() => setSlideUpOpen(true)}
          onCloseSlideUp={() => setSlideUpOpen(false)}
        />
      }
      overlay={
        <ActModuleSlideUp
          module={validModule}
          open={slideUpOpen && validModule !== null}
          onClose={() => setSlideUpOpen(false)}
          project={project}
        />
      }
    />
  );
}
