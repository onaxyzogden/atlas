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
import { useParams } from '@tanstack/react-router';
import { useProjectStore } from '../../store/projectStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import DiagnoseMap from '../components/DiagnoseMap.js';
import MapToolbar from '../observe/components/MapToolbar.js';
import ObserveAnnotationLayers from '../observe/components/layers/ObserveAnnotationLayers.js';
import PlanTools from './PlanTools.js';
import PlanChecklistAside from './PlanChecklistAside.js';
import PlanModuleBar from './PlanModuleBar.js';
import PlanModuleSlideUp from './PlanModuleSlideUp.js';
import type { PlanModule } from './types.js';
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
  const params = useParams({ strict: false }) as { projectId?: string };
  const id = params.projectId ?? 'mtc';

  const projects = useProjectStore((s) => s.projects);
  const updateProject = useProjectStore((s) => s.updateProject);

  const project = useMemo(
    () => projects.find((p) => p.id === id || p.serverId === id) ?? MTC_FALLBACK,
    [projects, id],
  );

  // V3 Project for boundary — same as ObserveLayout uses useV3Project.
  // We read the raw store here so we don't duplicate the v3 adapter overhead;
  // only the boundary polygon is needed for the map viewport.
  const boundary = project.parcelBoundaryGeojson?.features[0]?.geometry as
    | GeoJSON.Polygon
    | undefined;

  const [activeModule, setActiveModule] = useState<PlanModule | null>(null);
  const [slideUpOpen, setSlideUpOpen] = useState(false);

  const handleSelectModule = (mod: PlanModule | null) => {
    setActiveModule(mod);
    if (mod !== activeModule) setSlideUpOpen(false);
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
          activeModule={activeModule}
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
          activeModule={activeModule}
          onSelectModule={handleSelectModule}
          slideUpOpen={slideUpOpen && activeModule !== null}
          onOpenSlideUp={() => setSlideUpOpen(true)}
          onCloseSlideUp={() => setSlideUpOpen(false)}
        />
      }
      bottomTray={
        <PlanModuleBar
          activeModule={activeModule}
          onSelectModule={handleSelectModule}
          slideUpOpen={slideUpOpen && activeModule !== null}
          onOpenSlideUp={() => setSlideUpOpen(true)}
          onCloseSlideUp={() => setSlideUpOpen(false)}
        />
      }
      overlay={
        <PlanModuleSlideUp
          module={activeModule}
          open={slideUpOpen && activeModule !== null}
          onClose={() => setSlideUpOpen(false)}
          project={project}
        />
      }
    />
  );
}
