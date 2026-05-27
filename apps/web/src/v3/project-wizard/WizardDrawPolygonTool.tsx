/**
 * WizardDrawPolygonTool — thin shell over `useMapboxDrawTool` in polygon mode.
 *
 * Armed on Step 1 first paint per AC 7.1. Returns the captured Polygon
 * via `onComplete`. The hook's `draw.deleteAll()` on create keeps the
 * MapboxDraw control clean if the user re-arms after a Redo without
 * remounting the parent map.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import { useMapboxDrawTool } from '../observe/components/draw/useMapboxDrawTool.js';

interface WizardDrawPolygonToolProps {
  map: MaplibreMap;
  onComplete: (polygon: GeoJSON.Polygon) => void;
}

export default function WizardDrawPolygonTool({
  map,
  onComplete,
}: WizardDrawPolygonToolProps) {
  useMapboxDrawTool<GeoJSON.Polygon>({
    map,
    mode: 'draw_polygon',
    onComplete,
    previewColor: '#c4a265',
  });
  return null;
}
