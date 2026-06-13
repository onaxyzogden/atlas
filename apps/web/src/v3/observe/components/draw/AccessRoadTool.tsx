import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useMapboxDrawTool } from './useMapboxDrawTool.js';
import type { SnapTargets } from '../../../lib/snapPoint.js';
import { FIELD_SCHEMAS, createWithDefaults } from './annotationFieldSchemas.js';
import {
  useDimensionDrawStore,
  useDimensionValues,
} from '../../../plan/draw/dimensionDrawStore.js';
import { useDimensionDrawTool } from '../../../plan/draw/useDimensionDrawTool.js';
import DimensionPanel from '../../../plan/draw/DimensionPanel.js';
import DrawLengthReadout from './DrawLengthReadout.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
  /** Snap-target source builder; consulted only when snapping is armed. */
  getSnapTargets?: () => SnapTargets;
}

export default function AccessRoadTool({ map, projectId, getSnapTargets }: Props) {
  const open = useAnnotationFormStore((s) => s.open);
  const dimMode = useDimensionDrawStore((s) => s.mode);
  const dimValues = useDimensionValues();

  const place = (geom: GeoJSON.LineString) => {
    const id = createWithDefaults(FIELD_SCHEMAS.accessRoad, {
      projectId,
      geometry: geom,
    });
    if (id)
      open({
        kind: 'accessRoad',
        geometry: geom,
        mode: 'edit',
        existingId: id,
        projectId,
        discardOnCancel: true,
      });
  };

  const { liveLength } = useMapboxDrawTool<GeoJSON.LineString>({
    map,
    mode: 'draw_line_string',
    snap: true,
    getSnapTargets,
    enabled: dimMode === 'freehand',
    onComplete: place,
  });

  useDimensionDrawTool({
    map,
    shape: 'line',
    values: dimValues,
    enabled: dimMode === 'dimensions',
    onComplete: (geom) => place(geom as GeoJSON.LineString),
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Access road">
      <span className={css.title}>Access road</span>
      <span className={css.hint}>
        Trace the road (Freehand) or set Length × Bearing (Dimensions).
      </span>
      <DimensionPanel allowedShapes={['line']} />
      {liveLength !== null && (
        <div className={css.readout}>
          <DrawLengthReadout
            meters={liveLength}
            labelClassName={css.readoutLabel}
            valueClassName={css.readoutValue}
          />
        </div>
      )}
    </div>
  );
}
