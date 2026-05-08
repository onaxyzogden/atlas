/**
 * StructureTool — point → Structure (Plan Module: Structures & Subsystems,
 * Yeomans rank 5+6).
 *
 * One rail button covers all 20 structure types (cabin, yurt, earthship,
 * pavilion, greenhouse, barn, workshop, prayer_space, bathhouse,
 * classroom, storage, animal_shelter, compost_station, water_pump_house,
 * tent_glamping, fire_circle, lookout, solar_array, well, water_tank).
 * The popover's Type select picks the kind; per-type default footprint
 * dimensions come from STRUCTURE_TEMPLATES.
 *
 * Persist-first: addStructure(skeleton) on draw.create, updateStructure on
 * Save (re-computing the footprint polygon when type or rotation changes),
 * deleteStructure on Cancel for ESC rollback.
 *
 * Yeomans rank 5 (Structures) and rank 6 (Subsystems — utility infra).
 * Holmgren P8 (*Integrate rather than segregate*) — structures must
 * integrate with water lines, access tracks, and zones.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  useStructureStore,
  type StructureType,
} from '../../../../store/structureStore.js';
import {
  STRUCTURE_TEMPLATES,
  createFootprintPolygon,
} from '../../../../features/structures/footprints.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

// Order: dwellings → gathering / spiritual → agricultural → utility /
// infrastructure. Mirrors the FootprintTemplate.category ordering so the
// popover dropdown reads top-down by Yeomans rank-5 (dwellings) then
// rank-6 (subsystems).
const TYPE_OPTIONS: { value: StructureType; label: string }[] = [
  { value: 'cabin',            label: 'Cabin' },
  { value: 'yurt',             label: 'Yurt' },
  { value: 'earthship',        label: 'Earthship' },
  { value: 'tent_glamping',    label: 'Tent / Glamping' },
  { value: 'pavilion',         label: 'Pavilion' },
  { value: 'classroom',        label: 'Classroom' },
  { value: 'prayer_space',     label: 'Prayer space' },
  { value: 'bathhouse',        label: 'Bathhouse' },
  { value: 'fire_circle',      label: 'Fire circle' },
  { value: 'lookout',          label: 'Lookout' },
  { value: 'greenhouse',       label: 'Greenhouse' },
  { value: 'barn',             label: 'Barn' },
  { value: 'animal_shelter',   label: 'Animal shelter' },
  { value: 'workshop',         label: 'Workshop' },
  { value: 'storage',          label: 'Storage shed' },
  { value: 'compost_station',  label: 'Compost station' },
  { value: 'water_pump_house', label: 'Pump house' },
  { value: 'solar_array',      label: 'Solar array' },
  { value: 'well',             label: 'Well' },
  { value: 'water_tank',       label: 'Water tank' },
];

const PHASE_OPTIONS = [
  { value: 'Phase 1', label: 'Phase 1' },
  { value: 'Phase 2', label: 'Phase 2' },
  { value: 'Phase 3', label: 'Phase 3' },
  { value: 'Phase 4', label: 'Phase 4' },
];

function midCost(type: StructureType): number {
  const [lo, hi] = STRUCTURE_TEMPLATES[type].costRange;
  return Math.round((lo + hi) / 2);
}

export default function StructureTool({ map, projectId }: Props) {
  const addStructure = useStructureStore((s) => s.addStructure);
  const updateStructure = useStructureStore((s) => s.updateStructure);
  const deleteStructure = useStructureStore((s) => s.deleteStructure);
  const openForm = useInlineFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    onComplete: (geom) => {
      const id = newAnnotationId('str');
      const center = geom.coordinates as [number, number];
      const type: StructureType = 'cabin';
      const tpl = STRUCTURE_TEMPLATES[type];
      const now = new Date().toISOString();

      addStructure({
        id,
        projectId,
        name: tpl.label,
        type,
        center,
        geometry: createFootprintPolygon(center, tpl.widthM, tpl.depthM, 0),
        rotationDeg: 0,
        widthM: tpl.widthM,
        depthM: tpl.depthM,
        phase: 'Phase 1',
        costEstimate: midCost(type),
        infrastructureReqs: [...tpl.infrastructureReqs],
        notes: '',
        createdAt: now,
        updatedAt: now,
      });

      openForm({
        title: 'Structure',
        anchor: center,
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
            key: 'phase',
            label: 'Phase',
            kind: 'select',
            options: PHASE_OPTIONS,
          },
          {
            key: 'rotationDeg',
            label: 'Rotation (°)',
            kind: 'number',
            placeholder: '0',
            suffix: '°',
          },
        ],
        initial: {
          name: tpl.label,
          type,
          phase: 'Phase 1',
          rotationDeg: 0,
        },
        onSave: (values) => {
          const nextType = values.type as StructureType;
          const nextTpl = STRUCTURE_TEMPLATES[nextType] ?? tpl;
          const rawRot = Number(values.rotationDeg);
          const rotationDeg = Number.isFinite(rawRot) ? ((rawRot % 360) + 360) % 360 : 0;
          const geometry = createFootprintPolygon(
            center,
            nextTpl.widthM,
            nextTpl.depthM,
            rotationDeg,
          );
          updateStructure(id, {
            name: String(values.name ?? nextTpl.label).trim() || nextTpl.label,
            type: nextType,
            geometry,
            rotationDeg,
            widthM: nextTpl.widthM,
            depthM: nextTpl.depthM,
            phase: String(values.phase ?? 'Phase 1'),
            costEstimate: midCost(nextType),
            infrastructureReqs: [...nextTpl.infrastructureReqs],
          });
        },
        onCancel: () => deleteStructure(id),
      });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Structure tool">
      <span className={css.title}>Structure</span>
      <span className={css.hint}>
        Drop a point — pick type (cabin / yurt / earthship / greenhouse /
        prayer space / well / solar array / …), phase, and rotation.
      </span>
    </div>
  );
}
