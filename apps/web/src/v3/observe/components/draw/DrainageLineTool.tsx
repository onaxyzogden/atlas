import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useMapboxDrawTool } from './useMapboxDrawTool.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

export default function DrainageLineTool({ map, projectId }: Props) {
  const open = useAnnotationFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.LineString>({
    map,
    mode: 'draw_line_string',
    onComplete: (geom) => {
      open({ kind: 'drainageLine', geometry: geom, mode: 'create', projectId });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Drainage line">
      <span className={css.title}>Drainage line</span>
      <span className={css.hint}>
        Trace where water naturally collects and exits.
      </span>
    </div>
  );
}
