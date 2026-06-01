/**
 * ActFeatureClickHandler - opens the Act-stage as-built deviation popover
 * (`ActAsBuiltPopover`) when a placed Plan land feature is clicked on the Act
 * surface. Mirrors `ActStructureClickHandler` but targets editable land
 * features. Slice 4: crop areas, paddocks, and zones.
 *
 * Pairs with `<PlanDataLayers ... editable={false} />` so the Plan edit popover
 * stays gated off and the Act surface records a divergence instead of mutating
 * Plan geometry - "Act adds, it does not edit Plan decisions."
 *
 * Layer wiring: clicks on `plan-data-poly-fill` whose `properties.kind` is one
 * of crop / paddock / zone (the polygon carries `properties.id = feature.id`).
 * Structures keep their own read-only inspector (`ActStructureClickHandler`),
 * which hands off to this popover via a "Record as-built change" button.
 */

import { useEffect } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { AsBuiltFeatureKind } from '@ogden/shared';
import { useActAsBuiltPopoverStore } from '../asBuilt/actAsBuiltPopoverStore.js';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const POLY_LAYER_ID = 'plan-data-poly-fill';

// Map the polygon layer's `properties.kind` to the as-built feature kind.
// Structures are intentionally absent - the dedicated structure inspector
// owns them and hands off to the as-built popover itself.
const KIND_MAP: Record<string, AsBuiltFeatureKind> = {
  crop: 'cropArea',
  paddock: 'paddock',
  zone: 'zone',
};

export default function ActFeatureClickHandler({ map }: Props) {
  const open = useActAsBuiltPopoverStore((s) => s.open);

  useEffect(() => {
    if (!map) return;

    const onMouseEnter = (e: maplibregl.MapLayerMouseEvent) => {
      const k = e.features?.[0]?.properties?.kind;
      if (typeof k === 'string' && k in KIND_MAP) {
        map.getCanvas().style.cursor = 'pointer';
      }
    };
    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };
    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      const k = f?.properties?.kind;
      if (!f || typeof k !== 'string' || !(k in KIND_MAP)) return;
      const id = String(f.properties.id);
      open({ kind: KIND_MAP[k]!, id, anchor: [e.lngLat.lng, e.lngLat.lat] });
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
