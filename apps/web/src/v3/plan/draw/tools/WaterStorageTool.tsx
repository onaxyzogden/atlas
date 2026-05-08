/**
 * WaterStorageTool — point → storage WaterNode (Plan Module 2).
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  useWaterSystemsStore,
  type StorageNodeKind,
} from '../../../../store/waterSystemsStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { STORAGE_LABEL } from '../../cards/water-management/waterMath.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const STORAGE_OPTIONS: { value: StorageNodeKind; label: string }[] = (
  Object.keys(STORAGE_LABEL) as StorageNodeKind[]
).map((k) => ({ value: k, label: STORAGE_LABEL[k] }));

export default function WaterStorageTool({ map, projectId }: Props) {
  const addWaterNode = useWaterSystemsStore((s) => s.addWaterNode);
  const updateWaterNode = useWaterSystemsStore((s) => s.updateWaterNode);
  const removeWaterNode = useWaterSystemsStore((s) => s.removeWaterNode);
  const openForm = useInlineFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    onComplete: (geom) => {
      const id = newAnnotationId('wn-s');
      const anchor = geom.coordinates as [number, number];
      const storageKind: StorageNodeKind = 'cistern';
      addWaterNode({
        id,
        projectId,
        name: 'Storage',
        kind: 'storage',
        storageKind,
        capacityL: 0,
        overflowToNodeId: null,
        createdAt: new Date().toISOString(),
      });

      openForm({
        title: 'Storage',
        anchor,
        fields: [
          {
            key: 'storageKind',
            label: 'Type',
            kind: 'select',
            required: true,
            options: STORAGE_OPTIONS,
          },
          {
            key: 'capacityL',
            label: 'Capacity',
            kind: 'number',
            required: true,
            suffix: 'L',
          },
        ],
        initial: { storageKind, capacityL: '' },
        onSave: (values) => {
          const cap =
            typeof values.capacityL === 'number'
              ? values.capacityL
              : Number(values.capacityL);
          updateWaterNode(id, {
            storageKind: values.storageKind as StorageNodeKind,
            capacityL: Number.isFinite(cap) ? cap : 0,
          });
        },
        onCancel: () => removeWaterNode(id),
      });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Storage tool">
      <span className={css.title}>Storage</span>
      <span className={css.hint}>
        Drop a point — pick the storage type and capacity in the popover.
      </span>
    </div>
  );
}
