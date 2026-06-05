import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useMapboxDrawTool } from './useMapboxDrawTool.js';
import { FIELD_SCHEMAS, createWithDefaults } from './annotationFieldSchemas.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

export default function ErosionFlagTool({ map, projectId }: Props) {
  const open = useAnnotationFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    onComplete: (geom) => {
      const id = createWithDefaults(FIELD_SCHEMAS.erosionFlag, {
        projectId,
        geometry: geom,
      });
      if (id)
        open({
          kind: 'erosionFlag',
          geometry: geom,
          mode: 'edit',
          existingId: id,
          projectId,
          discardOnCancel: true,
        });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Erosion flag">
      <span className={css.title}>Erosion flag</span>
      <span className={css.hint}>
        Click the map to flag observed erosion — a form opens for severity and type.
      </span>
    </div>
  );
}
