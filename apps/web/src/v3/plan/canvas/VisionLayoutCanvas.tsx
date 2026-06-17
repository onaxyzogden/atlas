/**
 * VisionLayoutCanvas — Plan-stage design surface (replaces the standard map
 * content while a non-`current` PlanView is active).
 *
 * Composition:
 *   DiagnoseMap (reused MapLibre container)
 *     ├ DesignElementLayers          — flat fill/line/circle/symbol layers
 *     ├ DesignElementExtrusionLayer  — fill-extrusion 3D fallback (always on;
 *     │                                 skips kinds rendered by GLB layer)
 *     ├ DeckOverlay                  — singleton @deck.gl/mapbox MapboxOverlay
 *     │   └ DesignElementScenegraphLayer — deck.gl ScenegraphLayer rendering
 *     │                                 authored GLB models per kind (always on)
 *     ├ Terrain3DController          — view==='terrain3d' camera preset
 *     │                                 (pitch + DEM); unmount restores flat
 *     ├ DesignToolRail               — right-edge floating tool column
 *     ├ BaseMapCard                  — bottom-left floating basemap + overlays
 *     ├ DesignElementDrawHost        — mounts the draw hook iff activeKind set
 *
 * The custom-model palette is a section inside the PlanTools left rail
 * (mounted there, gated to vision / terrain3d views), not a floating card
 * on this canvas.
 */

import { useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import DiagnoseMap from '../../components/DiagnoseMap.js';
import DesignElementLayers from './layers/DesignElementLayers.js';
import SilvopasturePopover from '../../../features/agroforestry/SilvopasturePopover.js';
import SilvopastureMemberOutline from '../../../features/agroforestry/SilvopastureMemberOutline.js';
import {
  AdoptedBuildingsSync,
  DesignElementExtrusionLayer,
  DesignElementScenegraphLayer,
  Terrain3DController,
} from '../../builtEnvironment/layers/index.js';
import DeckOverlay from '../../_shared/deck/DeckOverlay.js';
import DesignToolRail, { type ToolMode } from './DesignToolRail.js';
import { MapCursorHost } from './useMapCursor.js';
import BaseMapCard from './BaseMapCard.js';
import MapToolbar from '../../observe/components/MapToolbar.js';
import { useDesignElementDrawTool } from './draw/useDesignElementDrawTool.js';
import { useActiveElementKind, computeVisionDrawArmed } from './useToolIdToElementKind.js';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import BeV2ExistingTool from '../../observe/components/draw/BeV2ExistingTool.js';
import ObserveDrawHost from '../../observe/components/draw/ObserveDrawHost.js';
import ObserveAnnotationLayers from '../../observe/components/layers/ObserveAnnotationLayers.js';
import SectorCompassOverlay from '../../observe/components/overlays/SectorCompassOverlay.js';
import PlanObserveSelectionHandler from '../draw/PlanObserveSelectionHandler.js';
import InlineFeaturePopover from '../draw/InlineFeaturePopover.js';
import UtilityConflictDialog from '../draw/UtilityConflictDialog.js';
import PlacementConflictDialog from '../draw/PlacementConflictDialog.js';
import ObserveLinkPopover from '../draw/ObserveLinkPopover.js';
import PlanDataLayers from '../layers/PlanDataLayers.js';
import PlanScheduledMovesOverlay from '../layers/PlanScheduledMovesOverlay.js';
import PlanWaterRouterOverlay from '../layers/PlanWaterRouterOverlay.js';
import PlanDrawHost from '../draw/PlanDrawHost.js';
import PlanVertexEditHandler from '../layers/PlanVertexEditHandler.js';
import Plan3DSelectionHandler from '../draw/Plan3DSelectionHandler.js';
import PlanSelectionFloater from '../PlanSelectionFloater.js';
// s2-ecology / s2-terrain survey map takeover (mirrors ActTierShell). These four
// hosts are the Act survey components, reused unchanged — they only need the
// MapLibre `map` this canvas owns privately, so they mount inside the DiagnoseMap
// render-prop here rather than in PlanTierShell.
import VegetationSurveyLayer from '../../act/ecology/VegetationSurveyLayer.js';
import VegetationSurveyDrawHost from '../../act/ecology/VegetationSurveyDrawHost.js';
import SlopeSurveyLayer from '../../act/terrain/SlopeSurveyLayer.js';
import SlopeSurveyDrawHost from '../../act/terrain/SlopeSurveyDrawHost.js';
// Reception (Tier-2 Systems Reading) survey map capture — the five Stratum-3
// surveys' layers + draw hosts, driven by ReceptionSurveyHosts (Plan-only).
import ReceptionSurveyHosts from '../reception/ReceptionSurveyHosts.js';
import type { PlanView } from '../types.js';

/**
 * Overlay legend rows that are dead no-ops on this canvas: it does not mount
 * PlanSunPathOverlay or PlanZoneRingsOverlay (only Current Land does).
 * `topography` is intentionally NOT listed — its steward-drawn topo
 * annotations still render here via ObserveAnnotationLayers (only its
 * MapTiler contour-line half, from the unmounted PlanContoursOverlay, is
 * absent).
 */
const VISION_DEAD_OVERLAYS = ['sunPath', 'zoneRings'] as const;

interface Props {
  projectId: string;
  centroid: [number, number];
  boundary: GeoJSON.Polygon | undefined;
  view: PlanView;
  /**
   * s2-ecology vegetation-survey takeover armed: mount the survey layer +
   * draw host on this canvas (PlanTierShell drives the flag from the shared
   * vegetationSurveyStore). Defaulted off so non-Plan callers are unaffected.
   */
  surveyActive?: boolean;
  /** s2-terrain slope-survey takeover armed (slopeSurveyStore). */
  slopeActive?: boolean;
  /**
   * Reception (Tier-2 Systems Reading) survey takeover armed: one of the five
   * Stratum-3 surveys is open for this project/objective. Used only for the
   * crosshair signal — the per-survey draw hosts self-gate inside
   * ReceptionSurveyHosts. Defaulted off so non-Plan callers are unaffected.
   */
  receptionActive?: boolean;
  /** Active objective id, stamped onto survey polygons as their source. */
  sourceObjectiveId?: string | null;
  /**
   * Plan-shell only: clicking the SectorCompass HUD arms the right-rail sectors
   * editor. Omitted by the legacy PlanLayout render so the compass stays
   * read-only there (parity with Act, where only ActTierShell wires edit).
   */
  onOpenSectorsEditor?: () => void;
}

interface DrawHostProps {
  map: MaplibreMap;
  projectId: string;
  kind: string;
  onComplete: () => void;
  parcelBoundary?: GeoJSON.Polygon;
}

function DesignElementDrawHost({
  map,
  projectId,
  kind,
  onComplete,
  parcelBoundary,
}: DrawHostProps) {
  useDesignElementDrawTool({
    map,
    projectId,
    kind,
    onComplete,
    parcelBoundary,
  });
  return null;
}

export default function VisionLayoutCanvas({
  projectId,
  centroid,
  boundary,
  view,
  surveyActive = false,
  slopeActive = false,
  receptionActive = false,
  sourceObjectiveId = null,
  onOpenSectorsEditor,
}: Props) {
  // Bridge: armed PlanTools tool id → elementCatalog kind (or null).
  // Vision draw lifecycle mounts only when the mapped kind is non-null.
  const activeKind = useActiveElementKind();
  const activeTool = useMapToolStore((s) => s.activeTool);
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  const onDrawComplete = () => setActiveTool(null);

  // BE-prefix dispatch (mirrors PlanDrawHost on the 2D Current canvas):
  // tool ids of shape `plan.structures-subsystems.be.<kind>` mount
  // BeV2ExistingTool with state='proposed', so BE placements work in
  // vision / phase / terrain3d the same way they do on Current. The
  // 3D layers (extrusion + scenegraph) read from the BE V2 store with
  // default `stateFilter='all'`, so the placed entity renders
  // immediately under pitch.
  const PLAN_BE_PREFIX = 'plan.structures-subsystems.be.';
  const beKind =
    activeTool && activeTool.startsWith(PLAN_BE_PREFIX)
      ? activeTool.slice(PLAN_BE_PREFIX.length)
      : null;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<ToolMode>('pan');
  const [hovering, setHovering] = useState(false);
  // Crosshair holds for EVERY draw family armed on this canvas — elementCatalog
  // + BE (activeKind/beKind below), the dedicated-store `plan.*` tools, the
  // `observe.*` tools, and the slope/veg survey takeovers. `activeKind`/`beKind`
  // are still computed (they gate the conditional host mounts further down); the
  // cursor predicate just needs the broader signal. See computeVisionDrawArmed.
  const drawArmed = computeVisionDrawArmed({
    activeTool,
    surveyActive,
    slopeActive,
    receptionActive,
  });

  return (
    <DiagnoseMap centroid={centroid} boundary={boundary}>
      {({ map }) => (
        <>
          <MapCursorHost
            map={map}
            drawArmed={drawArmed}
            mode={mode}
            hovering={hovering}
          />
          <DesignElementLayers
            map={map}
            projectId={projectId}
            view={view}
            selectedId={selectedId}
            onHoverChange={setHovering}
            onSelect={setSelectedId}
          />
          <AdoptedBuildingsSync map={map} projectId={projectId} />
          <DesignElementExtrusionLayer
            map={map}
            projectId={projectId}
            view={view}
          />
          <DeckOverlay map={map}>
            <DesignElementScenegraphLayer
              projectId={projectId}
              view={view}
            />
          </DeckOverlay>
          {view === 'terrain3d' && <Terrain3DController map={map} />}
          <DesignToolRail
            map={map}
            activeKind={activeKind}
            projectId={projectId}
            onDisarmDraw={onDrawComplete}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            mode={mode}
            setMode={setMode}
          />
          <BaseMapCard stage="plan" hiddenOverlays={VISION_DEAD_OVERLAYS} projectId={projectId} />
          {/* Captured-map PDF export (Master Plan / Base Map / Zone Map /
              Planting Plan) now lives in the DesignToolRail (right edge) as the
              "Export sheet" button — see useMapSheetExport + DesignToolRail.
              The floating green pill that used to sit here was relocated so
              export is one consistent control alongside the other map tools,
              available on both the Current and Vision canvases. */}
          <SilvopasturePopover projectId={projectId} />
          <SilvopastureMemberOutline map={map} projectId={projectId} />
          <MapToolbar
            map={map}
            projectId={projectId}
            boundary={boundary ?? null}
            onBoundaryDrawn={() => {}}
            showBoundary={false}
          />
          {/* Phase 2: Observe annotations + inline-edit + link popover
              mounted across vision / phase / terrain3d views, so the
              Plan steward can edit Buildings (and link out for other
              Observe kinds) without bouncing back to Current Land. */}
          <ObserveAnnotationLayers map={map} projectId={projectId} />
          <PlanObserveSelectionHandler map={map} />
          <InlineFeaturePopover map={map} />
          <SectorCompassOverlay
            projectId={projectId}
            map={map}
            onOpenEditor={onOpenSectorsEditor}
          />
          <UtilityConflictDialog map={map} />
          <PlacementConflictDialog map={map} />
          <ObserveLinkPopover map={map} />
          {/* Plan-data layers in non-editable mode: paddocks / zones /
              crops / fences / structures / setbacks / flows / transects
              render, but drag-translate + inline-edit popovers are
              suppressed. A separate lightweight selection handler
              wires click-to-select + click-empty-to-clear, and
              PlanVertexEditHandler keeps the floater's Edit-vertices
              action working under 3D. */}
          <PlanDataLayers map={map} projectId={projectId} editable={false} />
          <PlanScheduledMovesOverlay map={map} projectId={projectId} />
          <PlanWaterRouterOverlay map={map} projectId={projectId} />
          <Plan3DSelectionHandler map={map} />
          <PlanVertexEditHandler map={map} />
          <PlanSelectionFloater />
          {/* Dedicated-store draw tools (zone / buffer-ring / water /
              fence-line / fertility / flow-connector / note / transect /
              schedule-move / zone-seed-anchor — the ~16 ids that
              `useToolIdToElementKind` maps to null). `variant="vision"`
              skips PlanDrawHost's elementCatalog + BE branches because
              those lifecycles are already mounted below
              (DesignElementDrawHost / BeV2ExistingTool), so each tool
              mounts exactly once. Output renders via the already-present
              PlanDataLayers. Closes the prior "Phase 2 gap". */}
          <PlanDrawHost
            map={map}
            projectId={projectId}
            parcelBoundary={boundary}
            variant="vision"
          />
          {/* Observe create switchboard — arms the right observe.* draw tool
              from useMapToolStore.activeTool (returns null otherwise). The Plan
              canvas already renders these back (ObserveAnnotationLayers above)
              and selects / links them out (PlanObserveSelectionHandler +
              InlineFeaturePopover + ObserveLinkPopover), so this is the only
              missing piece that lets the rail's reading tools (contour, sectors,
              watercourse, neighbour-pin, …) actually place geometry. Disjoint
              from PlanDrawHost (observe.* vs plan.* activeTool prefixes) and from
              the gated slope / veg survey hosts (act.terrain.* / act.ecology.*),
              so it composes without double-mounting. Post-placement geometry
              editing is intentionally left to the Observe stage via link-out
              (see the ObserveAnnotationLayers note above). */}
          <ObserveDrawHost map={map} projectId={projectId} />
          {/*
            s2-ecology-c1 vegetation survey + s2-terrain-c2 slope survey (Plan).
            The passive *SurveyLayer renderers mount UNCONDITIONALLY — parity with
            ActTierShell, which mounts them always (ActTierShell.tsx:1231/1243).
            This keeps every drawn community/slope polygon visible on the Plan map
            outside the takeover, and lets the BaseMapCard overlay toggles
            (matrixTogglesStore.vegetationSurvey / slopeSurvey, read inside each
            layer) actually show/hide them. With no features they build an empty
            FeatureCollection (harmless), and they re-add on style reload.
            Click-select (Delete/Reshape/Reclassify) already works via the
            unconditional slope-survey-fill listener in PlanDataLayers.

            The DRAW HOSTS stay gated on the takeover flag — drawing is a
            takeover-only activity. The hosts are prefix-guarded internally
            (act.ecology.veg-survey / act.terrain.slope-*) and write to the shared
            vegetationSurveyStore / slopeSurveyStore. All four reuse the Act
            components unchanged; mounted here because they need this canvas's `map`.
          */}
          <VegetationSurveyLayer map={map} projectId={projectId} />
          {surveyActive && (
            <VegetationSurveyDrawHost
              map={map}
              projectId={projectId}
              sourceObjectiveId={sourceObjectiveId}
            />
          )}
          <SlopeSurveyLayer map={map} projectId={projectId} />
          {slopeActive && (
            <SlopeSurveyDrawHost
              map={map}
              projectId={projectId}
              sourceObjectiveId={sourceObjectiveId}
            />
          )}
          {/* Reception (Tier-2 Systems Reading) surveys: all five layers mount
              always; each draw host self-arms only when its survey takeover is
              open for this project + objective (parity with slope/veg above). */}
          <ReceptionSurveyHosts
            map={map}
            projectId={projectId}
            sourceObjectiveId={sourceObjectiveId}
          />
          {activeKind && (
            <DesignElementDrawHost
              key={activeKind}
              map={map}
              projectId={projectId}
              kind={activeKind}
              onComplete={onDrawComplete}
              parcelBoundary={boundary}
            />
          )}
          {beKind && (
            <BeV2ExistingTool
              key={`be-${beKind}`}
              map={map}
              projectId={projectId}
              kind={beKind}
              state="proposed"
            />
          )}
        </>
      )}
    </DiagnoseMap>
  );
}
