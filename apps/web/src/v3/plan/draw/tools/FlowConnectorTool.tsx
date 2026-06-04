/**
 * FlowConnectorTool — directed line → MaterialFlow (Plan Tier B / B3).
 *
 * Stewards trace a flow line from source to sink and pick what kind of
 * material moves along it (compost / manure / mulch / water / grain /
 * energy / other). The geometry's start point is the source; the end
 * point is the sink — the renderer paints arrowheads along the line so
 * direction reads at a glance. Lives under `soil-fertility` in the PLAN
 * toolbar.
 *
 * Per #59: the From/To pickers bind the drawn line to structured
 * endpoints (zones / structures / crops / fertility / paddocks / water
 * systems / guilds) so a canvas-drawn flow earns closed-loop credit in
 * `ClosedLoopGraphCard`, not just free-text labels.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  useClosedLoopStore,
  MATERIAL_KIND_CONFIG,
  type MaterialFlow,
  type MaterialKind,
} from '../../../../store/closedLoopStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useFlowEndpointOptions } from '../../../../features/plan/useFlowEndpointOptions.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import { usePlanSnapTargets } from './usePlanSnapTargets.js';
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
  parcelBoundary?: GeoJSON.Polygon;
}

const KIND_OPTIONS: { value: MaterialKind; label: string }[] = (
  Object.keys(MATERIAL_KIND_CONFIG) as MaterialKind[]
).map((k) => ({ value: k, label: MATERIAL_KIND_CONFIG[k].label }));

export default function FlowConnectorTool({ map, projectId, parcelBoundary }: Props) {
  const getSnapTargets = usePlanSnapTargets(projectId, parcelBoundary);
  const addFlow = useClosedLoopStore((s) => s.addMaterialFlow);
  const updateFlow = useClosedLoopStore((s) => s.updateMaterialFlow);
  const removeFlow = useClosedLoopStore((s) => s.removeMaterialFlow);
  const endpointOptions = useFlowEndpointOptions(projectId);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);
  const { field: enterpriseField, defaultValue: enterpriseDefault } =
    useEnterpriseFieldSpec(projectId);
  const dimMode = useDimensionDrawStore((s) => s.mode);
  const dimValues = useDimensionValues();

  const endpointSelect = [
    { value: '', label: '— none —' },
    ...endpointOptions.map((o) => ({ value: o.id, label: o.label })),
  ];
  const labelFor = (id: string): string | undefined =>
    endpointOptions.find((o) => o.id === id)?.label;

  const handleComplete = (geom: GeoJSON.LineString) => {
      const id = newAnnotationId('flow');
      const coords = geom.coordinates;
      const midIdx = Math.floor(coords.length / 2);
      const anchor = coords[midIdx] as [number, number];
      const now = new Date().toISOString();
      const materialKind: MaterialKind = 'compost';

      addFlow({
        id,
        projectId,
        label: `${MATERIAL_KIND_CONFIG[materialKind].label} flow`,
        materialKind,
        sourceId: null,
        sinkId: null,
        origin: 'canvas',
        geometry: geom,
        color: MATERIAL_KIND_CONFIG[materialKind].color,
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
            key: 'label',
            label: 'Name',
            kind: 'text',
            required: true,
            placeholder: 'e.g., Kitchen → orchard compost',
          },
          {
            key: 'materialKind',
            label: 'Flow',
            kind: 'select',
            required: true,
            options: KIND_OPTIONS,
          },
          {
            key: 'sourceId',
            label: 'From',
            kind: 'select',
            options: endpointSelect,
          },
          {
            key: 'sinkId',
            label: 'To',
            kind: 'select',
            options: endpointSelect,
          },
          phaseField,
          enterpriseField,
        ],
        initial: {
          label: `${MATERIAL_KIND_CONFIG[materialKind].label} flow`,
          materialKind,
          sourceId: '',
          sinkId: '',
          phase: phaseDefault,
          enterprise: enterpriseDefault,
        },
        onSave: (values) => {
          const nextKind = values.materialKind as MaterialKind;
          const sourceId = String(values.sourceId ?? '') || null;
          const sinkId = String(values.sinkId ?? '') || null;
          const patch: Partial<MaterialFlow> = {
            label:
              String(values.label ?? '').trim() ||
              `${MATERIAL_KIND_CONFIG[nextKind].label} flow`,
            materialKind: nextKind,
            color: MATERIAL_KIND_CONFIG[nextKind].color,
            sourceId,
            sinkId,
            sourceLabel: sourceId ? labelFor(sourceId) : undefined,
            sinkLabel: sinkId ? labelFor(sinkId) : undefined,
            phase: String(values.phase ?? '') || undefined,
            enterprise: String(values.enterprise ?? '') || undefined,
          };
          updateFlow(id, patch);
        },
        onCancel: () => removeFlow(id),
      });
    };

  const { liveLength } = useMapboxDrawTool<GeoJSON.LineString>({
    map,
    mode: 'draw_line_string',
    onComplete: handleComplete,
    enabled: dimMode === 'freehand',
    snap: true,
    getSnapTargets,
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
        manure, mulch, water, grain, energy) and bind its From/To to
        site features so it earns closed-loop credit.
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
