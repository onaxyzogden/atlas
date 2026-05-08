/**
 * WaterSwaleTool — line → swale WaterNode (Plan Module 2).
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

export default function WaterSwaleTool({ map, projectId }: Props) {
  const addWaterNode = useWaterSystemsStore((s) => s.addWaterNode);
  const updateWaterNode = useWaterSystemsStore((s) => s.updateWaterNode);
  const removeWaterNode = useWaterSystemsStore((s) => s.removeWaterNode);
  const openForm = useInlineFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.LineString>({
    map,
    mode: 'draw_line_string',
    onComplete: (geom) => {
      const id = newAnnotationId('wn-w');
      const lengthM = turf.length(turf.feature(geom), { units: 'kilometers' }) * 1000;
      const coords = geom.coordinates;
      const midIdx = Math.floor(coords.length / 2);
      const anchor = coords[midIdx] as [number, number];

      addWaterNode({
        id,
        projectId,
        name: 'Swale',
        kind: 'swale',
        swaleLengthM: lengthM,
        swaleWidthM: 0.6,
        swaleDepthM: 0.4,
        overflowToNodeId: null,
        createdAt: new Date().toISOString(),
      });

      openForm({
        title: 'Swale',
        anchor,
        fields: [
          {
            key: 'swaleLengthM',
            label: 'Length',
            kind: 'number',
            readonly: true,
            suffix: 'm',
          },
          {
            key: 'swaleWidthM',
            label: 'Width',
            kind: 'number',
            required: true,
            suffix: 'm',
          },
          {
            key: 'swaleDepthM',
            label: 'Depth',
            kind: 'number',
            required: true,
            suffix: 'm',
          },
        ],
        initial: {
          swaleLengthM: Math.round(lengthM * 10) / 10,
          swaleWidthM: 0.6,
          swaleDepthM: 0.4,
        },
        onSave: (values) => {
          const w = Number(values.swaleWidthM);
          const d = Number(values.swaleDepthM);
          updateWaterNode(id, {
            swaleWidthM: Number.isFinite(w) ? w : undefined,
            swaleDepthM: Number.isFinite(d) ? d : undefined,
          });
        },
        onCancel: () => removeWaterNode(id),
      });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Swale tool">
      <span className={css.title}>Swale</span>
      <span className={css.hint}>
        Trace the swale line on contour — confirm width and depth in the popover.
      </span>
    </div>
  );
}
