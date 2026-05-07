import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useMapboxDrawTool } from './useMapboxDrawTool.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

export default function AccessRoadTool({ map, projectId }: Props) {
  const open = useAnnotationFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.LineString>({
    map,
    mode: 'draw_line_string',
    onComplete: (geom) => {
      open({ kind: 'accessRoad', geometry: geom, mode: 'create', projectId });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Access road">
      <span className={css.title}>Access road</span>
      <span className={css.hint}>
        Click points to trace the road. Double-click to finish — a form opens.
      </span>
    </div>
  );
}
