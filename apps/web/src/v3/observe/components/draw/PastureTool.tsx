import { useState } from 'react';
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
import { subtractPatches, collectSubtractees } from './subtractPatches.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

/**
 * Matrix + patches model: pasture describes the *ground-cover matrix* of
 * grazed / fenced land. Crops and buildings sit on top as opaque patches.
 * The Fill-remainder toggle lets an operator outline a boundary and have
 * the tool subtract every crop / building polygon already on the map.
 * Math lives in `./subtractPatches.ts`.
 */

export default function PastureTool({ map, projectId }: Props) {
  const open = useAnnotationFormStore((s) => s.open);
  const dimMode = useDimensionDrawStore((s) => s.mode);
  const dimShape = useDimensionDrawStore((s) => s.shape);
  const dimValues = useDimensionValues();
  const [fillRemainder, setFillRemainder] = useState(false);

  const place = (geom: GeoJSON.Polygon) => {
    let finalGeom: GeoJSON.Polygon | GeoJSON.MultiPolygon | null = geom;
    if (fillRemainder) {
      finalGeom = subtractPatches(geom, collectSubtractees(projectId));
      if (!finalGeom) {
        console.info(
          '[Fill remainder] Boundary fully covered by crop/building patches — no remainder to place.',
        );
        return;
      }
    }
    const id = createWithDefaults(FIELD_SCHEMAS.pasture, {
      projectId,
      geometry: finalGeom,
    });
    if (id)
      open({
        kind: 'pasture',
        geometry: finalGeom,
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
    previewColor: DRAW_PREVIEW_COLORS.pasture,
  });

  useDimensionDrawTool({
    map,
    shape: dimShape === 'circle' ? 'circle' : 'rect',
    values: dimValues,
    enabled: dimMode === 'dimensions',
    onComplete: (geom) => place(geom as GeoJSON.Polygon),
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Pasture / paddock">
      <span className={css.title}>Pasture / paddock</span>
      <span className={css.hint}>
        Outline grazed or fenced land (Freehand) or set Width × Depth / Radius (Dimensions).
      </span>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          marginTop: 4,
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={fillRemainder}
          onChange={(e) => setFillRemainder(e.target.checked)}
        />
        <span>Fill remainder (subtract crops &amp; buildings)</span>
      </label>
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
