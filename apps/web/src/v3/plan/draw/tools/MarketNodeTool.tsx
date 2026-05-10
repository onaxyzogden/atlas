/**
 * MarketNodeTool — point → MarketNode (Plan Module 7: Broiler Product Map).
 *
 * Market nodes close the post-farm-gate value chain: farmstand /
 * wholesale / restaurant / CSA drop-off. MarketDistributionCard rolls
 * weekly demand against throughput.
 *
 * Persist-first lifecycle mirrors FenceLineTool.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  useAgribusinessStore,
  type MarketKind,
} from '../../../../store/agribusinessStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { usePhaseFieldSpec } from '../usePhaseFieldSpec.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const KIND_OPTIONS: { value: MarketKind; label: string }[] = [
  { value: 'farmstand',    label: 'Farmstand' },
  { value: 'wholesale',    label: 'Wholesale buyer' },
  { value: 'restaurant',   label: 'Restaurant' },
  { value: 'csa-dropoff',  label: 'CSA drop-off' },
];

export default function MarketNodeTool({ map, projectId }: Props) {
  const addMarketNode = useAgribusinessStore((s) => s.addMarketNode);
  const updateMarketNode = useAgribusinessStore((s) => s.updateMarketNode);
  const deleteMarketNode = useAgribusinessStore((s) => s.deleteMarketNode);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    onComplete: (geom) => {
      const id = newAnnotationId('mkt');
      const anchor = geom.coordinates as [number, number];
      const now = new Date().toISOString();

      addMarketNode({
        id,
        projectId,
        name: 'Market node',
        geometry: geom,
        kind: 'farmstand',
        weeklyDemandKg: 0,
        phase: phaseDefault,
        notes: '',
        createdAt: now,
        updatedAt: now,
      });

      openForm({
        title: 'Market node',
        anchor,
        fields: [
          { key: 'name', label: 'Name', kind: 'text', required: true },
          {
            key: 'kind',
            label: 'Kind',
            kind: 'select',
            required: true,
            options: KIND_OPTIONS,
          },
          {
            key: 'weeklyDemandKg',
            label: 'Weekly demand',
            kind: 'number',
            suffix: 'kg/wk',
            placeholder: 'e.g. 120',
          },
          phaseField,
        ],
        initial: {
          name: 'Market node',
          kind: 'farmstand',
          weeklyDemandKg: 0,
          phase: phaseDefault,
        },
        onSave: (values) => {
          updateMarketNode(id, {
            name: String(values.name ?? 'Market node'),
            kind: values.kind as MarketKind,
            weeklyDemandKg: Number(values.weeklyDemandKg ?? 0),
            phase: String(values.phase ?? ''),
          });
        },
        onCancel: () => deleteMarketNode(id),
      });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Market node tool">
      <span className={css.title}>Market node</span>
      <span className={css.hint}>
        Drop a point where product is sold or distributed (farmstand,
        wholesale, restaurant, or CSA drop-off).
      </span>
    </div>
  );
}
