/**
 * UtilityRunTool — line → UtilityRun (Plan Tier B / B1).
 *
 * Stewards trace a trench / cable / line and pick its kind (water,
 * septic, power, data). Lives under `structures-subsystems` in the
 * PLAN toolbar.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  useUtilityRunStore,
  UTILITY_RUN_CONFIG,
  type UtilityRunKind,
} from '../../../../store/utilityRunStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { usePhaseFieldSpec } from '../usePhaseFieldSpec.js';
import { useEnterpriseFieldSpec } from '../useEnterpriseFieldSpec.js';
import { useDimensionDrawStore, useDimensionValues } from '../dimensionDrawStore.js';
import { useDimensionDrawTool } from '../useDimensionDrawTool.js';
import DimensionPanel from '../DimensionPanel.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const KIND_OPTIONS: { value: UtilityRunKind; label: string }[] = (
  Object.keys(UTILITY_RUN_CONFIG) as UtilityRunKind[]
).map((k) => ({ value: k, label: UTILITY_RUN_CONFIG[k].label }));

export default function UtilityRunTool({ map, projectId }: Props) {
  const addRun = useUtilityRunStore((s) => s.addRun);
  const updateRun = useUtilityRunStore((s) => s.updateRun);
  const deleteRun = useUtilityRunStore((s) => s.deleteRun);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);
  const { field: enterpriseField, defaultValue: enterpriseDefault } = useEnterpriseFieldSpec(projectId);
  const dimMode = useDimensionDrawStore((s) => s.mode);
  const dimValues = useDimensionValues();

  const handleComplete = (geom: GeoJSON.LineString) => {
      const id = newAnnotationId('utility');
      const lengthM = turf.length(turf.feature(geom), { units: 'kilometers' }) * 1000;
      const coords = geom.coordinates;
      const midIdx = Math.floor(coords.length / 2);
      const anchor = coords[midIdx] as [number, number];
      const now = new Date().toISOString();
      const kind: UtilityRunKind = 'water';

      addRun({
        id,
        projectId,
        name: UTILITY_RUN_CONFIG[kind].label,
        kind,
        color: UTILITY_RUN_CONFIG[kind].color,
        geometry: geom,
        lengthM,
        notes: '',
        phase: phaseDefault || undefined,
        createdAt: now,
        updatedAt: now,
      });

      openForm({
        title: 'Utility run',
        anchor,
        fields: [
          {
            key: 'name',
            label: 'Name',
            kind: 'text',
            required: true,
            placeholder: 'e.g., Cabin cluster water main',
          },
          {
            key: 'kind',
            label: 'Kind',
            kind: 'select',
            required: true,
            options: KIND_OPTIONS,
          },
          phaseField,
          enterpriseField,
        ],
        initial: {
          name: UTILITY_RUN_CONFIG[kind].label,
          kind,
          phase: phaseDefault,
          enterprise: enterpriseDefault,
        },
        onSave: (values) => {
          const nextKind = values.kind as UtilityRunKind;
          updateRun(id, {
            name: String(values.name ?? UTILITY_RUN_CONFIG[nextKind].label),
            kind: nextKind,
            color: UTILITY_RUN_CONFIG[nextKind].color,
            phase: String(values.phase ?? '') || undefined,
            enterprise: String(values.enterprise ?? '') || undefined,
          });
        },
        onCancel: () => deleteRun(id),
      });
    };

  useMapboxDrawTool<GeoJSON.LineString>({
    map,
    mode: 'draw_line_string',
    onComplete: handleComplete,
    enabled: dimMode === 'freehand',
  });

  useDimensionDrawTool({
    map,
    shape: 'line',
    values: dimValues,
    enabled: dimMode === 'dimensions',
    onComplete: (geom) => handleComplete(geom as GeoJSON.LineString),
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Utility run tool">
      <span className={css.title}>Utility run</span>
      <span className={css.hint}>
        Trace a trench / cable line — pick its kind (water, septic, power, data).
      </span>
      <DimensionPanel allowedShapes={['line']} />
    </div>
  );
}
