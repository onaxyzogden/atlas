import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useMapboxDrawTool } from './useMapboxDrawTool.js';
import { FIELD_SCHEMAS, createWithDefaults } from './annotationFieldSchemas.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

export default function SepticTool({ map, projectId }: Props) {
  const open = useAnnotationFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.Polygon>({
    map,
    mode: 'draw_polygon',
    onComplete: (geom) => {
      const id = createWithDefaults(FIELD_SCHEMAS.septic, {
        projectId,
        geometry: geom,
      });
      if (id)
        open({
          kind: 'septic',
          geometry: geom,
          mode: 'edit',
          existingId: id,
          projectId,
        });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Septic / leach field">
      <span className={css.title}>Septic / leach field</span>
      <span className={css.hint}>
        Outline the tank or leach field. Double-click to finish — a form opens.
      </span>
    </div>
  );
}
