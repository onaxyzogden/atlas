import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useMapboxDrawTool } from './useMapboxDrawTool.js';
import { DRAW_PREVIEW_COLORS } from './mapboxDrawStyles.js';
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

export default function VegetationTool({ map, projectId }: Props) {
  const open = useAnnotationFormStore((s) => s.open);
  const dimMode = useDimensionDrawStore((s) => s.mode);
  const dimShape = useDimensionDrawStore((s) => s.shape);
  const dimValues = useDimensionValues();

  const place = (geom: GeoJSON.Polygon) => {
    const id = createWithDefaults(FIELD_SCHEMAS.vegetation, {
      projectId,
      geometry: geom,
    });
    if (id)
      open({
        kind: 'vegetation',
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
    previewColor: DRAW_PREVIEW_COLORS.vegetation,
  });

  useDimensionDrawTool({
    map,
    shape: dimShape === 'circle' ? 'circle' : 'rect',
    values: dimValues,
    enabled: dimMode === 'dimensions',
    onComplete: (geom) => place(geom as GeoJSON.Polygon),
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Vegetation & cover">
      <span className={css.title}>Vegetation &amp; cover</span>
      <span className={css.hint}>
        Outline a vegetation patch (Freehand) or set Width × Depth / Radius
        (Dimensions), then tag its succession stage and ground cover.
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
