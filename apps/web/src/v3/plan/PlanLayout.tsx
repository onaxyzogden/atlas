/**
 * PlanLayout — route component for /v3/project/$projectId/plan.
 *
 * Two surfaces, swapped by the `PlanPhaseTabs` top strip:
 *
 * 1. `current` — legacy module-driven UI (PlanTools left, DiagnoseMap +
 *    MapToolbar + ObserveAnnotationLayers, PlanModuleBar bottom).
 *
 * 2. `vision` / `phase-1` / `phase-2` — Vision-Layout canvas: design-element
 *    palette (left), VisionLayoutCanvas (centre, with DesignElementLayers +
 *    DesignToolRail + BaseMapCard), no module bar. Phase tabs filter by
 *    Yeomans Scale of Permanence index. `terrain3d` is a v1 placeholder.
 *
 * The PlanPhaseTabs strip itself overlays the canvas (absolute, top-centre).
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
import PlanPhaseTabs from './canvas/PlanPhaseTabs.js';
import DesignElementPalette from './canvas/DesignElementPalette.js';
import VisionLayoutCanvas from './canvas/VisionLayoutCanvas.js';
import { isPlanModule, type PlanModule, type PlanView } from './types.js';
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

  const boundary = v3Project?.location.boundary;

  const [slideUpOpen, setSlideUpOpen] = useState(false);
  const [activeView, setActiveView] = useState<PlanView>('current');
  const [activeKind, setActiveKind] = useState<string | null>(null);

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
    activeView === 'vision' || activeView === 'phase-1' || activeView === 'phase-2';

  // ── Canvas content ───────────────────────────────────────────────────────
  const canvasContent = isVisionCanvas ? (
    <VisionLayoutCanvas
      projectId={id}
      centroid={FALLBACK_CENTROID}
      boundary={boundary}
      view={activeView}
      activeKind={activeKind}
      onDrawComplete={() => setActiveKind(null)}
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
          />
          <ObserveAnnotationLayers map={map} projectId={id} />
        </>
      )}
    </DiagnoseMap>
  );

  return (
    <StageShell
      canvasLabel="Plan canvas"
      leftRailLabel={isVisionCanvas ? 'Design elements' : 'Plan tools'}
      rightRailLabel="Plan checklist"
      leftRail={
        isVisionCanvas ? (
          <DesignElementPalette
            activeKind={activeKind}
            onSelect={(k) => setActiveKind(k)}
          />
        ) : (
          <PlanTools
            activeModule={validModule}
            onSelectModule={handleSelectModule}
          />
        )
      }
      canvas={
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {canvasContent}
          <PlanPhaseTabs active={activeView} onChange={setActiveView} />
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
        isVisionCanvas ? null : (
          <PlanModuleBar
            activeModule={validModule}
            onSelectModule={handleSelectModule}
            slideUpOpen={slideUpOpen && validModule !== null}
            onOpenSlideUp={() => setSlideUpOpen(true)}
            onCloseSlideUp={() => setSlideUpOpen(false)}
          />
        )
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
