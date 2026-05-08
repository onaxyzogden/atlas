import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useMapboxDrawTool } from './useMapboxDrawTool.js';
import { FIELD_SCHEMAS, createWithDefaults } from './annotationFieldSchemas.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

export default function EcologyZoneTool({ map, projectId }: Props) {
  const open = useAnnotationFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.Polygon>({
    map,
    mode: 'draw_polygon',
    onComplete: (geom) => {
      const id = createWithDefaults(FIELD_SCHEMAS.ecologyZone, {
        projectId,
        geometry: geom,
      });
      if (id)
        open({
          kind: 'ecologyZone',
          geometry: geom,
          mode: 'edit',
          existingId: id,
          projectId,
        });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Ecology zone">
      <span className={css.title}>Ecology zone</span>
      <span className={css.hint}>
        Outline an ecological patch — a form opens to set succession stage.
      </span>
    </div>
  );
}
