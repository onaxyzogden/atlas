import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useMapboxDrawTool } from './useMapboxDrawTool.js';
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
}

export default function BuildingTool({ map, projectId }: Props) {
  const open = useAnnotationFormStore((s) => s.open);
  const dimMode = useDimensionDrawStore((s) => s.mode);
  const dimShape = useDimensionDrawStore((s) => s.shape);
  const dimValues = useDimensionValues();

  const place = (geom: GeoJSON.Polygon) => {
    const id = createWithDefaults(FIELD_SCHEMAS.building, {
      projectId,
      geometry: geom,
    });
    if (id)
      open({
        kind: 'building',
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
    <div className={css.popover} role="dialog" aria-label="Building">
      <span className={css.title}>Building</span>
      <span className={css.hint}>
        Outline the footprint (Freehand) or set Width × Depth / Radius (Dimensions).
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
