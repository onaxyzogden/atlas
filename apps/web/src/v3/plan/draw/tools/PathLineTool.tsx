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

export default function PathLineTool({ map, projectId }: Props) {
  const addPath = usePathStore((s) => s.addPath);
  const updatePath = usePathStore((s) => s.updatePath);
  const deletePath = usePathStore((s) => s.deletePath);
  const openForm = useInlineFormStore((s) => s.open);

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
        phase: '',
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
        ],
        initial: { name: 'Path', type, usageFrequency: 'weekly' },
        onSave: (values) => {
          const type = values.type as PathType;
          updatePath(id, {
            name: String(values.name ?? 'Path'),
            type,
            color: PATH_TYPE_CONFIG[type].color,
            usageFrequency: values.usageFrequency as DesignPath['usageFrequency'],
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
