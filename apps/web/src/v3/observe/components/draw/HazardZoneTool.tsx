import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useMapboxDrawTool } from './useMapboxDrawTool.js';
import type { SnapTargets } from '../../../lib/snapPoint.js';
import DrawAreaReadout from './DrawAreaReadout.js';
import { FIELD_SCHEMAS, createWithDefaults } from './annotationFieldSchemas.js';
import {
  useDimensionDrawStore,
  useDimensionValues,
} from '../../../plan/draw/dimensionDrawStore.js';
import { useDimensionDrawTool } from '../../../plan/draw/useDimensionDrawTool.js';
import DimensionPanel from '../../../plan/draw/DimensionPanel.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
  /** Snap-target source builder; consulted only when snapping is armed. */
  getSnapTargets?: () => SnapTargets;
}

export default function HazardZoneTool({ map, projectId, getSnapTargets }: Props) {
  const open = useAnnotationFormStore((s) => s.open);
  const dimMode = useDimensionDrawStore((s) => s.mode);
  const dimShape = useDimensionDrawStore((s) => s.shape);
  const dimValues = useDimensionValues();

  const place = (geom: GeoJSON.Polygon) => {
    const id = createWithDefaults(FIELD_SCHEMAS.hazardZone, {
      projectId,
      geometry: geom,
    });
    if (id)
      open({
        kind: 'hazardZone',
        geometry: geom,
        mode: 'edit',
        existingId: id,
        projectId,
        discardOnCancel: true,
      });
  };

  const { liveArea } = useMapboxDrawTool<GeoJSON.Polygon>({
    map,
    mode: 'draw_polygon',
    snap: true,
    getSnapTargets,
    enabled: dimMode === 'freehand',
    onComplete: place,
  });

  useDimensionDrawTool({
    map,
    shape: dimShape === 'circle' ? 'circle' : 'rect',
    values: dimValues,
    enabled: dimMode === 'dimensions',
    onComplete: (geom) => place(geom as GeoJSON.Polygon),
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Hazard zone">
      <span className={css.title}>Hazard zone</span>
      <span className={css.hint}>
        Outline the zone (Freehand) or set Width × Depth / Radius (Dimensions).
      </span>
      <DimensionPanel allowedShapes={['rect', 'circle']} />
      {liveArea !== null && (
        <div className={css.readout}>
          <DrawAreaReadout
            m2={liveArea}
            labelClassName={css.readoutLabel}
            valueClassName={css.readoutValue}
          />
        </div>
      )}
    </div>
  );
}
