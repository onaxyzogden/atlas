import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useMapboxDrawTool } from './useMapboxDrawTool.js';
import { FIELD_SCHEMAS, createWithDefaults } from './annotationFieldSchemas.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

export default function WellTool({ map, projectId }: Props) {
  const open = useAnnotationFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    onComplete: (geom) => {
      const id = createWithDefaults(FIELD_SCHEMAS.well, {
        projectId,
        geometry: geom,
      });
      if (id)
        open({
          kind: 'well',
          geometry: geom,
          mode: 'edit',
          existingId: id,
          projectId,
        });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Well">
      <span className={css.title}>Well</span>
      <span className={css.hint}>
        Click the map to drop the well — a form opens to set kind and depth.
      </span>
    </div>
  );
}
