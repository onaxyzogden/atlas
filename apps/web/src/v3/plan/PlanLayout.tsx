/**
 * PlanLayout — route component for /v3/project/$projectId/plan.
 *
 * Two surfaces, swapped by the `PlanPhaseTabs` top strip:
 *
 * 1. `current` — legacy module-driven UI (PlanTools left, DiagnoseMap +
 *    MapToolbar + ObserveAnnotationLayers, PlanModuleBar bottom).
 *
 * 2. `vision` / `terrain3d` — Vision-Layout canvas:
 *    design-element palette (left), VisionLayoutCanvas (centre, with
 *    DesignElementLayers + DesignToolRail + BaseMapCard), no module bar.
 *    Phase tabs filter by Yeomans Scale of Permanence index. `terrain3d`
 *    drapes the same canvas over MapLibre 3D terrain via Terrain3DController.
 *
 * The PlanPhaseTabs strip itself overlays the canvas (absolute, top-centre).
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useProjectStore, MTC_SEED } from '../../store/projectStore.js';
import { parcelAcreage } from '../../lib/geo.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useServerMachineryInventory } from '../../hooks/useServerMachineryInventory.js';
import { useV3Project } from '../data/useV3Project.js';
import DiagnoseMap from '../components/DiagnoseMap.js';
import MapToolbar from '../observe/components/MapToolbar.js';
import { useMapToolStore } from '../observe/components/measure/useMapToolStore.js';
import ObserveAnnotationLayers from '../observe/components/layers/ObserveAnnotationLayers.js';
import SectorCompassOverlay from '../observe/components/overlays/SectorCompassOverlay.js';
import PlanTools from './PlanTools.js';
import PlanChecklistAside from './PlanChecklistAside.js';
import PlanObjectiveCompletePrompt from './compass/PlanObjectiveCompletePrompt.js';
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
import { planSectionIdModule } from './planSectionMap.js';
import { PlanViewProvider } from './PlanViewContext.js';
import StageShell from '../_shell/StageShell.js';
import PlanDrawHost from './draw/PlanDrawHost.js';
import InlineFeaturePopover from './draw/InlineFeaturePopover.js';
import UtilityConflictDialog from './draw/UtilityConflictDialog.js';
import PlanObserveSelectionHandler from './draw/PlanObserveSelectionHandler.js';
import PlanCropAreaSelectionHandler from './draw/PlanCropAreaSelectionHandler.js';
import CoverCropPopoverEditor from '../../features/coverCrops/CoverCropPopoverEditor.js';
import { pushHabitatFeaturesToSpine } from '../../features/biodiversity/habitatFeatureSpineSync.js';
import {
  TREE_PLANTING_KINDS,
  pushTreePlantingsToSpine,
} from '../../features/vegetation/treePlantingSpineSync.js';
import {
  AGROFORESTRY_KINDS,
  pushAgroforestryToSpine,
} from '../../features/vegetation/agroforestrySpineSync.js';
import { useDesignElementsForProject } from '../../store/builtEnvironmentSelectors.js';
import ObserveLinkPopover from './draw/ObserveLinkPopover.js';
import PlanDataLayers from './layers/PlanDataLayers.js';
import { useSilvopastureDrilldownStore } from './layers/silvopastureDrilldownStore.js';
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
import StageGateOverlay from './StageGateOverlay.js';

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
  // Coords-only fallback (no boundary): prefer the parcel's intake center
  // over the hard-coded stage centroid. Ignored when `boundary` exists —
  // the canvas fits to bounds in that case.
  const fallbackCenter = v3Project?.location.center ?? FALLBACK_CENTROID;

  const [slideUpOpen, setSlideUpOpen] = useState(false);
  // Which specific rail section the steward picked. Several sections share a
  // module (the BE categories → `structures-subsystems`), so module equality
  // alone lights them all. Persisted in the URL `?section=` search param (the
  // same way `$module` is the source of truth for the active module) so the
  // single-section narrow survives reloads, back/forward nav, and shared links
  // — and so BOTH the main rail (`PlanTools`) and the mini rail
  // (`PlanChecklistAside`) read the same value (true cross-rail parity). Read
  // loosely (no route `validateSearch`, matching `ObserveDeepLinkFocus`).
  // Derived lazily into `effectiveSectionId`: a stale id (manual URL edit,
  // bottom-bar nav, or the brief transient before async navigation resolves)
  // routes to a different module and is ignored, falling back to the
  // whole-family highlight.
  const search = useSearch({ strict: false }) as { section?: string };
  const activeSectionId = search.section ?? null;
  const effectiveSectionId =
    activeSectionId && planSectionIdModule(activeSectionId) === validModule
      ? activeSectionId
      : null;
  const [activeView, setActiveView] = useState<PlanView>('vision');
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

  // Habitat-feature → D0 work-item spine bridge (Slice 5 of the 2026-05-21
  // habitat-feature unification). Mirrors the cover-crop editor-driven push:
  // whenever the steward commits / edits / deletes a habitat-category
  // DesignElement, re-seed `source:'habitat-feature'` rows via
  // `replaceHabitatFeatureRows`. Override + cross-source preservation is
  // enforced inside the store action — this effect just fires the rebuild.
  // The signature key (id+kind+phase, sorted) keeps the effect from
  // re-firing on cosmetic re-renders.
  const planDesignElements = useDesignElementsForProject(id);
  const habitatFeatureSignature = useMemo(
    () =>
      planDesignElements
        .filter((el) => el.category === 'habitat')
        .map((el) => `${el.id}:${el.kind}:${el.phase}`)
        .sort()
        .join('|'),
    [planDesignElements],
  );
  useEffect(() => {
    if (!id) return;
    pushHabitatFeaturesToSpine(id);
  }, [id, habitatFeatureSignature]);

  // Tree-planting → D0 work-item spine bridge (Slice 8-A of the 2026-05-21
  // habitat-feature unification — D1 predecessor auto-edges). Mirrors the
  // habitat-feature effect above: whenever the steward commits / edits /
  // deletes a vegetation-category point DesignElement of one of the four
  // tree-planting kinds, re-seed `source:'tree-planting'` rows. Override
  // + cross-source preservation enforced inside `replaceTreePlantingRows`.
  const treePlantingSignature = useMemo(
    () =>
      planDesignElements
        .filter(
          (el) =>
            el.category === 'vegetation' &&
            (TREE_PLANTING_KINDS as readonly string[]).includes(el.kind) &&
            el.geometry.type === 'Point',
        )
        .map((el) => `${el.id}:${el.kind}:${el.phase}`)
        .sort()
        .join('|'),
    [planDesignElements],
  );
  useEffect(() => {
    if (!id) return;
    pushTreePlantingsToSpine(id);
  }, [id, treePlantingSignature]);

  // Agroforestry → D0 work-item spine bridge (Slice 8-C of the 2026-05-21
  // habitat-feature unification). Sibling effect to the habitat-feature
  // and tree-planting pushes above: whenever the steward commits / edits
  // / deletes a hedgerow (vegetation/line), orchard (grazing/polygon),
  // or silvopasture (grazing/polygon) DesignElement, re-seed
  // `source:'agroforestry'` rows. Override + cross-source preservation
  // enforced inside `replaceAgroforestryRows`. Three near-identical
  // effects is acceptable for now; can be lifted into a shared
  // `useDesignElementSpineSync(projectId)` hook in a follow-up.
  const agroforestrySignature = useMemo(
    () =>
      planDesignElements
        .filter((el) =>
          (AGROFORESTRY_KINDS as readonly string[]).includes(el.kind),
        )
        .map((el) => `${el.id}:${el.kind}:${el.phase}`)
        .sort()
        .join('|'),
    [planDesignElements],
  );
  useEffect(() => {
    if (!id) return;
    pushAgroforestryToSpine(id);
  }, [id, agroforestrySignature]);

  // Hydrate machinery inventory from the server and bridge local store
  // mutations to /api/v1/machinery-items. Skipped for the MTC fallback id
  // since it isn't a real server project.
  useServerMachineryInventory(id === 'mtc' ? undefined : id);

  // Slice M (host-union drilldown) — subscribe to the silvopasture
  // drilldown store's pending "Open full audit →" request. When set,
  // navigate to the matching plan module + open the slide-up, then
  // consume the request so it does not refire on re-mount. The
  // `targetHostId` payload remains in the store for
  // SilvopastureIntegrationCard to read on its mount.
  const pendingOpenModule = useSilvopastureDrilldownStore(
    (s) => s.pendingOpenModule,
  );
  const consumePendingOpen = useSilvopastureDrilldownStore(
    (s) => s.consumePendingOpen,
  );
  const clearDrilldownTarget = useSilvopastureDrilldownStore(
    (s) => s.clearTarget,
  );

  // Single navigation primitive: writes both the `$module` path param AND the
  // `?section=` search param atomically (and closes the slide-up), so the
  // active module and the narrowed section never disagree. `search` is always
  // passed explicitly so the param is set/cleared deterministically.
  const navigateModuleSection = (
    mod: PlanModule | null,
    sectionId: string | null,
  ) => {
    if (!params.projectId) return;
    setSlideUpOpen(false);
    if (mod === null) {
      navigate({
        to: '/v3/project/$projectId/plan',
        params: { projectId: params.projectId },
        search: {},
      });
      return;
    }
    navigate({
      to: '/v3/project/$projectId/plan/$module',
      params: { projectId: params.projectId, module: mod },
      search: sectionId ? { section: sectionId } : {},
    });
  };

  // Programmatic / bottom-module-bar / slide-up module selection: clears any
  // section narrowing so the picked module shows its whole family.
  const handleSelectModule = (mod: PlanModule | null) =>
    navigateModuleSection(mod, null);

  // Rail section clicks (main rail + mini rail). Toggles on strict identity so
  // re-clicking the sole-active section deselects; otherwise narrows to /
  // switches to the clicked section across both rails.
  const handleSelectSection = (mod: PlanModule, sectionId: string) => {
    if (!params.projectId) return;
    if (effectiveSectionId === sectionId) navigateModuleSection(null, null);
    else navigateModuleSection(mod, sectionId);
  };

  // Slice M routing: when the drilldown card's "Open full audit →" fires
  // `requestOpenAudit(hostId)`, the store populates `pendingOpenModule`.
  // We consume it here — navigate to the requested module and open the
  // slide-up so SilvopastureIntegrationCard mounts. The card reads
  // `targetHostId` from the same store and handles the scroll +
  // gold-border accent itself.
  useEffect(() => {
    if (!pendingOpenModule) return;
    if (!params.projectId) return;
    const req = consumePendingOpen();
    if (!req) return;
    if (isPlanModule(req.module)) {
      // Programmatic module-open clears any section narrowing (whole family).
      navigate({
        to: '/v3/project/$projectId/plan/$module',
        params: { projectId: params.projectId, module: req.module },
        search: {},
      });
    }
    setSlideUpOpen(true);
  }, [pendingOpenModule, params.projectId, consumePendingOpen, navigate]);

  // Clear the drilldown target when the slide-up closes so re-opening
  // the card without an explicit target doesn't replay a stale scroll.
  useEffect(() => {
    if (!slideUpOpen) clearDrilldownTarget();
  }, [slideUpOpen, clearDrilldownTarget]);

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

  const isVisionCanvas =
    activeView === 'vision' || activeView === 'terrain3d';

  // ── Canvas content ───────────────────────────────────────────────────────
  const canvasContent = isVisionCanvas ? (
    <VisionLayoutCanvas
      projectId={id}
      centroid={fallbackCenter}
      boundary={boundary}
      view={activeView}
    />
  ) : (
    <DiagnoseMap centroid={fallbackCenter} boundary={boundary}>
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
          <PlanCropAreaSelectionHandler map={map} projectId={id} />
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
            fallbackCentroid={fallbackCenter}
            boundary={boundary}
          />
          <PlanScheduledMovesOverlay map={map} projectId={id} />
          <PlanVertexEditHandler map={map} />
          <PlanDrawHost map={map} projectId={id} parcelBoundary={boundary} />
          <InlineFeaturePopover map={map} />
          <SectorCompassOverlay projectId={id} map={map} />
          <CoverCropPopoverEditor />
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

  const moduleBar = (
    <PlanModuleBar
      activeModule={validModule}
      onSelectModule={handleSelectModule}
      slideUpOpen={slideUpOpen && validModule !== null}
      onOpenSlideUp={() => setSlideUpOpen(true)}
      onCloseSlideUp={() => setSlideUpOpen(false)}
    />
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
          effectiveSectionId={effectiveSectionId}
          onSelectModule={handleSelectModule}
          onSelectSection={handleSelectSection}
          onOpenSlideUp={() => setSlideUpOpen(true)}
        />
      }
      canvas={
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {canvasContent}
          <StageGateOverlay projectId={params.projectId ?? null} />
          <DesignStatusChip
            project={project}
            onOpenAudit={() => {
              handleSelectModule('principle-verification');
              setSlideUpOpen(true);
            }}
          />
          <PlanObjectiveCompletePrompt
            projectId={params.projectId ?? null}
            module={validModule}
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
          effectiveSectionId={effectiveSectionId}
          onSelectModule={handleSelectModule}
          onSelectSection={handleSelectSection}
          slideUpOpen={slideUpOpen && validModule !== null}
          onOpenSlideUp={() => setSlideUpOpen(true)}
          onCloseSlideUp={() => setSlideUpOpen(false)}
        />
      }
      bottomTray={moduleBar}
      overlay={
        <PlanModuleSlideUp
          module={validModule}
          open={slideUpOpen && validModule !== null}
          onClose={() => setSlideUpOpen(false)}
          project={project}
          topBar={moduleBar}
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
