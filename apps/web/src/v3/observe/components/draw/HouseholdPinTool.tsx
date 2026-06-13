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

export default function HouseholdPinTool({ map, projectId, getSnapTargets }: Props) {
  const open = useAnnotationFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    snap: true,
    getSnapTargets,
    onComplete: (geom) => {
      const id = createWithDefaults(FIELD_SCHEMAS.household, {
        projectId,
        geometry: geom,
      });
      if (id)
        open({
          kind: 'household',
          geometry: geom,
          mode: 'edit',
          existingId: id,
          projectId,
          discardOnCancel: true,
        });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Steward / household">
      <span className={css.title}>Steward / household</span>
      <span className={css.hint}>
        Click the map — a form opens to enter household details.
      </span>
    </div>
  );
}
