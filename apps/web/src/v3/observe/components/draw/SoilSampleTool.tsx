import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useMapboxDrawTool } from './useMapboxDrawTool.js';
import type { SnapTargets } from '../../../lib/snapPoint.js';
import { FIELD_SCHEMAS, createWithDefaults } from './annotationFieldSchemas.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
  /** Snap-target source builder; consulted only when snapping is armed. */
  getSnapTargets?: () => SnapTargets;
}

export default function SoilSampleTool({ map, projectId, getSnapTargets }: Props) {
  const open = useAnnotationFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    snap: true,
    getSnapTargets,
    onComplete: (geom) => {
      const id = createWithDefaults(FIELD_SCHEMAS.soilSample, {
        projectId,
        geometry: geom,
      });
      if (id)
        open({
          kind: 'soilSample',
          geometry: geom,
          mode: 'edit',
          existingId: id,
          projectId,
          discardOnCancel: true,
        });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Soil sample">
      <span className={css.title}>Soil sample</span>
      <span className={css.hint}>
        Click the map to pin a soil test pit — a form opens to enter lab values.
      </span>
    </div>
  );
}
