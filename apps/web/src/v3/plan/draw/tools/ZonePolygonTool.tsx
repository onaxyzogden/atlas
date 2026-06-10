/**
 * ZonePolygonTool — polygon → LandZone with permaculture zone level (Z0–Z5).
 */

import { useEffect, useState } from 'react';
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
import type { SnapTargets } from '../../../lib/snapPoint.js';
import DrawAreaReadout from '../../../observe/components/draw/DrawAreaReadout.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { usePhaseFieldSpec } from '../usePhaseFieldSpec.js';
import { useEnterpriseFieldSpec } from '../useEnterpriseFieldSpec.js';
import { useDimensionDrawStore, useDimensionValues } from '../dimensionDrawStore.js';
import { useDimensionDrawTool } from '../useDimensionDrawTool.js';
import { useZoneSizeGuide } from '../useZoneSizeGuide.js';
import {
  guideRadiusM,
  zoneGuideLabel,
  zoneSizeStatus,
  type ZLevel,
} from '../zoneSizeGuide.js';
import DimensionPanel from '../DimensionPanel.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

const STATUS_COLOR: Record<string, string> = {
  ok: '#3f8a4a',
  under: '#b8860b',
  over: '#b8860b',
  none: 'inherit',
};

interface Props {
  map: MaplibreMap;
  projectId: string;
  getSnapTargets?: () => SnapTargets;
  /** Plan objective active in the Act tier when this tool is armed (Phase-5 provenance stamp). */
  sourceObjectiveId?: string | null;
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

export default function ZonePolygonTool({ map, projectId, getSnapTargets, sourceObjectiveId }: Props) {
  const addZone = useZoneStore((s) => s.addZone);
  const updateZone = useZoneStore((s) => s.updateZone);
  const deleteZone = useZoneStore((s) => s.deleteZone);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);
  const { field: enterpriseField, defaultValue: enterpriseDefault } = useEnterpriseFieldSpec(projectId);
  const dimMode = useDimensionDrawStore((s) => s.mode);
  const dimShape = useDimensionDrawStore((s) => s.shape);
  const dimValues = useDimensionValues();
  const setDimValues = useDimensionDrawStore((s) => s.setValues);

  const [zLevel, setZLevel] = useState<ZLevel>(2);

  // Snap-assist: pre-size the parametric circle to the Z-level's Mollison
  // radius when drawing a circle by dimensions (still user-editable).
  useEffect(() => {
    if (dimMode !== 'dimensions' || dimShape !== 'circle') return;
    const r = guideRadiusM(zLevel);
    if (r != null) setDimValues({ radiusM: r });
  }, [zLevel, dimMode, dimShape, setDimValues]);

  useZoneSizeGuide({
    map,
    zLevel,
    anchor: dimMode === 'dimensions' ? 'cursor' : 'freehand',
  });

  const defaultCategoryForZ = (z: ZLevel): ZoneCategory =>
    optionsForZ(String(z))[0]?.value ?? 'food_production';

  const handleComplete = (geom: GeoJSON.Polygon) => {
      const id = newAnnotationId('zone');
      const areaM2 = turf.area(geom);
      const anchor = turf.centroid(geom).geometry.coordinates as [number, number];
      const now = new Date().toISOString();
      const category: ZoneCategory = defaultCategoryForZ(zLevel);

      addZone({
        id,
        projectId,
        sourceObjectiveId: sourceObjectiveId ?? undefined,
        name: 'Zone',
        category,
        color: ZONE_CATEGORY_CONFIG[category].color,
        primaryUse: '',
        secondaryUse: '',
        notes: '',
        geometry: geom,
        areaM2,
        permacultureZone: zLevel,
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
          permacultureZone: String(zLevel),
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
    snap: true,
    getSnapTargets,
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
        Outline a zone polygon — the dashed ring shows the Mollison size
        target for the chosen Z-level (a guide, not a limit).
      </span>
      <div className={css.row}>
        <span className={css.fieldLabel} style={{ minWidth: 56 }}>
          Z-level
        </span>
        <select
          className={css.input}
          value={String(zLevel)}
          onChange={(e) =>
            setZLevel(Number(e.target.value) as ZLevel)
          }
        >
          {Z_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <span className={css.hint}>{zoneGuideLabel(zLevel)}</span>
      <DimensionPanel allowedShapes={['rect', 'circle']} />
      {liveArea !== null && (
        <div
          className={css.readout}
          style={{ color: STATUS_COLOR[zoneSizeStatus(liveArea, zLevel)] }}
        >
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
