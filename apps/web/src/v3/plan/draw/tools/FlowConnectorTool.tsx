/**
 * FlowConnectorTool — directed line → FlowConnector (Plan Tier B / B3).
 *
 * Stewards trace a flow line from source to sink and pick what kind of
 * material moves along it (compost / manure / mulch / water / grain /
 * energy / other). The geometry's start point is the source; the end
 * point is the sink — the renderer paints arrowheads along the line so
 * direction reads at a glance. Lives under `soil-fertility` in the PLAN
 * toolbar.
 *
 * v1: free-draw line, no auto-snap to fertility infra. Endpoints can be
 * labelled with free text via the popover so the steward can describe
 * the loop ("kitchen scraps" → "compost tumbler" → "orchard guild")
 * even when the geometry only loosely tracks the underlying features.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  useFlowConnectorStore,
  FLOW_KIND_CONFIG,
  type FlowKind,
} from '../../../../store/flowConnectorStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { usePhaseFieldSpec } from '../usePhaseFieldSpec.js';
import { useEnterpriseFieldSpec } from '../useEnterpriseFieldSpec.js';
import { useDimensionDrawStore, useDimensionValues } from '../dimensionDrawStore.js';
import { useDimensionDrawTool } from '../useDimensionDrawTool.js';
import DimensionPanel from '../DimensionPanel.js';
import DrawLengthReadout from '../../../observe/components/draw/DrawLengthReadout.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const KIND_OPTIONS: { value: FlowKind; label: string }[] = (
  Object.keys(FLOW_KIND_CONFIG) as FlowKind[]
).map((k) => ({ value: k, label: FLOW_KIND_CONFIG[k].label }));

export default function FlowConnectorTool({ map, projectId }: Props) {
  const addConnector = useFlowConnectorStore((s) => s.addConnector);
  const updateConnector = useFlowConnectorStore((s) => s.updateConnector);
  const deleteConnector = useFlowConnectorStore((s) => s.deleteConnector);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);
  const { field: enterpriseField, defaultValue: enterpriseDefault } =
    useEnterpriseFieldSpec(projectId);
  const dimMode = useDimensionDrawStore((s) => s.mode);
  const dimValues = useDimensionValues();

  const handleComplete = (geom: GeoJSON.LineString) => {
      const id = newAnnotationId('flow');
      const coords = geom.coordinates;
      const midIdx = Math.floor(coords.length / 2);
      const anchor = coords[midIdx] as [number, number];
      const now = new Date().toISOString();
      const flowKind: FlowKind = 'compost';

      addConnector({
        id,
        projectId,
        name: `${FLOW_KIND_CONFIG[flowKind].label} flow`,
        flowKind,
        geometry: geom,
        color: FLOW_KIND_CONFIG[flowKind].color,
        notes: '',
        phase: phaseDefault || undefined,
        createdAt: now,
        updatedAt: now,
      });

      openForm({
        title: 'Flow connector',
        anchor,
        fields: [
          {
            key: 'name',
            label: 'Name',
            kind: 'text',
            required: true,
            placeholder: 'e.g., Kitchen → orchard compost',
          },
          {
            key: 'flowKind',
            label: 'Flow',
            kind: 'select',
            required: true,
            options: KIND_OPTIONS,
          },
          {
            key: 'fromName',
            label: 'From',
            kind: 'text',
            placeholder: 'e.g., Kitchen scraps',
          },
          {
            key: 'toName',
            label: 'To',
            kind: 'text',
            placeholder: 'e.g., Orchard guild',
          },
          phaseField,
          enterpriseField,
        ],
        initial: {
          name: `${FLOW_KIND_CONFIG[flowKind].label} flow`,
          flowKind,
          fromName: '',
          toName: '',
          phase: phaseDefault,
          enterprise: enterpriseDefault,
        },
        onSave: (values) => {
          const nextKind = values.flowKind as FlowKind;
          updateConnector(id, {
            name:
              String(values.name ?? '').trim() ||
              `${FLOW_KIND_CONFIG[nextKind].label} flow`,
            flowKind: nextKind,
            color: FLOW_KIND_CONFIG[nextKind].color,
            fromName: String(values.fromName ?? '').trim() || undefined,
            toName: String(values.toName ?? '').trim() || undefined,
            phase: String(values.phase ?? '') || undefined,
            enterprise: String(values.enterprise ?? '') || undefined,
          });
        },
        onCancel: () => deleteConnector(id),
      });
    };

  const { liveLength } = useMapboxDrawTool<GeoJSON.LineString>({
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
    <div className={css.popover} role="dialog" aria-label="Flow connector tool">
      <span className={css.title}>Flow connector</span>
      <span className={css.hint}>
        Draw a directed line from source to sink. The renderer paints
        arrowheads along the line — pick what flows on it (compost,
        manure, mulch, water, grain, energy).
      </span>
      <DimensionPanel allowedShapes={['line']} />
      {liveLength !== null && (
        <div className={css.readout}>
          <DrawLengthReadout
            meters={liveLength}
            labelClassName={css.readoutLabel}
            valueClassName={css.readoutValue}
          />
        </div>
      )}
    </div>
  );
}
