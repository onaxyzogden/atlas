/**
 * PathLineTool — line → DesignPath with usage frequency (Plan Module 3).
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  usePathStore,
  PATH_TYPE_CONFIG,
  type PathType,
  type DesignPath,
} from '../../../../store/pathStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { usePhaseFieldSpec } from '../usePhaseFieldSpec.js';
import { useEnterpriseFieldSpec } from '../useEnterpriseFieldSpec.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const TYPE_OPTIONS: { value: PathType; label: string }[] = (
  Object.keys(PATH_TYPE_CONFIG) as PathType[]
).map((k) => ({ value: k, label: PATH_TYPE_CONFIG[k].label }));

const FREQUENCY_OPTIONS: {
  value: NonNullable<DesignPath['usageFrequency']>;
  label: string;
}[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'occasional', label: 'Occasional' },
  { value: 'rare', label: 'Rare' },
];

const ACCESSIBLE_OPTIONS = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
];

export default function PathLineTool({ map, projectId }: Props) {
  const addPath = usePathStore((s) => s.addPath);
  const updatePath = usePathStore((s) => s.updatePath);
  const deletePath = usePathStore((s) => s.deletePath);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);
  const { field: enterpriseField, defaultValue: enterpriseDefault } = useEnterpriseFieldSpec(projectId);

  useMapboxDrawTool<GeoJSON.LineString>({
    map,
    mode: 'draw_line_string',
    onComplete: (geom) => {
      const id = newAnnotationId('path');
      const lengthM = turf.length(turf.feature(geom), { units: 'kilometers' }) * 1000;
      const coords = geom.coordinates;
      const midIdx = Math.floor(coords.length / 2);
      const anchor = coords[midIdx] as [number, number];
      const now = new Date().toISOString();
      const type: PathType = 'pedestrian_path';

      addPath({
        id,
        projectId,
        name: 'Path',
        type,
        color: PATH_TYPE_CONFIG[type].color,
        geometry: geom,
        lengthM,
        phase: phaseDefault,
        notes: '',
        usageFrequency: 'weekly',
        createdAt: now,
        updatedAt: now,
      });

      openForm({
        title: 'Path',
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
            key: 'usageFrequency',
            label: 'Frequency',
            kind: 'select',
            required: true,
            options: FREQUENCY_OPTIONS,
          },
          phaseField,
          enterpriseField,
          {
            key: 'accessible',
            label: 'Accessible',
            kind: 'select',
            options: ACCESSIBLE_OPTIONS,
          },
          {
            key: 'restPoints',
            label: 'Rest points',
            kind: 'number',
            placeholder: '0',
          },
        ],
        initial: {
          name: 'Path',
          type,
          usageFrequency: 'weekly',
          phase: phaseDefault,
          enterprise: enterpriseDefault,
          accessible: 'no',
          restPoints: 0,
        },
        onSave: (values) => {
          const type = values.type as PathType;
          const accessible = values.accessible === 'yes';
          const restPointCount = Math.max(0, Math.floor(Number(values.restPoints) || 0));
          let restPointAnchors: [number, number][] | undefined;
          if (accessible && restPointCount > 0) {
            const lineFeature = turf.feature(geom);
            const lengthKm = turf.length(lineFeature, { units: 'kilometers' });
            const anchors: [number, number][] = [];
            for (let i = 1; i <= restPointCount; i++) {
              const fraction = i / (restPointCount + 1);
              const pt = turf.along(lineFeature, lengthKm * fraction, { units: 'kilometers' });
              anchors.push(pt.geometry.coordinates as [number, number]);
            }
            restPointAnchors = anchors;
          }
          updatePath(id, {
            name: String(values.name ?? 'Path'),
            type,
            color: PATH_TYPE_CONFIG[type].color,
            usageFrequency: values.usageFrequency as DesignPath['usageFrequency'],
            phase: String(values.phase ?? ''),
            enterprise: String(values.enterprise ?? '') || undefined,
            accessible: accessible || undefined,
            restPointAnchors,
          });
        },
        onCancel: () => deletePath(id),
      });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Path tool">
      <span className={css.title}>Path</span>
      <span className={css.hint}>
        Trace a path line — pick its type and how often it's used.
      </span>
    </div>
  );
}
