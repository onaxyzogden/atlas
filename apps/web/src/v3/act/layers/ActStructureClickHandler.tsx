/**
 * ActStructureClickHandler — opens the read-only Act structure inspector
 * when a placed Plan-stage structure (barn, greenhouse, well, etc.) is
 * clicked on the Act surface. Mounted only inside `ActLayout`; pairs with
 * `<PlanDataLayers ... editable={false} />` so the Plan edit popover is
 * gated off and this Act-side popover is the only thing that responds to
 * a structure click during execution.
 *
 * Layer wiring: clicks on `plan-data-poly-fill` filtered to
 * `properties.kind === 'structure'`. Other polygon kinds (zone, paddock,
 * crop, fertility) fall through and are handled by their respective Act
 * tools when those tools are active.
 */

import { useEffect } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useActStructurePopoverStore } from '../../../store/actStructurePopoverStore.js';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const STRUCTURE_LAYER_ID = 'plan-data-poly-fill';

export default function ActStructureClickHandler({ map }: Props) {
  const open = useActStructurePopoverStore((s) => s.open);

  useEffect(() => {
    if (!map) return;

    const onMouseEnter = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (f?.properties?.kind === 'structure') {
        map.getCanvas().style.cursor = 'pointer';
      }
    };
    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };
    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || f.properties?.kind !== 'structure') return;
      const id = String(f.properties.id);
      open({ structureId: id, anchor: [e.lngLat.lng, e.lngLat.lat] });
    };

    map.on('mouseenter', STRUCTURE_LAYER_ID, onMouseEnter);
    map.on('mouseleave', STRUCTURE_LAYER_ID, onMouseLeave);
    map.on('click', STRUCTURE_LAYER_ID, onClick);

    return () => {
      try {
        map.off('mouseenter', STRUCTURE_LAYER_ID, onMouseEnter);
        map.off('mouseleave', STRUCTURE_LAYER_ID, onMouseLeave);
        map.off('click', STRUCTURE_LAYER_ID, onClick);
      } catch {
        /* map already disposed */
      }
    };
  }, [map, open]);

  return null;
}
