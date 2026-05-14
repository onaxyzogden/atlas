/**
 * CropAreaTool — polygon → CropArea (Plan Module 5: Plant Systems & Polyculture).
 *
 * Persist-first: skeleton CropArea on draw.create, popover patches the
 * 2–4 essential fields (type, name, water demand, irrigation), removes
 * the record on Cancel so ESC truly rolls back.
 *
 * Schema notes — CropArea (apps/web/src/store/cropStore.ts):
 *   - geometry: GeoJSON.Polygon (full coords; areaM2 derived via turf)
 *   - type: orchard | row_crop | garden_bed | food_forest | windbreak |
 *           shelterbelt | silvopasture | nursery | market_garden |
 *           pollinator_strip
 *   - waterDemand: 'low' | 'medium' | 'high'
 *   - irrigationType: 'drip' | 'sprinkler' | 'flood' | 'rain_fed' | 'none'
 *
 * Yeomans rank 8 (Vegetation). Holmgren P8 (*Integrate rather than
 * segregate*) — surfacing crop polygons on the map lets Module 1's
 * Permanence ladder count and weight them in situ rather than via
 * slide-up authoring alone.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  useCropStore,
  type CropAreaType,
} from '../../../../store/cropStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { usePhaseFieldSpec } from '../usePhaseFieldSpec.js';
import { useEnterpriseFieldSpec } from '../useEnterpriseFieldSpec.js';
import { useDimensionDrawStore, useDimensionValues } from '../dimensionDrawStore.js';
import { useDimensionDrawTool } from '../useDimensionDrawTool.js';
import DimensionPanel from '../DimensionPanel.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const TYPE_OPTIONS: { value: CropAreaType; label: string }[] = [
  { value: 'orchard',           label: 'Orchard' },
  { value: 'food_forest',       label: 'Food forest' },
  { value: 'row_crop',          label: 'Row crop' },
  { value: 'garden_bed',        label: 'Garden bed' },
  { value: 'market_garden',     label: 'Market garden' },
  { value: 'silvopasture',      label: 'Silvopasture' },
  { value: 'windbreak',         label: 'Windbreak' },
  { value: 'shelterbelt',       label: 'Shelterbelt' },
  { value: 'nursery',           label: 'Nursery' },
  { value: 'pollinator_strip',  label: 'Pollinator strip' },
];

const TYPE_COLOR: Record<CropAreaType, string> = {
  orchard:          '#7aae3c',
  food_forest:      '#3d8a3d',
  row_crop:         '#c0a85c',
  garden_bed:       '#9bc15a',
  market_garden:    '#d6b85a',
  silvopasture:     '#6b9b6b',
  windbreak:        '#5d8a8d',
  shelterbelt:      '#7c9b7c',
  nursery:          '#a8c97f',
  pollinator_strip: '#d68bd0',
};

const WATER_OPTIONS = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
];

const IRRIGATION_OPTIONS = [
  { value: 'rain_fed',  label: 'Rain-fed' },
  { value: 'drip',      label: 'Drip' },
  { value: 'sprinkler', label: 'Sprinkler' },
  { value: 'flood',     label: 'Flood' },
  { value: 'none',      label: 'None' },
];

export default function CropAreaTool({ map, projectId }: Props) {
  const addCropArea = useCropStore((s) => s.addCropArea);
  const updateCropArea = useCropStore((s) => s.updateCropArea);
  const deleteCropArea = useCropStore((s) => s.deleteCropArea);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);
  const { field: enterpriseField, defaultValue: enterpriseDefault } = useEnterpriseFieldSpec(projectId);
  const dimMode = useDimensionDrawStore((s) => s.mode);
  const dimShape = useDimensionDrawStore((s) => s.shape);
  const dimValues = useDimensionValues();

  const handleComplete = (geom: GeoJSON.Polygon) => {
      const id = newAnnotationId('crop');
      const areaM2 = turf.area(geom);
      const anchor = turf.centroid(geom).geometry.coordinates as [number, number];
      const now = new Date().toISOString();
      const type: CropAreaType = 'orchard';

      addCropArea({
        id,
        projectId,
        name: 'Crop area',
        color: TYPE_COLOR[type],
        type,
        geometry: geom,
        areaM2,
        species: [],
        treeSpacingM: null,
        rowSpacingM: null,
        waterDemand: 'medium',
        irrigationType: 'rain_fed',
        phase: phaseDefault,
        notes: '',
        createdAt: now,
        updatedAt: now,
      });

      openForm({
        title: 'Crop area',
        anchor,
        fields: [
          { key: 'name', label: 'Name', kind: 'text', required: true },
          {
            key: 'type',
            label: 'Type',
            kind: 'select',
            required: true,
            options: TYPE_OPTIONS,
          },
          {
            key: 'waterDemand',
            label: 'Water demand',
            kind: 'select',
            required: true,
            options: WATER_OPTIONS,
          },
          {
            key: 'irrigationType',
            label: 'Irrigation',
            kind: 'select',
            required: true,
            options: IRRIGATION_OPTIONS,
          },
          phaseField,
          enterpriseField,
        ],
        initial: {
          name: 'Crop area',
          type,
          waterDemand: 'medium',
          irrigationType: 'rain_fed',
          phase: phaseDefault,
          enterprise: enterpriseDefault,
        },
        onSave: (values) => {
          const t = values.type as CropAreaType;
          updateCropArea(id, {
            name: String(values.name ?? 'Crop area'),
            type: t,
            color: TYPE_COLOR[t] ?? TYPE_COLOR.orchard,
            waterDemand: values.waterDemand as 'low' | 'medium' | 'high',
            irrigationType: values.irrigationType as
              | 'drip'
              | 'sprinkler'
              | 'flood'
              | 'rain_fed'
              | 'none',
            phase: String(values.phase ?? ''),
            enterprise: String(values.enterprise ?? '') || undefined,
          });
        },
        onCancel: () => deleteCropArea(id),
      });
    };

  useMapboxDrawTool<GeoJSON.Polygon>({
    map,
    mode: 'draw_polygon',
    onComplete: handleComplete,
    enabled: dimMode === 'freehand',
  });

  useDimensionDrawTool({
    map,
    shape: dimShape === 'line' ? 'rect' : dimShape,
    values: dimValues,
    enabled: dimMode === 'dimensions',
    onComplete: (geom) => handleComplete(geom as GeoJSON.Polygon),
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Crop area tool">
      <span className={css.title}>Crop area</span>
      <span className={css.hint}>
        Outline a crop polygon — pick type, water demand, and irrigation
        method.
      </span>
      <DimensionPanel allowedShapes={['rect', 'circle']} />
    </div>
  );
}
