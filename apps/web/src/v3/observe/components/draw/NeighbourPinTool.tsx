import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useMapboxDrawTool } from './useMapboxDrawTool.js';
import { FIELD_SCHEMAS, createWithDefaults } from './annotationFieldSchemas.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

export default function NeighbourPinTool({ map, projectId }: Props) {
  const open = useAnnotationFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    onComplete: (geom) => {
      // Persist-first (PLAN-stage pattern, ADDENDUM 6): create record with
      // schema defaults so render layer can immediately replace the wiped
      // MapboxDraw layer; then open form in edit mode so the steward can
      // refine the metadata. Cancel keeps the default record.
      const id = createWithDefaults(FIELD_SCHEMAS.neighbourPin, {
        projectId,
        geometry: geom,
      });
      if (id)
        open({
          kind: 'neighbourPin',
          geometry: geom,
          mode: 'edit',
          existingId: id,
          projectId,
          discardOnCancel: true,
        });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Neighbour pin">
      <span className={css.title}>Neighbour pin</span>
      <span className={css.hint}>
        Click the map to drop the pin — a form opens to label the neighbour.
      </span>
    </div>
  );
}
