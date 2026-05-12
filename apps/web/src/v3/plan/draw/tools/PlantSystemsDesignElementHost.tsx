/**
 * PlantSystemsDesignElementHost — Current-view bridge for the three
 * Yeomans grazing kinds (orchard / silvopasture / pasture-mix) that
 * PlanTools surfaces in its Plant Systems group as of 2026-05-11.
 *
 * Wraps `useDesignElementDrawTool` so a draw completed on the Current
 * canvas persists to `designElementsStore` (the same store the Vision
 * canvas writes into). One source of truth for grazing polygons across
 * all four Plan views; on-canvas acreage labels render via the shared
 * `DesignElementLayers` mount.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import { useDesignElementDrawTool } from '../../canvas/draw/useDesignElementDrawTool.js';
import { useMapToolStore } from '../../../observe/components/measure/useMapToolStore.js';

interface Props {
  map: MaplibreMap;
  projectId: string;
  kind: string;
}

export default function PlantSystemsDesignElementHost({
  map,
  projectId,
  kind,
}: Props) {
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  useDesignElementDrawTool({
    map,
    projectId,
    kind,
    onComplete: () => setActiveTool(null),
  });
  return null;
}
