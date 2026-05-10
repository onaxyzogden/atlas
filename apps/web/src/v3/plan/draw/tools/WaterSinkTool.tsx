/**
 * WaterSinkTool — point → sink WaterNode (Plan Module 2).
 *
 * Sinks have no required fields beyond a name; they absorb whatever flows in.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
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

export default function WaterSinkTool({ map, projectId }: Props) {
  const addWaterNode = useWaterSystemsStore((s) => s.addWaterNode);
  const updateWaterNode = useWaterSystemsStore((s) => s.updateWaterNode);
  const removeWaterNode = useWaterSystemsStore((s) => s.removeWaterNode);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);
  const { field: enterpriseField, defaultValue: enterpriseDefault } = useEnterpriseFieldSpec(projectId);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    onComplete: (geom) => {
      const id = newAnnotationId('wn-x');
      const anchor = geom.coordinates as [number, number];
      addWaterNode({
        id,
        projectId,
        name: 'Sink',
        kind: 'sink',
        center: anchor,
        phase: phaseDefault || undefined,
        createdAt: new Date().toISOString(),
      });

      openForm({
        title: 'Sink',
        anchor,
        fields: [
          {
            key: 'name',
            label: 'Name',
            kind: 'text',
            required: true,
            placeholder: 'e.g., Wetland',
          },
          phaseField,
          enterpriseField,
        ],
        initial: { name: 'Sink', phase: phaseDefault, enterprise: enterpriseDefault },
        onSave: (values) => {
          updateWaterNode(id, {
            name: String(values.name ?? 'Sink'),
            phase: String(values.phase ?? '') || undefined,
            enterprise: String(values.enterprise ?? '') || undefined,
          });
        },
        onCancel: () => removeWaterNode(id),
      });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Sink tool">
      <span className={css.title}>Sink</span>
      <span className={css.hint}>
        Drop a point where water is absorbed (wetland, dry well, infiltration
        bed).
      </span>
    </div>
  );
}
