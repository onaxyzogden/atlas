import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useMapboxDrawTool } from './useMapboxDrawTool.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

export default function WatercourseTool({ map, projectId }: Props) {
  const open = useAnnotationFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.LineString>({
    map,
    mode: 'draw_line_string',
    onComplete: (geom) => {
      open({ kind: 'watercourse', geometry: geom, mode: 'create', projectId });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Watercourse">
      <span className={css.title}>Watercourse</span>
      <span className={css.hint}>
        Trace existing streams, creeks, or ditches.
      </span>
    </div>
  );
}
