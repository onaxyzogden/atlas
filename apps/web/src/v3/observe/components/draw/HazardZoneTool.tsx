import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useMapboxDrawTool } from './useMapboxDrawTool.js';
import { FIELD_SCHEMAS, createWithDefaults } from './annotationFieldSchemas.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

export default function HazardZoneTool({ map, projectId }: Props) {
  const open = useAnnotationFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.Polygon>({
    map,
    mode: 'draw_polygon',
    onComplete: (geom) => {
      const id = createWithDefaults(FIELD_SCHEMAS.hazardZone, {
        projectId,
        geometry: geom,
      });
      if (id)
        open({
          kind: 'hazardZone',
          geometry: geom,
          mode: 'edit',
          existingId: id,
          projectId,
        });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Hazard zone">
      <span className={css.title}>Hazard zone</span>
      <span className={css.hint}>
        Outline the zone — a form opens to pick the hazard type and severity.
      </span>
    </div>
  );
}
