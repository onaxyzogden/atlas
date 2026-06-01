/**
 * ActFeatureClickHandler - opens the Act-stage as-built deviation popover
 * (`ActAsBuiltPopover`) when a placed Plan crop area is clicked on the Act
 * surface. Mirrors `ActStructureClickHandler` but targets editable land
 * features. Slice 2: crop areas only; paddock + zone widen in Slice 4.
 *
 * Pairs with `<PlanDataLayers ... editable={false} />` so the Plan edit popover
 * stays gated off and the Act surface records a divergence instead of mutating
 * Plan geometry - "Act adds, it does not edit Plan decisions."
 *
 * Layer wiring: clicks on `plan-data-poly-fill` filtered to
 * `properties.kind === 'crop'` (the crop polygon carries `properties.id =
 * cropArea.id`). Structures keep their own read-only inspector
 * (`ActStructureClickHandler`); other polygon kinds fall through to their Act
 * tools when those tools are active.
 */

import { useEffect } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useActAsBuiltPopoverStore } from '../asBuilt/actAsBuiltPopoverStore.js';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const POLY_LAYER_ID = 'plan-data-poly-fill';

export default function ActFeatureClickHandler({ map }: Props) {
  const open = useActAsBuiltPopoverStore((s) => s.open);

  useEffect(() => {
    if (!map) return;

    const onMouseEnter = (e: maplibregl.MapLayerMouseEvent) => {
      if (e.features?.[0]?.properties?.kind === 'crop') {
        map.getCanvas().style.cursor = 'pointer';
      }
    };
    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };
    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || f.properties?.kind !== 'crop') return;
      const id = String(f.properties.id);
      open({ kind: 'cropArea', id, anchor: [e.lngLat.lng, e.lngLat.lat] });
    };

    map.on('mouseenter', POLY_LAYER_ID, onMouseEnter);
    map.on('mouseleave', POLY_LAYER_ID, onMouseLeave);
    map.on('click', POLY_LAYER_ID, onClick);

    return () => {
      try {
        map.off('mouseenter', POLY_LAYER_ID, onMouseEnter);
        map.off('mouseleave', POLY_LAYER_ID, onMouseLeave);
        map.off('click', POLY_LAYER_ID, onClick);
      } catch {
        /* map already disposed */
      }
    };
  }, [map, open]);

  return null;
}
