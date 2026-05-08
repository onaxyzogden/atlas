/**
 * VisionLayoutCanvas — Plan-stage design surface (replaces the standard map
 * content while a non-`current` PlanView is active).
 *
 * Composition:
 *   DiagnoseMap (reused MapLibre container)
 *     ├ DesignElementLayers     — persistent rendering of design features
 *     ├ DesignToolRail          — right-edge floating tool column
 *     ├ BaseMapCard             — bottom-left floating basemap + overlays
 *     ├ DesignElementDrawHost   — mounts the draw hook iff activeKind set
 *
 * The palette lives in `PlanLayout`'s leftRail slot, not inside the canvas,
 * so it shares the StageShell column with the existing PlanTools rail.
 */

import { useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import DiagnoseMap from '../../components/DiagnoseMap.js';
import DesignElementLayers from './layers/DesignElementLayers.js';
import DesignToolRail from './DesignToolRail.js';
import BaseMapCard from './BaseMapCard.js';
import { useDesignElementDrawTool } from './draw/useDesignElementDrawTool.js';
import type { PlanView } from '../types.js';

interface Props {
  projectId: string;
  centroid: [number, number];
  boundary: GeoJSON.Polygon | undefined;
  view: PlanView;
  /** Currently armed element kind (from the palette). */
  activeKind: string | null;
  /** Called once a draw completes so the palette can disarm. */
  onDrawComplete: () => void;
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
  activeKind,
  onDrawComplete,
}: Props) {
  // Remount the draw host when kind changes so the underlying useMapboxDrawTool
  // tears down and re-initialises cleanly.
  const [drawNonce] = useState(0);
  void drawNonce;

  return (
    <DiagnoseMap centroid={centroid} boundary={boundary}>
      {({ map }) => (
        <>
          <DesignElementLayers map={map} projectId={projectId} view={view} />
          <DesignToolRail
            map={map}
            activeKind={activeKind}
            projectId={projectId}
            onDisarmDraw={onDrawComplete}
          />
          <BaseMapCard />
          {activeKind && (
            <DesignElementDrawHost
              key={activeKind}
              map={map}
              projectId={projectId}
              kind={activeKind}
              onComplete={onDrawComplete}
            />
          )}
        </>
      )}
    </DiagnoseMap>
  );
}
