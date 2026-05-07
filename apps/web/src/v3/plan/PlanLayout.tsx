/**
 * PlanLayout — route component for /v3/project/$projectId/plan.
 *
 * Mirrors ObserveLayout structure:
 *   PlanTools (left) · DiagnoseMap (center) · PlanChecklistAside (right)
 *   PlanModuleBar (bottom) · PlanModuleSlideUp (overlay)
 *
 * The map is the same DiagnoseMap used in Observe; ObserveAnnotationLayers
 * is reused so steward-placed observation pins remain visible during planning.
 *
 * Project bridge: reads LocalProject from useProjectStore; falls back to an
 * MTC stub for the dev sentinel so smoke tests stay deterministic.
 */

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useProjectStore } from '../../store/projectStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import { useV3Project } from '../data/useV3Project.js';
import DiagnoseMap from '../components/DiagnoseMap.js';
import MapToolbar from '../observe/components/MapToolbar.js';
import ObserveAnnotationLayers from '../observe/components/layers/ObserveAnnotationLayers.js';
import PlanTools from './PlanTools.js';
import PlanChecklistAside from './PlanChecklistAside.js';
import PlanModuleBar from './PlanModuleBar.js';
import PlanModuleSlideUp from './PlanModuleSlideUp.js';
import { isPlanModule, type PlanModule } from './types.js';
import StageShell from '../_shell/StageShell.js';

const FALLBACK_CENTROID: [number, number] = [-78.2, 44.5];

/** MTC fallback: PlanModuleSlideUp only needs project.id + store fields. */
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
    () => projects.find((p) => p.id === id || p.serverId === id) ?? MTC_FALLBACK,
    [projects, id],
  );

  // Boundary read mirrors ObserveLayout — useV3Project special-cases the MTC
  // sentinel and otherwise adapts the LocalProject's parcelBoundaryGeojson.
  const boundary = v3Project?.location.boundary;

  const [slideUpOpen, setSlideUpOpen] = useState(false);

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

  return (
    <StageShell
      canvasLabel="Plan canvas"
      leftRailLabel="Plan tools"
      rightRailLabel="Plan checklist"
      leftRail={
        <PlanTools
          activeModule={validModule}
          onSelectModule={handleSelectModule}
        />
      }
      canvas={
        <DiagnoseMap
          centroid={FALLBACK_CENTROID}
          boundary={boundary}
        >
          {({ map }) => (
            <>
              <MapToolbar
                map={map}
                projectId={id}
                boundary={boundary ?? null}
                onBoundaryDrawn={handleBoundaryDrawn}
              />
              <ObserveAnnotationLayers
                map={map}
                projectId={id}
              />
            </>
          )}
        </DiagnoseMap>
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
        />
      }
    />
  );
}
