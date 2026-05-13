import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useMapboxDrawTool } from './useMapboxDrawTool.js';
import { FIELD_SCHEMAS, createWithDefaults } from './annotationFieldSchemas.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

export default function FrostPocketTool({ map, projectId }: Props) {
  const open = useAnnotationFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.Polygon>({
    map,
    mode: 'draw_polygon',
    onComplete: (geom) => {
      const id = createWithDefaults(FIELD_SCHEMAS.frostPocket, {
        projectId,
        geometry: geom,
      });
      if (id)
        open({
          kind: 'frostPocket',
          geometry: geom,
          mode: 'edit',
          existingId: id,
          projectId,
          discardOnCancel: true,
        });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Frost pocket">
      <span className={css.title}>Frost pocket</span>
      <span className={css.hint}>
        Outline a low-lying area where frost settles. Double-click to close.
      </span>
    </div>
  );
}
