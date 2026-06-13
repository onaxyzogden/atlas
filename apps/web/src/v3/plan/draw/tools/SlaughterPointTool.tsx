/**
 * SlaughterPointTool — point → SlaughterPoint (Plan Module 7: Broiler Product Map).
 *
 * Added per ADR 2026-05-10 (Broiler Product Map). Newman, *First
 * Generation Farming*: a farm designed in isolation from the
 * agribusiness interface is "a ticking timebomb." Stewards need to
 * place slaughter stations (mobile / on-farm / shared / contract) so
 * the SlaughterThroughputCard can size capacity against bird volume.
 *
 * Persist-first lifecycle mirrors FenceLineTool:
 *   - draw.create → addSlaughterPoint(skeleton) with default kind 'on-farm'
 *   - popover Save → updateSlaughterPoint(id, patch)
 *   - popover Cancel / ESC → deleteSlaughterPoint(id)
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  useAgribusinessStore,
  type SlaughterKind,
} from '../../../../store/agribusinessStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import type { SnapTargets } from '../../../lib/snapPoint.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { usePhaseFieldSpec } from '../usePhaseFieldSpec.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
  /** Snap-target source builder; consulted only when snapping is armed. */
  getSnapTargets?: () => SnapTargets;
}

const KIND_OPTIONS: { value: SlaughterKind; label: string }[] = [
  { value: 'mobile',   label: 'Mobile unit' },
  { value: 'on-farm',  label: 'On-farm station' },
  { value: 'shared',   label: 'Shared (co-op)' },
  { value: 'contract', label: 'Contract processor' },
];

export default function SlaughterPointTool({ map, projectId, getSnapTargets }: Props) {
  const addSlaughterPoint = useAgribusinessStore((s) => s.addSlaughterPoint);
  const updateSlaughterPoint = useAgribusinessStore((s) => s.updateSlaughterPoint);
  const deleteSlaughterPoint = useAgribusinessStore((s) => s.deleteSlaughterPoint);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    snap: true,
    getSnapTargets,
    onComplete: (geom) => {
      const id = newAnnotationId('slp');
      const anchor = geom.coordinates as [number, number];
      const now = new Date().toISOString();

      addSlaughterPoint({
        id,
        projectId,
        name: 'Slaughter point',
        geometry: geom,
        kind: 'on-farm',
        capacityBirdsPerDay: 0,
        phase: phaseDefault,
        notes: '',
        createdAt: now,
        updatedAt: now,
      });

      openForm({
        title: 'Slaughter point',
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
            key: 'capacityBirdsPerDay',
            label: 'Capacity',
            kind: 'number',
            suffix: 'birds/day',
            placeholder: 'e.g. 250',
          },
          phaseField,
          { key: 'notes', label: 'Notes', kind: 'textarea' },
        ],
        initial: {
          name: 'Slaughter point',
          kind: 'on-farm',
          capacityBirdsPerDay: 0,
          phase: phaseDefault,
          notes: '',
        },
        onSave: (values) => {
          updateSlaughterPoint(id, {
            name: String(values.name ?? 'Slaughter point'),
            kind: values.kind as SlaughterKind,
            capacityBirdsPerDay: Number(values.capacityBirdsPerDay ?? 0),
            phase: String(values.phase ?? ''),
            notes: String(values.notes ?? ''),
          });
        },
        onCancel: () => deleteSlaughterPoint(id),
      });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Slaughter point tool">
      <span className={css.title}>Slaughter point</span>
      <span className={css.hint}>
        Drop a point where birds are processed (mobile, on-farm, shared, or
        contract).
      </span>
    </div>
  );
}
