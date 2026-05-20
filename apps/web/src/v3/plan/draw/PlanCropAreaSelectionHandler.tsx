/**
 * PlanCropAreaSelectionHandler — left-click on a `crop-fill-*` layer opens
 * the CoverCropPopoverEditor for that CropArea.
 *
 * B5.2.x.c follow-up: closes the parked map-entry sub-item from the
 * cover-crop spine completion slice. Mirrors `PlanObserveSelectionHandler`
 * (mousedown + live-layer query + e.preventDefault + e.stopPropagation),
 * but dispatches only the per-CropArea cover-crop popover — the rest of
 * the 23 map tools keep using `useInlineFormStore`.
 *
 * Anchor: screen-space `{ x: e.point.x, y: e.point.y }` because the
 * popover ships hand-rolled fixed positioning, not map-coordinate anchored.
 *
 * Covenant: pure routing — no copy, no economics.
 */

import { useEffect } from 'react';
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';
import { useCoverCropPopoverStore } from '../../../features/coverCrops/CoverCropPopoverEditor.js';

const CROP_FILL_PREFIX = 'crop-fill-';

interface Props {
  map: MaplibreMap;
  projectId: string | null;
}

function resolveCropAreaId(
  layerId: string,
  props: Record<string, unknown>,
): string | null {
  if (typeof props.id === 'string' && props.id.length > 0) return props.id;
  if (typeof props.cropAreaId === 'string' && props.cropAreaId.length > 0) {
    return props.cropAreaId;
  }
  if (layerId.startsWith(CROP_FILL_PREFIX)) {
    const id = layerId.slice(CROP_FILL_PREFIX.length);
    return id.length > 0 ? id : null;
  }
  return null;
}

export default function PlanCropAreaSelectionHandler({ map, projectId }: Props) {
  useEffect(() => {
    if (!map) return;

    const onMouseDown = (e: MapMouseEvent) => {
      if (!projectId) return;

      const liveLayers: string[] = [];
      try {
        const style = map.getStyle();
        if (style && Array.isArray(style.layers)) {
          for (const layer of style.layers) {
            if (layer.id.startsWith(CROP_FILL_PREFIX)) {
              liveLayers.push(layer.id);
            }
          }
        }
      } catch {
        return;
      }
      if (liveLayers.length === 0) return;

      const features = map.queryRenderedFeatures(e.point, { layers: liveLayers });
      if (!features || features.length === 0) return;

      const top = features[0];
      if (!top || !top.layer) return;

      const props = (top.properties ?? {}) as Record<string, unknown>;
      const cropAreaId = resolveCropAreaId(top.layer.id, props);
      if (!cropAreaId) return;

      e.preventDefault();
      e.originalEvent.stopPropagation();

      useCoverCropPopoverStore.getState().openFor({
        projectId,
        cropAreaId,
        anchor: { x: e.point.x, y: e.point.y },
      });
    };

    map.on('mousedown', onMouseDown);
    return () => {
      map.off('mousedown', onMouseDown);
    };
  }, [map, projectId]);

  return null;
}
