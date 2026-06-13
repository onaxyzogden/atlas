import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useMapboxDrawTool } from './useMapboxDrawTool.js';
import type { SnapTargets } from '../../../lib/snapPoint.js';
import { FIELD_SCHEMAS, createWithDefaults } from './annotationFieldSchemas.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
  /** Snap-target source builder; consulted only when snapping is armed. */
  getSnapTargets?: () => SnapTargets;
}

export default function GateTool({ map, projectId, getSnapTargets }: Props) {
  const open = useAnnotationFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    snap: true,
    getSnapTargets,
    onComplete: (geom) => {
      const id = createWithDefaults(FIELD_SCHEMAS.gate, {
        projectId,
        geometry: geom,
      });
      if (id)
        open({
          kind: 'gate',
          geometry: geom,
          mode: 'edit',
          existingId: id,
          projectId,
          discardOnCancel: true,
        });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Gate">
      <span className={css.title}>Gate</span>
      <span className={css.hint}>
        Click the map to drop the gate — a form opens to label it.
      </span>
    </div>
  );
}
