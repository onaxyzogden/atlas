/**
 * ZonePolygonTool — polygon → LandZone with permaculture zone level (Z0–Z5).
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  useZoneStore,
  ZONE_CATEGORY_CONFIG,
  type ZoneCategory,
} from '../../../../store/zoneStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const CATEGORY_OPTIONS: { value: ZoneCategory; label: string }[] = (
  Object.keys(ZONE_CATEGORY_CONFIG) as ZoneCategory[]
).map((k) => ({ value: k, label: ZONE_CATEGORY_CONFIG[k].label }));

const Z_OPTIONS = [
  { value: '0', label: 'Z0 — Home centre' },
  { value: '1', label: 'Z1 — Daily touch' },
  { value: '2', label: 'Z2 — Weekly touch' },
  { value: '3', label: 'Z3 — Main crops / orchard' },
  { value: '4', label: 'Z4 — Forage / managed' },
  { value: '5', label: 'Z5 — Wilderness' },
];

export default function ZonePolygonTool({ map, projectId }: Props) {
  const addZone = useZoneStore((s) => s.addZone);
  const updateZone = useZoneStore((s) => s.updateZone);
  const deleteZone = useZoneStore((s) => s.deleteZone);
  const openForm = useInlineFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.Polygon>({
    map,
    mode: 'draw_polygon',
    onComplete: (geom) => {
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
        createdAt: now,
        updatedAt: now,
      });

      openForm({
        title: 'Zone',
        anchor,
        fields: [
          { key: 'name', label: 'Name', kind: 'text', required: true },
          {
            key: 'category',
            label: 'Category',
            kind: 'select',
            required: true,
            options: CATEGORY_OPTIONS,
          },
          {
            key: 'permacultureZone',
            label: 'Z-level',
            kind: 'select',
            required: true,
            options: Z_OPTIONS,
          },
        ],
        initial: { name: 'Zone', category, permacultureZone: '2' },
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
          });
        },
        onCancel: () => deleteZone(id),
      });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Zone tool">
      <span className={css.title}>Zone</span>
      <span className={css.hint}>
        Outline a zone polygon — pick category and Z-level (Z0 home → Z5
        wilderness).
      </span>
    </div>
  );
}
