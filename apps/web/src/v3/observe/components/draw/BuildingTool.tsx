import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useMapboxDrawTool } from './useMapboxDrawTool.js';
import { FIELD_SCHEMAS, createWithDefaults } from './annotationFieldSchemas.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

export default function BuildingTool({ map, projectId }: Props) {
  const open = useAnnotationFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.Polygon>({
    map,
    mode: 'draw_polygon',
    onComplete: (geom) => {
      const id = createWithDefaults(FIELD_SCHEMAS.building, {
        projectId,
        geometry: geom,
      });
      if (id)
        open({
          kind: 'building',
          geometry: geom,
          mode: 'edit',
          existingId: id,
          projectId,
        });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Building">
      <span className={css.title}>Building</span>
      <span className={css.hint}>
        Outline the building footprint. Double-click to finish — a form opens.
      </span>
    </div>
  );
}
