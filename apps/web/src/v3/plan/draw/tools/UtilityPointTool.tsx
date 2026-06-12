/**
 * UtilityPointTool — point → typed utility `point` design_feature (Plan
 * Module: Structures & Subsystems).
 *
 * Reaches the C2 typed-promotion of `utilityStore` (`ogden-utilities`), which
 * had no Plan draw tool until C4. Per the 2026-05-22 canonical-ownership
 * decision, this tool offers ONLY the 11 utility types with no Built-
 * Environment equivalent. The 4 BE-overlapping kinds (solar array, water
 * tank, well/pump, septic) are authored via the `be.*` tools instead, so the
 * two surfaces never duplicate. See
 * wiki/decisions/2026-05-22-atlas-canonical-feature-ownership-c4.md.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  useUtilityStore,
  UTILITY_TYPE_CONFIG,
  type UtilityType,
  type Utility,
} from '../../../../store/utilityStore.js';
import { UTILITY_POINT_TYPE_OPTIONS } from './utilityPointTypes.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { usePhaseFieldSpec } from '../usePhaseFieldSpec.js';
import { gatePlacement } from '../../validation/placementGate.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
  /** Parcel boundary for the placement gate's containment rule. */
  parcelBoundary?: GeoJSON.Polygon;
}

const DEFAULT_TYPE: UtilityType = 'rain_catchment';

export default function UtilityPointTool({ map, projectId, parcelBoundary }: Props) {
  const addUtility = useUtilityStore((s) => s.addUtility);
  const updateUtility = useUtilityStore((s) => s.updateUtility);
  const deleteUtility = useUtilityStore((s) => s.deleteUtility);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    onComplete: async (geom) => {
      const id = crypto.randomUUID();
      const center = geom.coordinates as [number, number];
      const now = new Date().toISOString();

      // Placement gate BEFORE the skeleton record (block → no record, no
      // form). Gates as the create-time default kind ('rain_catchment');
      // this tool only offers the 11 non-BE utility types, so the
      // well/septic block rules never apply here — those kinds are
      // authored via the be.* tools (canonical-ownership ADR 2026-05-22).
      const gate = await gatePlacement(geom, { kind: DEFAULT_TYPE, category: 'utility' }, {
        projectId,
        anchor: center,
        boundary: parcelBoundary ?? null,
      });
      if (!gate.ok) return;

      const draft: Utility = {
        id,
        projectId,
        name: UTILITY_TYPE_CONFIG[DEFAULT_TYPE].label,
        type: DEFAULT_TYPE,
        center,
        phase: phaseDefault,
        notes: '',
        ...(gate.acknowledgments ? { placementAcknowledgments: gate.acknowledgments } : {}),
        createdAt: now,
        updatedAt: now,
      };
      addUtility(draft);

      openForm({
        title: 'Utility point',
        anchor: center,
        fields: [
          {
            key: 'type',
            label: 'Type',
            kind: 'select',
            required: true,
            options: UTILITY_POINT_TYPE_OPTIONS,
          },
          {
            key: 'name',
            label: 'Name',
            kind: 'text',
            required: true,
          },
          {
            key: 'demandKwhPerDay',
            label: 'Energy demand',
            kind: 'number',
            suffix: 'kWh/day',
            placeholder: 'e.g. 4',
          },
          {
            key: 'capacityGal',
            label: 'Storage capacity',
            kind: 'number',
            suffix: 'gal',
            placeholder: 'e.g. 250',
          },
          phaseField,
        ],
        initial: {
          type: DEFAULT_TYPE,
          name: UTILITY_TYPE_CONFIG[DEFAULT_TYPE].label,
          demandKwhPerDay: '',
          capacityGal: '',
          phase: phaseDefault,
        },
        onValuesChange: (next, prev, changed) => {
          // When the steward picks a type, autofill the name if they have not
          // edited it away from the previous type's default label.
          if (changed.key !== 'type') return null;
          const prevType = prev.type as UtilityType;
          const prevDefaultName = UTILITY_TYPE_CONFIG[prevType]?.label ?? '';
          if (String(next.name ?? '').trim() === prevDefaultName) {
            const nextType = changed.value as UtilityType;
            return { name: UTILITY_TYPE_CONFIG[nextType]?.label ?? '' };
          }
          return null;
        },
        onSave: (values) => {
          const type = (values.type as UtilityType) ?? DEFAULT_TYPE;
          const demand = Number(values.demandKwhPerDay);
          const cap = Number(values.capacityGal);
          updateUtility(id, {
            type,
            name: String(values.name ?? '').trim() || UTILITY_TYPE_CONFIG[type].label,
            phase: String(values.phase ?? ''),
            demandKwhPerDay:
              Number.isFinite(demand) && demand > 0 ? demand : undefined,
            capacityGal: Number.isFinite(cap) && cap > 0 ? cap : undefined,
          });
        },
        onCancel: () => deleteUtility(id),
      });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Utility point tool">
      <span className={css.title}>Utility point</span>
      <span className={css.hint}>
        Drop a point — pick the utility type and details in the popover.
      </span>
    </div>
  );
}
