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
 * The palette lives in `PlanLayout`'s leftRail slot, not inside the canvas,
 * so it shares the StageShell column with the existing PlanTools rail.
 */

import { useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import DiagnoseMap from '../../components/DiagnoseMap.js';
import DesignElementLayers from './layers/DesignElementLayers.js';
import {
  DesignElementExtrusionLayer,
  DesignElementScenegraphLayer,
  Terrain3DController,
} from '../../builtEnvironment/layers/index.js';
import DeckOverlay from '../../_shared/deck/DeckOverlay.js';
import DesignToolRail, { type ToolMode } from './DesignToolRail.js';
import { MapCursorHost } from './useMapCursor.js';
import BaseMapCard from './BaseMapCard.js';
import CustomModelPalette from './CustomModelPalette.js';
import MapToolbar from '../../observe/components/MapToolbar.js';
import { useDesignElementDrawTool } from './draw/useDesignElementDrawTool.js';
import { useActiveElementKind } from './useToolIdToElementKind.js';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import BeV2ExistingTool from '../../observe/components/draw/BeV2ExistingTool.js';
import ObserveAnnotationLayers from '../../observe/components/layers/ObserveAnnotationLayers.js';
import PlanObserveSelectionHandler from '../draw/PlanObserveSelectionHandler.js';
import InlineFeaturePopover from '../draw/InlineFeaturePopover.js';
import UtilityConflictDialog from '../draw/UtilityConflictDialog.js';
import ObserveLinkPopover from '../draw/ObserveLinkPopover.js';
import PlanDataLayers from '../layers/PlanDataLayers.js';
import PlanVertexEditHandler from '../layers/PlanVertexEditHandler.js';
import Plan3DSelectionHandler from '../draw/Plan3DSelectionHandler.js';
import PlanSelectionFloater from '../PlanSelectionFloater.js';
import type { PlanView } from '../types.js';

interface Props {
  projectId: string;
  centroid: [number, number];
  boundary: GeoJSON.Polygon | undefined;
  view: PlanView;
}

interface DrawHostProps {
  map: MaplibreMap;
  projectId: string;
  kind: string;
  onComplete: () => void;
}

function DesignElementDrawHost({ map, projectId, kind, onComplete }: DrawHostProps) {
  useDesignElementDrawTool({ map, projectId, kind, onComplete });
  return null;
}

export default function VisionLayoutCanvas({
  projectId,
  centroid,
  boundary,
  view,
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
  const drawArmed = activeKind !== null || beKind !== null;

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
          <BaseMapCard />
          <CustomModelPalette />
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
          <UtilityConflictDialog map={map} />
          <ObserveLinkPopover map={map} />
          {/* Plan-data layers in non-editable mode: paddocks / zones /
              crops / fences / structures / setbacks / flows / transects
              render, but drag-translate + inline-edit popovers are
              suppressed. A separate lightweight selection handler
              wires click-to-select + click-empty-to-clear, and
              PlanVertexEditHandler keeps the floater's Edit-vertices
              action working under 3D. */}
          <PlanDataLayers map={map} projectId={projectId} editable={false} />
          <Plan3DSelectionHandler map={map} />
          <PlanVertexEditHandler map={map} />
          <PlanSelectionFloater />
          {activeKind && (
            <DesignElementDrawHost
              key={activeKind}
              map={map}
              projectId={projectId}
              kind={activeKind}
              onComplete={onDrawComplete}
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
