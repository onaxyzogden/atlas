/**
 * ColdChainUnitTool — point → ColdChainUnit (Plan Module 7: Broiler Product Map).
 *
 * Cold-chain coverage is the bridge between slaughter throughput and
 * weekly market demand. Stewards drop freezer / chiller / blast / reefer
 * units; ColdChainCoverageCard rolls capacity against the throughput
 * card's peak-week pack volume.
 *
 * Persist-first lifecycle mirrors FenceLineTool.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  useAgribusinessStore,
  type ColdChainKind,
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

const KIND_OPTIONS: { value: ColdChainKind; label: string }[] = [
  { value: 'freezer', label: 'Freezer' },
  { value: 'chiller', label: 'Chiller' },
  { value: 'blast',   label: 'Blast chiller' },
  { value: 'reefer',  label: 'Reefer (mobile)' },
];

export default function ColdChainUnitTool({ map, projectId }: Props) {
  const addColdChainUnit = useAgribusinessStore((s) => s.addColdChainUnit);
  const updateColdChainUnit = useAgribusinessStore((s) => s.updateColdChainUnit);
  const deleteColdChainUnit = useAgribusinessStore((s) => s.deleteColdChainUnit);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    onComplete: (geom) => {
      const id = newAnnotationId('cc');
      const anchor = geom.coordinates as [number, number];
      const now = new Date().toISOString();

      addColdChainUnit({
        id,
        projectId,
        name: 'Cold-chain unit',
        geometry: geom,
        kind: 'freezer',
        capacityM3: 0,
        phase: phaseDefault,
        notes: '',
        createdAt: now,
        updatedAt: now,
      });

      openForm({
        title: 'Cold-chain unit',
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
            key: 'capacityM3',
            label: 'Capacity',
            kind: 'number',
            suffix: 'm³',
            placeholder: 'e.g. 2.5',
          },
          phaseField,
          { key: 'notes', label: 'Notes', kind: 'textarea' },
        ],
        initial: {
          name: 'Cold-chain unit',
          kind: 'freezer',
          capacityM3: 0,
          phase: phaseDefault,
          notes: '',
        },
        onSave: (values) => {
          updateColdChainUnit(id, {
            name: String(values.name ?? 'Cold-chain unit'),
            kind: values.kind as ColdChainKind,
            capacityM3: Number(values.capacityM3 ?? 0),
            phase: String(values.phase ?? ''),
            notes: String(values.notes ?? ''),
          });
        },
        onCancel: () => deleteColdChainUnit(id),
      });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Cold-chain unit tool">
      <span className={css.title}>Cold-chain unit</span>
      <span className={css.hint}>
        Drop a point for a freezer, chiller, blast chiller, or mobile reefer.
      </span>
    </div>
  );
}
