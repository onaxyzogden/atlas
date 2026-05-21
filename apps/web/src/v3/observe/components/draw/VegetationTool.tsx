import { useState } from 'react';
import * as turf from '@turf/turf';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useConventionalCropStore } from '../../../../store/conventionalCropStore.js';
import { useBuiltEnvironmentStore } from '../../../../store/builtEnvironmentStore.js';
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

/**
 * Matrix + patches model: vegetation describes the *ground-cover matrix*
 * across the site. Crops and buildings sit on top as opaque patches. The
 * Fill-remainder toggle lets an operator outline the property (or any
 * enclosing boundary) and have the tool subtract every crop / building
 * polygon already on the map — so they never have to trace around
 * individual patches by hand.
 */
function subtractPatches(
  boundary: GeoJSON.Polygon,
  projectId: string,
): GeoJSON.Polygon | GeoJSON.MultiPolygon | null {
  const crops = useConventionalCropStore
    .getState()
    .conventionalCrops.filter((c) => c.projectId === projectId);
  const buildings = useBuiltEnvironmentStore
    .getState()
    .buildings.filter((b) => b.projectId === projectId);
  const subtractees = [
    ...crops.map((c) => c.geometry),
    ...buildings.map((b) => b.geometry),
  ];
  if (subtractees.length === 0) return boundary;

  let acc: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null =
    turf.feature(boundary);
  for (const g of subtractees) {
    if (!acc) break;
    try {
      // @turf/turf v7 difference takes a FeatureCollection of [minuend, subtrahend].
      acc = turf.difference(
        turf.featureCollection([acc, turf.feature(g)]),
      ) as typeof acc;
    } catch {
      /* malformed subtrahend — skip, keep current acc */
    }
  }
  return acc ? acc.geometry : null;
}

export default function VegetationTool({ map, projectId }: Props) {
  const open = useAnnotationFormStore((s) => s.open);
  const dimMode = useDimensionDrawStore((s) => s.mode);
  const dimShape = useDimensionDrawStore((s) => s.shape);
  const dimValues = useDimensionValues();
  const [fillRemainder, setFillRemainder] = useState(false);

  const place = (geom: GeoJSON.Polygon) => {
    let finalGeom: GeoJSON.Polygon | GeoJSON.MultiPolygon | null = geom;
    if (fillRemainder) {
      finalGeom = subtractPatches(geom, projectId);
      if (!finalGeom) {
        // Boundary was fully covered by crops/buildings — nothing left to
        // place. Surface a console hint; a richer toast can come later.
        console.info(
          '[Fill remainder] Boundary fully covered by crop/building patches — no remainder to place.',
        );
        return;
      }
    }
    const id = createWithDefaults(FIELD_SCHEMAS.vegetation, {
      projectId,
      geometry: finalGeom,
    });
    if (id)
      open({
        kind: 'vegetation',
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
