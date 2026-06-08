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

import { useMemo, useState } from 'react';
import {
  useLocation,
  useNavigate,
  useParams,
  useSearch,
} from '@tanstack/react-router';
import ObserveDeepLinkFocus from './components/ObserveDeepLinkFocus.js';
import DiagnoseMap from '../components/DiagnoseMap.js';
import { useV3Project } from '../data/useV3Project.js';
import {
  useProjectStore,
  MTC_SEED,
  getObserveShellMode,
  getObserveLensDataSource,
  type ObserveShellMode,
  type ObserveLensDataSource,
} from '../../store/projectStore.js';
import { parcelAcres } from '../../lib/geo.js';
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
import ObserveObjectiveCompletePrompt from '../compass/ObserveObjectiveCompletePrompt.js';
import TrueNorthAdvisoryBanner from '../true-north/TrueNorthAdvisoryBanner.js';
import ObserveStageGapBanner from './ObserveStageGapBanner.js';
import { useObservationNeed } from '../observation-needs/useObservationNeeds.js';
import { requiredLayersToModules } from '../observation-needs/observationNeed.js';
import CaptureMapFocus from './capture/CaptureMapFocus.js';
import CaptureAnnotationAutoCapture from './capture/CaptureAnnotationAutoCapture.js';
import CaptureBanner from './capture/CaptureBanner.js';
import CaptureExecutionAside from './capture/CaptureExecutionAside.js';
import {
  isObserveModule,
  type ObserveModule,
} from './types.js';
import { observeSectionIdModule } from './observeSectionMap.js';
import StageShell from '../_shell/StageShell.js';
import ObserveShellToggle from './dashboard/ObserveShellToggle.js';
import ObserveLensDataSourceToggle from './dashboard/ObserveLensDataSourceToggle.js';
import ObserveDashboardLayout from './dashboard/ObserveDashboardLayout.js';
import ObserveLensDashboard from './lens/ObserveLensDashboard.js';
import type { SourceFilter } from './dashboard/domain/observationSource.js';

const FALLBACK_CENTROID: [number, number] = [-78.2, 44.5];

/**
 * ObserveLayout — route component for all project-scoped `observe*` routes.
 *
 * Shell branch:
 *   - `dashboard`  → the 4-surface OLOS Observe Dashboard (delegated, unchanged,
 *                    to ObserveDualShellLayoutLegacy below).
 *   - `module-bar` → the promoted "observational lens" dashboard
 *                    (ObserveLensDashboard, mock-backed; not yet wired to live
 *                    data). This REPLACES the legacy module-bar assembly, which
 *                    is preserved intact in ObserveDualShellLayoutLegacy (kept
 *                    compiled/reachable for the dashboard path; its own
 *                    module-bar branch is simply no longer entered).
 *
 * ObserveShellToggle remains the escape hatch back to the dashboard shell.
 */
export default function ObserveLayout() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const id = params.projectId ?? 'mtc';
  const projects = useProjectStore((s) => s.projects);
  const updateProject = useProjectStore((s) => s.updateProject);
  const projectRecord = useMemo(
    () => projects.find((p) => p.id === id || p.serverId === id) ?? MTC_SEED,
    [projects, id],
  );
  const observeShellMode = getObserveShellMode(projectRecord);
  const handleObserveShellModeChange = (mode: ObserveShellMode) => {
    updateProject(projectRecord.id, { observeShellMode: mode });
  };
  const observeLensDataSource = getObserveLensDataSource(projectRecord);
  const handleObserveLensDataSourceChange = (source: ObserveLensDataSource) => {
    updateProject(projectRecord.id, { observeLensDataSource: source });
  };

  if (observeShellMode === 'module-bar') {
    // Full-bleed mount (NOT StageShell): the lens dashboard owns the whole
    // route outlet, mirroring the working standalone /v3/prototype/observe-lens
    // mount. StageShell's grid/flex/padding context confined the zoom wrapper to
    // a sub-viewport box (gutters); the outlet is a positioned, full-size
    // ancestor, so `absolute; inset:0` fills it exactly. ObserveShellToggle
    // floats above the lens (rendered last) as the escape hatch to the dashboard;
    // ObserveLensDataSourceToggle stacks just below it to flip live/mock data.
    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <ObserveLensDashboard
          projectId={projectRecord.id}
          dataSource={observeLensDataSource}
        />
        <ObserveShellToggle
          mode={observeShellMode}
          onChange={handleObserveShellModeChange}
        />
        <ObserveLensDataSourceToggle
          source={observeLensDataSource}
          onChange={handleObserveLensDataSourceChange}
        />
      </div>
    );
  }

  return <ObserveDualShellLayoutLegacy />;
}

// Preserved dual-shell layout (unchanged). Renders the real `dashboard` shell;
// its internal `module-bar` branch is retained for fidelity / future reuse but
// is intercepted by the wrapper above and no longer entered in normal flow.
function ObserveDualShellLayoutLegacy() {
  const params = useParams({ strict: false }) as {
    projectId?: string;
    module?: string;
    domainId?: string;
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
  const projects = useProjectStore((s) => s.projects);
  const updateProject = useProjectStore((s) => s.updateProject);

  // Shell-mode branch parallel to PlanLayout / ActLayout. `projectRecord`
  // resolves to MTC_SEED when the route is the legacy sample project so
  // existing MTC stewards retain the `module-bar` default while new
  // wizard-created projects land on the new `dashboard` shell.
  const projectRecord = useMemo(
    () => projects.find((p) => p.id === id || p.serverId === id) ?? MTC_SEED,
    [projects, id],
  );
  const observeShellMode = getObserveShellMode(projectRecord);
  const handleObserveShellModeChange = (mode: ObserveShellMode) => {
    updateProject(projectRecord.id, { observeShellMode: mode });
  };
  // Surface discriminator for the dashboard shell. The temporal route shares
  // the `$domainId` slot with the domain-detail route, so we cannot rely on
  // params alone — instead the route component inspects the pathname (set
  // by the static `observe/dashboard/temporal/$domainId` route in
  // routes/index.tsx). Domain detail is the default when a domainId is
  // present and the URL is not temporal; otherwise Surface 1.
  const location = useLocation();
  const dashboardSurface: 'unified' | 'domain' | 'temporal' | 'rollup' =
    /\/observe\/dashboard\/rollup(\/|$)/.test(location.pathname)
      ? 'rollup'
      : /\/observe\/dashboard\/temporal\//.test(location.pathname)
        ? 'temporal'
        : params.domainId
          ? 'domain'
          : 'unified';
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
  // Persisted in the URL `?section=` search param (single source of truth,
  // mirroring how `$module` already is) so the single-section highlight
  // survives reloads, back/forward nav, and shared links. BOTH the main rail
  // (`ObserveTools`) and the mini rail (`ObserveChecklistAside`) read the same
  // reconciled value. Derived lazily into `effectiveSectionId`: a stale id
  // routes to a different module and is ignored, falling back to the
  // whole-family view.
  const search = useSearch({ strict: false }) as {
    section?: string;
    need?: string;
    source?: SourceFilter;
  };
  const activeSectionId = search.section ?? null;
  // Observation Capture Workspace: a launched need rides in via `?need=<id>`
  // (set when a Command Centre card / marker is clicked). When present it
  // narrows the tool rail, flies + highlights the map, and shows a banner.
  const focusView = useObservationNeed(id, search.need);
  const focusObjective = focusView?.objective ?? null;
  // Need focus actuates the map: foreground the union of the need's
  // `requiredLayers` (normalized to modules). Memoized on the need id +
  // its requiredLayers so the layer effect doesn't re-run every render.
  const focusModules = useMemo(
    () =>
      focusObjective
        ? requiredLayersToModules(
            focusObjective.requiredLayers,
            focusObjective.module,
          )
        : null,
    [focusObjective],
  );
  // Prop-driven base-raster actuation: focusing an objective that needs the
  // topography / water layers forces those overlays on without touching the
  // persisted toggles, so exiting focus (focusModules → null) auto-reverts.
  const forceTopo = !!focusModules?.includes('topography');
  const forceWater = !!focusModules?.includes('hydrology');
  const exitFocus = () => {
    if (!params.projectId) return;
    navigate({
      to: '/v3/project/$projectId/observe/command-centre',
      params: { projectId: params.projectId },
    });
  };
  const effectiveSectionId =
    activeSectionId && observeSectionIdModule(activeSectionId) === validModule
      ? activeSectionId
      : null;
  const [mode, setMode] = useState<ToolMode>('pan');
  const [hovering, setHovering] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Single navigation primitive: writes the `$module` path param AND the
  // `?section` search param atomically (and closes the slide-up), so path and
  // search update together. `navigate`'s `search` REPLACES the object, so it
  // is passed explicitly every time — omitting it would strip the section.
  const navigateModuleSection = (
    mod: ObserveModule | null,
    sectionId: string | null,
  ) => {
    if (!params.projectId) return;
    setSlideUpOpen(false);
    if (mod === null) {
      navigate({
        to: '/v3/project/$projectId/observe',
        params: { projectId: params.projectId },
        search: {},
      });
      return;
    }
    navigate({
      to: '/v3/project/$projectId/observe/$module',
      params: { projectId: params.projectId, module: mod },
      search: sectionId ? { section: sectionId } : {},
    });
  };

  // Programmatic / bottom-module-bar / slide-up module selection: clears any
  // section narrowing so the picked module shows its whole family.
  const handleSelectModule = (mod: ObserveModule | null) =>
    navigateModuleSection(mod, null);

  // Rail section clicks (main rail + mini rail). Toggles on strict identity so
  // re-clicking the sole-active section deselects; otherwise narrows to /
  // switches to the clicked section across both rails.
  const handleSelectSection = (mod: ObserveModule, sectionId: string) => {
    if (!params.projectId) return;
    if (effectiveSectionId === sectionId) navigateModuleSection(null, null);
    else navigateModuleSection(mod, sectionId);
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

  if (observeShellMode === 'dashboard') {
    return (
      <StageShell
        canvasLabel="Observe canvas"
        leftRailLabel="Observe tools"
        rightRailLabel="Observe checklist"
        leftRail={null}
        canvas={
          <ObserveDashboardLayout
            projectId={id}
            shellMode={observeShellMode}
            onShellModeChange={handleObserveShellModeChange}
            domainId={params.domainId ?? null}
            surface={dashboardSurface}
            initialSource={search.source ?? null}
          />
        }
        rightRail={null}
        bottomTray={null}
      />
    );
  }

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
          restrictToTools={focusObjective?.requiredTools}
        />
      }
      canvas={
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <ObserveShellToggle
          mode={observeShellMode}
          onChange={handleObserveShellModeChange}
        />
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
              <TopographyOverlay map={map} forceVisible={forceTopo} />
              <WaterOverlay map={map} forceVisible={forceWater} />
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
                    acreage: parcelAcres(polygon),
                  });
                }}
                onBoundaryImported={(geojson) => {
                  if (!params.projectId) return;
                  updateProject(params.projectId, {
                    parcelBoundaryGeojson: geojson,
                    hasParcelBoundary: true,
                    acreage: parcelAcres(geojson),
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
                activeModule={validModule}
                focusModules={focusModules}
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
              {focusObjective && (
                <CaptureMapFocus map={map} objective={focusObjective} />
              )}
              {focusView && (
                <CaptureAnnotationAutoCapture projectId={id} view={focusView} />
              )}
              {focusView && (
                <CaptureBanner view={focusView} onBack={exitFocus} />
              )}
              <SelectionFloater projectId={id} />
              <PlanSelectionFloater />
              <InlineFeaturePopover map={map} />
              <SectorCompassOverlay projectId={id} map={map} />
            </>
          )}
        </DiagnoseMap>
        </div>
      }
      rightRail={
        focusView ? (
          <CaptureExecutionAside
            projectId={id}
            view={focusView}
            onExit={exitFocus}
          />
        ) : (
          <ObserveChecklistAside
            activeModule={validModule}
            effectiveSectionId={effectiveSectionId}
            onSelectSection={handleSelectSection}
            slideUpOpen={slideUpOpen && validModule !== null}
            onOpenSlideUp={() => setSlideUpOpen(true)}
            onCloseSlideUp={() => setSlideUpOpen(false)}
          />
        )
      }
      bottomTray={moduleBar}
      overlay={
        <>
          <TrueNorthAdvisoryBanner projectId={id} />
          <ObserveStageGapBanner projectId={id} />
          <ModuleSlideUp
            module={validModule}
            open={slideUpOpen && validModule !== null}
            onClose={() => setSlideUpOpen(false)}
            topBar={moduleBar}
          />
          <AnnotationFormSlideUp />
          <AnnotationDetailPanel projectId={id} />
          <ObserveObjectiveCompletePrompt
            projectId={params.projectId ?? id}
            module={validModule}
          />
        </>
      }
    />
  );
}
