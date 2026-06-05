/**
 * ActAsBuiltDrawHandler - the Act-stage map-mounted half of the Slice 6
 * geometry capture affordance. The DOM popover (`ActAsBuiltPopover`) owns the
 * "Redraw shape on map" button and the readout; this thin shell owns the
 * MapboxDraw polygon lifecycle, armed by the shared `actAsBuiltPopoverStore`
 * `capture.drawing` flag (same store-bridge pattern as the Plan vertex editor's
 * `planVertexEditStore` <-> handler split).
 *
 * When the steward closes a polygon, `useMapboxDrawTool` fires `onComplete`
 * once; we stash the polygon + its geodesic area into the store via
 * `setCaptured` (which also disarms `drawing`), then the popover reads it back
 * for the readout and folds it into the geometry diff on Record.
 *
 * The hook is ALWAYS called (gated by `enabled`, never a conditional call) so
 * the Rules of Hooks hold; when `capture.drawing` is false the hook mounts no
 * draw control (true no-op). Returns null - this is a behavioural mount, like
 * `ActFeatureClickHandler`.
 *
 * Mount AFTER `<ActAsBuiltPopover map={map} />` in BOTH Act shells
 * (`ActTierShell` + `ActLayout`); missing one silently no-ops redraw there.
 */

import { useCallback } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useMapboxDrawTool } from '../../observe/components/draw/useMapboxDrawTool.js';
import { parcelAreaM2 } from '../../../lib/geo.js';
import { useActAsBuiltPopoverStore } from './actAsBuiltPopoverStore.js';

interface Props {
  map: MaplibreMap;
}

export default function ActAsBuiltDrawHandler({ map }: Props) {
  const drawing = useActAsBuiltPopoverStore((s) => s.capture.drawing);
  const setCaptured = useActAsBuiltPopoverStore((s) => s.setCaptured);

  const onComplete = useCallback(
    (geometry: GeoJSON.Polygon) => {
      setCaptured(geometry, parcelAreaM2(geometry));
    },
    [setCaptured],
  );

  // Amber preview to read as a "correction" overlay against the Plan polygons.
  useMapboxDrawTool<GeoJSON.Polygon>({
    map,
    mode: 'draw_polygon',
    enabled: drawing,
    onComplete,
    previewColor: '#f59e0b',
  });

  return null;
}
