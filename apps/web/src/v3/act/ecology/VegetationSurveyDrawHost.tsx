/**
 * VegetationSurveyDrawHost -- mounts the polygon-draw tool for the s2-ecology-c1
 * vegetation survey. Mirrors ActDrawHost's prefix-guard: it no-ops unless the
 * active map tool is 'act.ecology.veg-survey' and a project is loaded.
 *
 * On each completed polygon it computes acreage (same turf constant as design
 * elements) and appends a feature to the vegetation-survey store under the
 * store's currently-armed community. The draw hook auto-clears after each
 * create, so the steward can draw several polygons of the same community in a
 * row without re-arming. If no community is selected yet, the draw is dropped
 * (the panel is the primary arming surface).
 */

import { useCallback } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import {
  useVegetationSurveyStore,
  VEG_COMMUNITY_COLORS,
} from '../../../store/vegetationSurveyStore.js';
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

export default function VegetationSurveyDrawHost({ map, projectId, sourceObjectiveId }: Props) {
  const activeTool = useMapToolStore((s) => s.activeTool);
  const activeCommunity = useVegetationSurveyStore((s) => s.activeCommunity);
  const addFeature = useVegetationSurveyStore((s) => s.addFeature);

  const enabled = activeTool === 'act.ecology.veg-survey' && projectId != null;

  const onComplete = useCallback(
    (geometry: GeoJSON.Polygon) => {
      if (!projectId) return;
      // Read the armed community at completion time (not render time) so a
      // mid-session swap in the panel takes effect on the next polygon.
      const community = useVegetationSurveyStore.getState().activeCommunity;
      if (!community) return;
      addFeature(projectId, {
        community,
        geometry,
        acreage: polygonAcres(geometry),
        sourceObjectiveId: sourceObjectiveId ?? undefined,
      });
    },
    [projectId, addFeature, sourceObjectiveId],
  );

  const previewColor = activeCommunity
    ? VEG_COMMUNITY_COLORS[activeCommunity]
    : undefined;

  useMapboxDrawTool<GeoJSON.Polygon>({
    map,
    mode: 'draw_polygon',
    onComplete,
    enabled,
    previewColor,
  });

  return null;
}
