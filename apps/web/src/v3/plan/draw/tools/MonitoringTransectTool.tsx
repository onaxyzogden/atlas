/**
 * MonitoringTransectTool — line → MonitoringTransect (Plan Tier B / B4).
 *
 * Stewards trace a fixed walking line they will return to on a regular
 * cadence (weekly / monthly / quarterly / yearly / one-off) to record
 * observations of invasives, indicator species, soil conditions, water
 * quality, or wildlife. Lives under `principle-verification` in the
 * PLAN toolbar — Holmgren principle 1 ("Observe and interact") is the
 * direct ancestor; B5 ecological notes are the point analogue.
 *
 * The popover captures essentials at draw time (name + monitoring kind
 * + cadence). The full observation log is appended later via the edit
 * popover or a dedicated reading card; for v1 the log starts empty.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  useMonitoringTransectStore,
  TRANSECT_MONITORING_CONFIG,
  TRANSECT_CADENCE_LABEL,
  type TransectMonitoringKind,
  type TransectCadence,
} from '../../../../store/monitoringTransectStore.js';
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

const KIND_OPTIONS: { value: TransectMonitoringKind; label: string }[] = (
  Object.keys(TRANSECT_MONITORING_CONFIG) as TransectMonitoringKind[]
).map((k) => ({ value: k, label: TRANSECT_MONITORING_CONFIG[k].label }));

const CADENCE_OPTIONS: { value: TransectCadence; label: string }[] = (
  Object.keys(TRANSECT_CADENCE_LABEL) as TransectCadence[]
).map((c) => ({ value: c, label: TRANSECT_CADENCE_LABEL[c] }));

export default function MonitoringTransectTool({ map, projectId }: Props) {
  const addTransect = useMonitoringTransectStore((s) => s.addTransect);
  const updateTransect = useMonitoringTransectStore((s) => s.updateTransect);
  const deleteTransect = useMonitoringTransectStore((s) => s.deleteTransect);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);
  const { field: enterpriseField, defaultValue: enterpriseDefault } =
    useEnterpriseFieldSpec(projectId);
  const dimMode = useDimensionDrawStore((s) => s.mode);
  const dimValues = useDimensionValues();

  const handleComplete = (geom: GeoJSON.LineString) => {
      const id = newAnnotationId('transect');
      const coords = geom.coordinates;
      const midIdx = Math.floor(coords.length / 2);
      const anchor = coords[midIdx] as [number, number];
      const now = new Date().toISOString();
      const monitoringKind: TransectMonitoringKind = 'invasives';
      const cadence: TransectCadence = 'monthly';

      addTransect({
        id,
        projectId,
        name: `${TRANSECT_MONITORING_CONFIG[monitoringKind].label} transect`,
        monitoringKind,
        geometry: geom,
        color: TRANSECT_MONITORING_CONFIG[monitoringKind].color,
        cadence,
        observations: [],
        notes: '',
        phase: phaseDefault || undefined,
        createdAt: now,
        updatedAt: now,
      });

      openForm({
        title: 'Monitoring transect',
        anchor,
        fields: [
          {
            key: 'name',
            label: 'Name',
            kind: 'text',
            required: true,
            placeholder: 'e.g., North fence-line invasives',
          },
          {
            key: 'monitoringKind',
            label: 'Tracking',
            kind: 'select',
            required: true,
            options: KIND_OPTIONS,
          },
          {
            key: 'cadence',
            label: 'Cadence',
            kind: 'select',
            required: true,
            options: CADENCE_OPTIONS,
          },
          phaseField,
          enterpriseField,
        ],
        initial: {
          name: `${TRANSECT_MONITORING_CONFIG[monitoringKind].label} transect`,
          monitoringKind,
          cadence,
          phase: phaseDefault,
          enterprise: enterpriseDefault,
        },
        onSave: (values) => {
          const nextKind = values.monitoringKind as TransectMonitoringKind;
          const nextCadence = values.cadence as TransectCadence;
          updateTransect(id, {
            name:
              String(values.name ?? '').trim() ||
              `${TRANSECT_MONITORING_CONFIG[nextKind].label} transect`,
            monitoringKind: nextKind,
            color: TRANSECT_MONITORING_CONFIG[nextKind].color,
            cadence: nextCadence,
            phase: String(values.phase ?? '') || undefined,
            enterprise: String(values.enterprise ?? '') || undefined,
          });
        },
        onCancel: () => deleteTransect(id),
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
    <div className={css.popover} role="dialog" aria-label="Monitoring transect tool">
      <span className={css.title}>Monitoring transect</span>
      <span className={css.hint}>
        Trace the line you'll walk on a regular cadence — invasives,
        indicator species, soil, water, or wildlife. Observations land in
        the transect's log on each return visit.
      </span>
      <DimensionPanel allowedShapes={['line']} />
    </div>
  );
}
