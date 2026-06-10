/**
 * SlopeSurveyDrawHost -- mounts the polygon-draw tool for the s2-terrain-c2
 * slope survey. Mirrors VegetationSurveyDrawHost's prefix-guard, but because
 * slope exposes one bottom-rail tool PER class, the active map tool itself
 * encodes the class: it no-ops unless the active tool is one of the six
 * 'act.terrain.slope-*' ids and a project is loaded.
 *
 * On each completed polygon it computes acreage (same turf constant as design
 * elements) and appends a feature to the slope-survey store under the class the
 * active tool maps to (SLOPE_CLASS_BY_TOOL). The draw hook auto-clears after
 * each create, so the steward can draw several polygons of the same class in a
 * row without re-arming.
 */

import { useCallback } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import {
  useSlopeSurveyStore,
  SLOPE_CLASS_BY_TOOL,
  SLOPE_CLASS_COLORS,
} from '../../../store/slopeSurveyStore.js';
import { useMapboxDrawTool } from '../../observe/components/draw/useMapboxDrawTool.js';

interface Props {
  map: MaplibreMap;
  projectId: string | null;
  /** Plan objective active in the Act tier when this feature was drawn (Phase-5 provenance stamp). */
  sourceObjectiveId?: string | null;
}

/** acres -- identical constant + best-effort guard as useDesignElementDrawTool. */
function polygonAcres(geom: GeoJSON.Polygon): number {
  try {
    return turf.area(geom) * 0.000247105;
  } catch {
    return 0;
  }
}

export default function SlopeSurveyDrawHost({ map, projectId, sourceObjectiveId }: Props) {
  const activeTool = useMapToolStore((s) => s.activeTool);
  const addFeature = useSlopeSurveyStore((s) => s.addFeature);

  const armedClass = activeTool ? SLOPE_CLASS_BY_TOOL[activeTool] : undefined;
  const enabled = armedClass != null && projectId != null;

  const onComplete = useCallback(
    (geometry: GeoJSON.Polygon) => {
      if (!projectId) return;
      // Read the armed tool at completion time (not render time) so a
      // mid-session swap of the active slope tool takes effect on the next
      // polygon.
      const tool = useMapToolStore.getState().activeTool;
      const slopeClass = tool ? SLOPE_CLASS_BY_TOOL[tool] : undefined;
      if (!slopeClass) return;
      addFeature(projectId, {
        slopeClass,
        geometry,
        acreage: polygonAcres(geometry),
        sourceObjectiveId: sourceObjectiveId ?? undefined,
      });
    },
    [projectId, addFeature, sourceObjectiveId],
  );

  const previewColor = armedClass ? SLOPE_CLASS_COLORS[armedClass] : undefined;

  useMapboxDrawTool<GeoJSON.Polygon>({
    map,
    mode: 'draw_polygon',
    onComplete,
    enabled,
    previewColor,
  });

  return null;
}
