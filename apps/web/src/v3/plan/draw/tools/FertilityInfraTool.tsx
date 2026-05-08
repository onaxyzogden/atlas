/**
 * FertilityInfraTool — point → FertilityInfra (Plan Module 6:
 * Soil Fertility & Closed-Loop).
 *
 * Single tool covers all 8 fertility-infra kinds: composter, hugelkultur,
 * biochar, worm_bin, cover_crop, chop_and_drop, dynamic_accumulator,
 * rotational_grazing. The 8 are the same geometry (point) and differ only
 * in semantic category, so a single tool with a type-select in the popover
 * keeps the rail compact (mirrors the Zone tool's category select rather
 * than the Water module's geometry-based 4-tool split).
 *
 * Persist-first: addFertilityInfra(skeleton) on draw.create,
 * updateFertilityInfra on Save, removeFertilityInfra on Cancel for true
 * ESC rollback.
 *
 * Per Permaculture Scholar verdict 2026-05-07 (`wiki/decisions/
 * 2026-05-07-atlas-plan-soil-scholar-build-fresh.md`) the 8 kinds split
 * into "structural" practices (composter / hugelkultur / biochar /
 * worm_bin) and "biological" practices (cover_crop / chop_and_drop /
 * dynamic_accumulator / rotational_grazing). Surfaced as two opt-groups
 * in the popover dropdown ordering rather than a separate field.
 *
 * Yeomans rank 7 (Soil). Holmgren P6 (*Produce no waste*) — every
 * fertility unit closes a loop somewhere.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  useClosedLoopStore,
  type FertilityInfraType,
} from '../../../../store/closedLoopStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

// Order: structural practices first, then biological practices.
const TYPE_OPTIONS: { value: FertilityInfraType; label: string }[] = [
  { value: 'composter',           label: 'Composter' },
  { value: 'hugelkultur',         label: 'Hugelkultur' },
  { value: 'biochar',             label: 'Biochar kiln' },
  { value: 'worm_bin',            label: 'Worm bin' },
  { value: 'cover_crop',          label: 'Cover crop' },
  { value: 'chop_and_drop',       label: 'Chop & drop' },
  { value: 'dynamic_accumulator', label: 'Dynamic accumulator' },
  { value: 'rotational_grazing',  label: 'Rotational grazing' },
];

export default function FertilityInfraTool({ map, projectId }: Props) {
  const addFertilityInfra = useClosedLoopStore((s) => s.addFertilityInfra);
  const updateFertilityInfra = useClosedLoopStore((s) => s.updateFertilityInfra);
  const removeFertilityInfra = useClosedLoopStore((s) => s.removeFertilityInfra);
  const openForm = useInlineFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    onComplete: (geom) => {
      const id = newAnnotationId('fert');
      const anchor = geom.coordinates as [number, number];
      const type: FertilityInfraType = 'composter';

      addFertilityInfra({
        id,
        projectId,
        type,
        center: anchor,
        scaleNote: '',
        notes: '',
        createdAt: new Date().toISOString(),
      });

      openForm({
        title: 'Fertility unit',
        anchor,
        fields: [
          {
            key: 'type',
            label: 'Type',
            kind: 'select',
            required: true,
            options: TYPE_OPTIONS,
          },
          {
            key: 'scaleNote',
            label: 'Scale',
            kind: 'text',
            placeholder: 'e.g. 3 m³ pile',
          },
        ],
        initial: { type, scaleNote: '' },
        onSave: (values) => {
          updateFertilityInfra(id, {
            type: values.type as FertilityInfraType,
            scaleNote: String(values.scaleNote ?? '').trim() || undefined,
          });
        },
        onCancel: () => removeFertilityInfra(id),
      });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Fertility unit tool">
      <span className={css.title}>Fertility unit</span>
      <span className={css.hint}>
        Drop a point — pick composter / hugelkultur / biochar / worm bin /
        cover crop / chop &amp; drop / dynamic accumulator / rotational
        grazing.
      </span>
    </div>
  );
}
