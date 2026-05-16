/**
 * ZonePolygonTool — polygon → LandZone with permaculture zone level (Z0–Z5).
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  useZoneStore,
  ZONE_CATEGORY_CONFIG,
  Z_TO_CATEGORIES,
  type ZoneCategory,
} from '../../../../store/zoneStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import DrawAreaReadout from '../../../observe/components/draw/DrawAreaReadout.js';
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

const Z_OPTIONS = [
  { value: '0', label: 'Z0 — Home centre' },
  { value: '1', label: 'Z1 — Daily touch' },
  { value: '2', label: 'Z2 — Weekly touch' },
  { value: '3', label: 'Z3 — Main crops / orchard' },
  { value: '4', label: 'Z4 — Forage / managed' },
  { value: '5', label: 'Z5 — Wilderness' },
];

const optionsForZ = (z: string | number | undefined): { value: ZoneCategory; label: string }[] => {
  const key = String(z ?? '2');
  const list = Z_TO_CATEGORIES[key] ?? (Object.keys(ZONE_CATEGORY_CONFIG) as ZoneCategory[]);
  return list.map((k) => ({ value: k, label: ZONE_CATEGORY_CONFIG[k].label }));
};

export default function ZonePolygonTool({ map, projectId }: Props) {
  const addZone = useZoneStore((s) => s.addZone);
  const updateZone = useZoneStore((s) => s.updateZone);
  const deleteZone = useZoneStore((s) => s.deleteZone);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);
  const { field: enterpriseField, defaultValue: enterpriseDefault } = useEnterpriseFieldSpec(projectId);
  const dimMode = useDimensionDrawStore((s) => s.mode);
  const dimShape = useDimensionDrawStore((s) => s.shape);
  const dimValues = useDimensionValues();

  const handleComplete = (geom: GeoJSON.Polygon) => {
      const id = newAnnotationId('zone');
      const areaM2 = turf.area(geom);
      const anchor = turf.centroid(geom).geometry.coordinates as [number, number];
      const now = new Date().toISOString();
      const category: ZoneCategory = 'food_production';

      addZone({
        id,
        projectId,
        name: 'Zone',
        category,
        color: ZONE_CATEGORY_CONFIG[category].color,
        primaryUse: '',
        secondaryUse: '',
        notes: '',
        geometry: geom,
        areaM2,
        permacultureZone: 2,
        phase: phaseDefault || undefined,
        createdAt: now,
        updatedAt: now,
      });

      openForm({
        title: 'Zone',
        anchor,
        fields: [
          { key: 'name', label: 'Name', kind: 'text', required: true },
          {
            key: 'permacultureZone',
            label: 'Z-level',
            kind: 'select',
            required: true,
            options: Z_OPTIONS,
          },
          {
            key: 'category',
            label: 'Category',
            kind: 'select',
            required: true,
            optionsFor: (vals) => optionsForZ(vals.permacultureZone),
          },
          phaseField,
          enterpriseField,
        ],
        initial: {
          name: 'Zone',
          category,
          permacultureZone: '2',
          phase: phaseDefault,
          enterprise: enterpriseDefault,
        },
        onValuesChange: (next, prev, changed) => {
          if (changed.key !== 'permacultureZone') return null;
          const allowed = optionsForZ(next.permacultureZone).map((o) => o.value);
          if (allowed.includes(String(next.category) as ZoneCategory)) return null;
          return { category: allowed[0] ?? prev.category };
        },
        onSave: (values) => {
          const cat = values.category as ZoneCategory;
          const z = Number(values.permacultureZone);
          updateZone(id, {
            name: String(values.name ?? 'Zone'),
            category: cat,
            color: ZONE_CATEGORY_CONFIG[cat].color,
            permacultureZone: (Number.isFinite(z)
              ? Math.max(0, Math.min(5, Math.round(z)))
              : 2) as 0 | 1 | 2 | 3 | 4 | 5,
            phase: String(values.phase ?? '') || undefined,
            enterprise: String(values.enterprise ?? '') || undefined,
          });
        },
        onCancel: () => deleteZone(id),
      });
    };

  const { liveArea } = useMapboxDrawTool<GeoJSON.Polygon>({
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
    <div className={css.popover} role="dialog" aria-label="Zone tool">
      <span className={css.title}>Zone</span>
      <span className={css.hint}>
        Outline a zone polygon — pick category and Z-level (Z0 home → Z5
        wilderness).
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
