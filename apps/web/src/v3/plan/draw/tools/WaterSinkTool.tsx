/**
 * WaterSinkTool — point → sink WaterNode (Plan Module 2).
 *
 * Sinks have no required fields beyond a name; they absorb whatever flows in.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import type { SnapTargets } from '../../../lib/snapPoint.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { usePhaseFieldSpec } from '../usePhaseFieldSpec.js';
import { useEnterpriseFieldSpec } from '../useEnterpriseFieldSpec.js';
import {
  checkUtilityConflicts,
  depthTriggersVeto,
} from '../../utils/utilityConflicts.js';
import { useUtilityConflictStore } from '../utilityConflictStore.js';
import { gatePlacement } from '../../validation/placementGate.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

/** Approximate infiltration-bed / wetland excavation depth. */
const SINK_DEPTH_CM = 60;

interface Props {
  map: MaplibreMap;
  projectId: string;
  /** Snap-target source builder; consulted only when snapping is armed. */
  getSnapTargets?: () => SnapTargets;
  /** Plan objective active in the Act tier when this tool is armed (Phase-5 provenance stamp). */
  sourceObjectiveId?: string | null;
  /** Parcel boundary for the placement gate's containment rule. */
  parcelBoundary?: GeoJSON.Polygon;
}

export default function WaterSinkTool({ map, projectId, sourceObjectiveId, parcelBoundary, getSnapTargets }: Props) {
  const addWaterNode = useWaterSystemsStore((s) => s.addWaterNode);
  const updateWaterNode = useWaterSystemsStore((s) => s.updateWaterNode);
  const removeWaterNode = useWaterSystemsStore((s) => s.removeWaterNode);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);
  const { field: enterpriseField, defaultValue: enterpriseDefault } = useEnterpriseFieldSpec(projectId);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    snap: true,
    getSnapTargets,
    onComplete: async (geom) => {
      const id = newAnnotationId('wn-x');
      const anchor = geom.coordinates as [number, number];

      // Placement gate FIRST (block / cancelled warn → no record, no form);
      // the buried-utility veto below stays its own dialog and only runs
      // once the placement gate is clean or acknowledged.
      const gate = await gatePlacement(geom, { kind: 'sink', category: 'earthworks' }, {
        projectId,
        anchor,
        boundary: parcelBoundary ?? null,
      });
      if (!gate.ok) return;

      const conflicts = depthTriggersVeto(SINK_DEPTH_CM)
        ? checkUtilityConflicts(geom, projectId)
        : [];

      const proceed = (extras: {
        utilityConflicts?: { id: string; kind: string }[];
        utilityAcknowledgment?: string;
      }) => {
        addWaterNode({
          id,
          projectId,
          sourceObjectiveId: sourceObjectiveId ?? undefined,
          name: 'Sink',
          kind: 'sink',
          center: anchor,
          phase: phaseDefault || undefined,
          createdAt: new Date().toISOString(),
          ...(gate.acknowledgments ? { placementAcknowledgments: gate.acknowledgments } : {}),
          ...extras,
        });
        openInlineForm();
      };

      if (conflicts.length > 0) {
        useUtilityConflictStore.getState().open({
          conflicts,
          anchor,
          onConfirm: (ack) =>
            proceed({
              utilityConflicts: conflicts.map((c) => ({ id: c.id, kind: c.kind })),
              utilityAcknowledgment: ack,
            }),
          onCancel: () => {
            /* declined — geom already discarded */
          },
        });
        return;
      }

      proceed({});

      function openInlineForm() {
      openForm({
        title: 'Sink',
        anchor,
        fields: [
          {
            key: 'name',
            label: 'Name',
            kind: 'text',
            required: true,
            placeholder: 'e.g., Wetland',
          },
          phaseField,
          enterpriseField,
        ],
        initial: { name: 'Sink', phase: phaseDefault, enterprise: enterpriseDefault },
        onSave: (values) => {
          updateWaterNode(id, {
            name: String(values.name ?? 'Sink'),
            phase: String(values.phase ?? '') || undefined,
            enterprise: String(values.enterprise ?? '') || undefined,
          });
        },
        onCancel: () => removeWaterNode(id),
      });
      }
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Sink tool">
      <span className={css.title}>Sink</span>
      <span className={css.hint}>
        Drop a point where water is absorbed (wetland, dry well, infiltration
        bed).
      </span>
    </div>
  );
}
