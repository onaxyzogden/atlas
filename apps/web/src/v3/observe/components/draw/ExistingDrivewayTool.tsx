import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useMapboxDrawTool } from './useMapboxDrawTool.js';
import { FIELD_SCHEMAS, createWithDefaults } from './annotationFieldSchemas.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

export default function ExistingDrivewayTool({ map, projectId }: Props) {
  const open = useAnnotationFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.LineString>({
    map,
    mode: 'draw_line_string',
    onComplete: (geom) => {
      const id = createWithDefaults(FIELD_SCHEMAS.existingDriveway, {
        projectId,
        geometry: geom,
      });
      if (id)
        open({
          kind: 'existingDriveway',
          geometry: geom,
          mode: 'edit',
          existingId: id,
          projectId,
        });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Existing driveway">
      <span className={css.title}>Existing driveway</span>
      <span className={css.hint}>
        Trace the driveway. Double-click to finish — a form opens.
      </span>
    </div>
  );
}
