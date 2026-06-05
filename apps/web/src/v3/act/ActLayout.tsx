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

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  useProjectStore,
  MTC_SEED,
  getActShellMode,
} from '../../store/projectStore.js';
import {
  parcelAcreage,
  extractBoundaryGeometry,
  boundaryCentroid,
  renderablePolygon,
} from '../../lib/geo.js';
import { useActTelemetry } from '../../lib/actInteractionLog.js';
import { useEffectivePlanProjectType } from '../plan/hooks/useEffectivePlanProjectType.js';
import { useV3Project } from '../data/useV3Project.js';
import DiagnoseMap from '../components/DiagnoseMap.js';
import MapToolbar from '../observe/components/MapToolbar.js';
import ObserveAnnotationLayers from '../observe/components/layers/ObserveAnnotationLayers.js';
import SectorCompassOverlay from '../observe/components/overlays/SectorCompassOverlay.js';
import PlanDataLayers from '../plan/layers/PlanDataLayers.js';
import InlineFeaturePopover from '../plan/draw/InlineFeaturePopover.js';
import PlanSelectionFloater from '../plan/PlanSelectionFloater.js';
import ActTools from './ActTools.js';
import ActChecklistAside from './ActChecklistAside.js';
import ActObjectiveCompletePrompt from './compass/ActObjectiveCompletePrompt.js';
import ActModuleBar from './ActModuleBar.js';
import ActModuleSlideUp from './ActModuleSlideUp.js';
import ActDrawHost from './draw/ActDrawHost.js';
import ActDataLayers from './layers/ActDataLayers.js';
import ActStructureClickHandler from './layers/ActStructureClickHandler.js';
import ActStructurePopover from './ActStructurePopover.js';
import ActFeatureClickHandler from './layers/ActFeatureClickHandler.js';
import ActAsBuiltPopover from './asBuilt/ActAsBuiltPopover.js';
import ActAsBuiltDrawHandler from './asBuilt/ActAsBuiltDrawHandler.js';
import ActFlowConnectorPopover from './asBuilt/ActFlowConnectorPopover.js';
import { isActModule, type ActModule } from './types.js';
import StageShell from '../_shell/StageShell.js';
import BaseMapCard from '../plan/canvas/BaseMapCard.js';
import StageGateOverlay from './StageGateOverlay.js';
import ActReadyCue from './components/ActReadyCue.js';
// ADR 7 headline: the live field-action surface is now map-first
// (ActMapFirstLayout). The legacy rail-with-map ActFieldActionLayout is
// preserved on disk as a reversible fallback (swap the import below to
// restore it) per the no-deletion-in-revamps rule.
import ActMapFirstLayout from './field-action/ActMapFirstLayout.js';
// tier-shell: the promoted map-centric 4-rail Act shell (default mode).
import ActTierShell from './tier-shell/ActTierShell.js';
import css from './ActLayout.module.css';

const FALLBACK_CENTROID: [number, number] = [-78.2, 44.5];

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
    () => projects.find((p) => p.id === id || p.serverId === id) ?? MTC_SEED,
    [projects, id],
  );

  const actShellMode = getActShellMode(project);

  // extractBoundaryGeometry can yield a Polygon OR a MultiPolygon. Casting it to
  // Polygon and handing a MultiPolygon to DiagnoseMap poisons the bounds with
  // NaN and crashes maplibre ("Invalid LngLat object: (NaN, NaN)"). Normalize to
  // a render-safe single Polygon (or undefined).
  const boundaryGeom = extractBoundaryGeometry(project.parcelBoundaryGeojson);
  const safeBoundary = useMemo(
    () => renderablePolygon(boundaryGeom),
    [boundaryGeom],
  );

  // Coords-only fallback (no boundary): prefer the parcel's intake center
  // (via the v2→v3 adapter seam) over the hard-coded stage centroid.
  // DiagnoseMap still fits to `safeBoundary` when one exists.
  const v3Project = useV3Project(params.projectId);
  const fallbackCenter = v3Project?.location.center ?? FALLBACK_CENTROID;
  // Finite-guarded, MultiPolygon-aware centroid so a MultiPolygon parcel still
  // centers sensibly even when its outline cannot render.
  const mapCenter = useMemo<[number, number]>(
    () => boundaryCentroid(boundaryGeom) ?? fallbackCenter,
    [boundaryGeom, fallbackCenter],
  );

  const [slideUpOpen, setSlideUpOpen] = useState(false);

  const { effectiveType } = useEffectivePlanProjectType(params.projectId ?? null);
  const record = useActTelemetry({
    projectId: params.projectId ?? '',
    projectType: effectiveType,
  });

  // Slide-up dwell instrumentation. Capture openedAt + module on the
  // false→true transition so we can emit a slideup_close with dwellMs on
  // the true→false transition. A ref keeps openedAt stable across renders;
  // the explicit prev-flag guard avoids React 18 strict-mode double-fire.
  const slideUpOpenRef = useRef(false);
  const slideUpOpenSinceRef = useRef<{ at: number; module: ActModule } | null>(null);
  useEffect(() => {
    const wasOpen = slideUpOpenRef.current;
    const isOpen = slideUpOpen && validModule !== null;
    if (!wasOpen && isOpen && validModule) {
      slideUpOpenSinceRef.current = { at: Date.now(), module: validModule };
      record({ module: validModule, eventType: 'slideup_open' });
    } else if (wasOpen && !isOpen && slideUpOpenSinceRef.current) {
      const { at, module: m } = slideUpOpenSinceRef.current;
      record({
        module: m,
        eventType: 'slideup_close',
        payload: { dwellMs: Math.max(0, Date.now() - at) },
      });
      slideUpOpenSinceRef.current = null;
    }
    slideUpOpenRef.current = isOpen;
  }, [slideUpOpen, validModule, record]);

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
      acreage: parcelAcreage(polygon, project.units),
    });
  };

  const moduleBar = (
    <ActModuleBar
      activeModule={validModule}
      onSelectModule={handleSelectModule}
      slideUpOpen={slideUpOpen && validModule !== null}
      onOpenSlideUp={() => setSlideUpOpen(true)}
      onCloseSlideUp={() => setSlideUpOpen(false)}
    />
  );

  if (actShellMode === 'tier-shell') {
    return <ActTierShell />;
  }

  if (actShellMode === 'field-action') {
    return <ActMapFirstLayout />;
  }

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
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <DiagnoseMap
          centroid={mapCenter}
          boundary={safeBoundary}
        >
          {({ map }) => (
            <>
              <MapToolbar
                map={map}
                projectId={params.projectId ?? null}
                boundary={safeBoundary ?? null}
                onBoundaryDrawn={handleBoundaryDrawn}
                showBoundary={false}
              />
              <BaseMapCard stage="act" />
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
                <ActFeatureClickHandler map={map} projectId={params.projectId} />
              ) : null}
              {params.projectId ? (
                <ActDataLayers
                  map={map}
                  projectId={params.projectId}
                  activeModule={validModule}
                />
              ) : null}
              <ActDrawHost map={map} projectId={params.projectId ?? null} />
              <InlineFeaturePopover map={map} />
              <SectorCompassOverlay projectId={id} map={map} />
              <PlanSelectionFloater />
              <ActStructurePopover map={map} projectId={params.projectId ?? null} />
              <ActAsBuiltPopover map={map} projectId={params.projectId ?? null} />
              <ActAsBuiltDrawHandler map={map} />
              <ActFlowConnectorPopover projectId={params.projectId ?? null} />
              <ActObjectiveCompletePrompt
                projectId={params.projectId ?? null}
                module={validModule}
              />
            </>
          )}
        </DiagnoseMap>
        <StageGateOverlay projectId={params.projectId ?? null} />
        </div>
      }
      rightRail={
        <div className={css.rightStack}>
          {/* Project-level readiness cue only when no objective is focused;
              once an objective is selected the rail belongs to that objective's
              workspace, so the generic Act-essentials cue is hidden. The cue
              stacks above the checklist/ops aside (column layout) instead of
              squishing beside it. */}
          {validModule === null && (
            <ActReadyCue projectId={params.projectId ?? null} />
          )}
          <ActChecklistAside
            activeModule={validModule}
            onSelectModule={handleSelectModule}
            slideUpOpen={slideUpOpen && validModule !== null}
            onOpenSlideUp={() => setSlideUpOpen(true)}
            onCloseSlideUp={() => setSlideUpOpen(false)}
          />
        </div>
      }
      bottomTray={moduleBar}
      overlay={
        <ActModuleSlideUp
          module={validModule}
          open={slideUpOpen && validModule !== null}
          onClose={() => setSlideUpOpen(false)}
          project={project}
          topBar={moduleBar}
        />
      }
    />
  );
}
