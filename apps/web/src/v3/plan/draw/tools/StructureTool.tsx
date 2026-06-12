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
import { getBuiltEnvironmentKind } from '@ogden/shared';
import type { StructureType } from '@ogden/shared';
import {
  addStructure,
  updateStructure,
  removeStructure,
} from '../../../../store/builtEnvironmentSelectors.js';
import {
  STRUCTURE_TEMPLATES,
  createFootprintPolygon,
} from '../../../../features/structures/footprints.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { usePhaseFieldSpec } from '../usePhaseFieldSpec.js';
import { useEnterpriseFieldSpec } from '../useEnterpriseFieldSpec.js';
import { useDimensionDrawStore, useDimensionValues } from '../dimensionDrawStore.js';
import { useDimensionDrawTool } from '../useDimensionDrawTool.js';
import DimensionPanel from '../DimensionPanel.js';
import * as turf from '@turf/turf';
import { gatePlacement } from '../../validation/placementGate.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
  /** Parcel boundary for the placement gate's containment rule. */
  parcelBoundary?: GeoJSON.Polygon;
}

// Order: dwellings → gathering / spiritual → agricultural → utility /
// infrastructure. Mirrors the FootprintTemplate.category ordering so the
// popover dropdown reads top-down by Yeomans rank-5 (dwellings) then
// rank-6 (subsystems).
//
// Phase 5.3 (BE V2 unification): labels are derived from the canonical
// `BUILT_ENVIRONMENT_KINDS` registry via `getBuiltEnvironmentKind`, which
// resolves the legacy snake_case StructureType ids through the registry's
// alias map (e.g. `prayer_space` → `prayer-pavilion`, `storage` → `shed`).
// The `value` (snake_case) is preserved so the structureStore facade keeps
// its V1-shape API; only the human-facing label is unified.
// `STRUCTURE_TEMPLATES.label` remains the fallback so a future kind id that
// is not yet aliased renders something sensible rather than the raw id.
const STRUCTURE_TYPE_ORDER: readonly StructureType[] = [
  'cabin',
  'yurt',
  'earthship',
  'tent_glamping',
  'pavilion',
  'classroom',
  'prayer_space',
  'bathhouse',
  'fire_circle',
  'lookout',
  'greenhouse',
  'barn',
  'animal_shelter',
  'workshop',
  'storage',
  'compost_station',
  'water_pump_house',
  'solar_array',
  'well',
  'water_tank',
];

const TYPE_OPTIONS: { value: StructureType; label: string }[] =
  STRUCTURE_TYPE_ORDER.map((value) => ({
    value,
    label:
      getBuiltEnvironmentKind(value)?.label ??
      STRUCTURE_TEMPLATES[value].label,
  }));

function midCost(type: StructureType): number {
  const [lo, hi] = STRUCTURE_TEMPLATES[type].costRange;
  return Math.round((lo + hi) / 2);
}

export default function StructureTool({ map, projectId, parcelBoundary }: Props) {
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);
  const { field: enterpriseField, defaultValue: enterpriseDefault } = useEnterpriseFieldSpec(projectId);
  const dimMode = useDimensionDrawStore((s) => s.mode);
  const dimValues = useDimensionValues();

  // Place a structure with explicit dimensions. Used by both the freehand
  // (point → template defaults) and dimensions (custom width/depth/rotation)
  // paths. Anchors the popover at the placement centre.
  const placeStructure = async (
    center: [number, number],
    widthM: number,
    depthM: number,
    rotationDeg: number,
  ) => {
    const id = newAnnotationId('str');
    const type: StructureType = 'cabin';
    const tpl = STRUCTURE_TEMPLATES[type];
    const now = new Date().toISOString();
    const footprint = createFootprintPolygon(center, widthM, depthM, rotationDeg);

    // Placement gate BEFORE the skeleton record: a block (or a cancelled
    // warn dialog) leaves no record and no form — the tool stays armed.
    // Gates with the create-time default kind ('cabin'); a type switched
    // on Save is re-gated in onSave below, because structure kinds carry
    // different block-severity rules (e.g. 'well' ↔ septic separation).
    const gate = await gatePlacement(footprint, { kind: type, category: 'structure' }, {
      projectId,
      anchor: center,
      boundary: parcelBoundary ?? null,
    });
    if (!gate.ok) return;
    const placedAcks = gate.acknowledgments;

    addStructure({
      id,
      projectId,
      name: tpl.label,
      type,
      center,
      geometry: footprint,
      rotationDeg,
      widthM,
      depthM,
      phase: phaseDefault,
      costEstimate: midCost(type),
      infrastructureReqs: [...tpl.infrastructureReqs],
      notes: '',
      ...(placedAcks ? { placementAcknowledgments: placedAcks } : {}),
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
        phaseField,
        enterpriseField,
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
        phase: phaseDefault,
        enterprise: enterpriseDefault,
        rotationDeg,
      },
      onSave: async (values) => {
        const nextType = values.type as StructureType;
        const nextTpl = STRUCTURE_TEMPLATES[nextType] ?? tpl;
        const rawRot = Number(values.rotationDeg);
        const nextRotation = Number.isFinite(rawRot)
          ? ((rawRot % 360) + 360) % 360
          : rotationDeg;
        // Preserve dim-mode dimensions when the type hasn't changed; if the
        // steward switches type, fall back to the new template's defaults.
        const typeChanged = nextType !== type;
        const nextWidth = typeChanged ? nextTpl.widthM : widthM;
        const nextDepth = typeChanged ? nextTpl.depthM : depthM;
        const geometry = createFootprintPolygon(
          center,
          nextWidth,
          nextDepth,
          nextRotation,
        );
        // Re-gate on type change only — rules are keyed by kind, and the
        // create-time gate ran as 'cabin' (e.g. switching to 'well' must
        // check the block-severity septic separation). On !ok the update
        // is NOT applied: the record keeps its create-time type, and the
        // gate's toast / cancelled dialog already told the steward why.
        let acks = placedAcks;
        if (typeChanged) {
          const regate = await gatePlacement(
            geometry,
            { kind: nextType, category: 'structure' },
            {
              projectId,
              anchor: center,
              boundary: parcelBoundary ?? null,
              excludeFeatureId: id,
            },
          );
          if (!regate.ok) return;
          if (regate.acknowledgments) {
            acks = [...(placedAcks ?? []), ...regate.acknowledgments];
          }
        }
        updateStructure(id, {
          name: String(values.name ?? nextTpl.label).trim() || nextTpl.label,
          type: nextType,
          geometry,
          rotationDeg: nextRotation,
          widthM: nextWidth,
          depthM: nextDepth,
          phase: String(values.phase ?? ''),
          enterprise: String(values.enterprise ?? '') || undefined,
          costEstimate: midCost(nextType),
          infrastructureReqs: [...nextTpl.infrastructureReqs],
          ...(acks !== placedAcks ? { placementAcknowledgments: acks } : {}),
        });
      },
      onCancel: () => removeStructure(id),
    });
  };

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    enabled: dimMode === 'freehand',
    onComplete: async (geom) => {
      const center = geom.coordinates as [number, number];
      const tpl = STRUCTURE_TEMPLATES['cabin'];
      await placeStructure(center, tpl.widthM, tpl.depthM, 0);
    },
  });

  useDimensionDrawTool({
    map,
    shape: 'rect',
    values: dimValues,
    enabled: dimMode === 'dimensions',
    onComplete: async (geom) => {
      // Dimensions hook always commits a Polygon for shape='rect'; centroid
      // becomes the structure centre.
      const polygon = geom as GeoJSON.Polygon;
      const center = turf.centroid(polygon).geometry.coordinates as [number, number];
      await placeStructure(
        center,
        dimValues.widthM,
        dimValues.depthM,
        dimValues.rotationDeg,
      );
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Structure tool">
      <span className={css.title}>Structure</span>
      <span className={css.hint}>
        Drop a point — pick type (cabin / yurt / earthship / greenhouse /
        prayer space / well / solar array / …), phase, and rotation.
      </span>
      <DimensionPanel allowedShapes={['rect']} />
    </div>
  );
}
