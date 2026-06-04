/**
 * WaterSwaleTool — line → swale WaterNode (Plan Module 2).
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import type { SnapTargets } from '../../../lib/snapPoint.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { usePhaseFieldSpec } from '../usePhaseFieldSpec.js';
import { useEnterpriseFieldSpec } from '../useEnterpriseFieldSpec.js';
import { useDimensionDrawStore, useDimensionValues } from '../dimensionDrawStore.js';
import { useDimensionDrawTool } from '../useDimensionDrawTool.js';
import DimensionPanel from '../DimensionPanel.js';
import {
  checkUtilityConflicts,
  depthTriggersVeto,
} from '../../utils/utilityConflicts.js';
import { useUtilityConflictStore } from '../utilityConflictStore.js';
import DrawLengthReadout from '../../../observe/components/draw/DrawLengthReadout.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

/** Approximate swale excavation depth — drives the utility-veto gate. */
const SWALE_DEPTH_CM = 60;

interface Props {
  map: MaplibreMap;
  projectId: string;
  getSnapTargets?: () => SnapTargets;
}

export default function WaterSwaleTool({ map, projectId, getSnapTargets }: Props) {
  const addWaterNode = useWaterSystemsStore((s) => s.addWaterNode);
  const updateWaterNode = useWaterSystemsStore((s) => s.updateWaterNode);
  const removeWaterNode = useWaterSystemsStore((s) => s.removeWaterNode);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);
  const { field: enterpriseField, defaultValue: enterpriseDefault } = useEnterpriseFieldSpec(projectId);
  const dimMode = useDimensionDrawStore((s) => s.mode);
  const dimValues = useDimensionValues();

  const handleComplete = (geom: GeoJSON.LineString) => {
      const id = newAnnotationId('wn-w');
      const lengthM = turf.length(turf.feature(geom), { units: 'kilometers' }) * 1000;
      const coords = geom.coordinates;
      const midIdx = Math.floor(coords.length / 2);
      const anchor = coords[midIdx] as [number, number];

      const conflicts = depthTriggersVeto(SWALE_DEPTH_CM)
        ? checkUtilityConflicts(geom, projectId)
        : [];

      const proceed = (extras: {
        utilityConflicts?: { id: string; kind: string }[];
        utilityAcknowledgment?: string;
      }) => {
        addWaterNode({
          id,
          projectId,
          name: 'Swale',
          kind: 'swale',
          center: anchor,
          swaleGeometry: geom,
          swaleLengthM: lengthM,
          swaleWidthM: 0.6,
          swaleDepthM: 0.4,
          overflowToNodeId: null,
          phase: phaseDefault || undefined,
          createdAt: new Date().toISOString(),
          ...extras,
        });
        openInlineForm(anchor);
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
            /* user declined — geom already discarded by useMapboxDrawTool */
          },
        });
        return;
      }

      proceed({});

      function openInlineForm(_anchor: [number, number]) {
        openForm({
        title: 'Swale',
        anchor,
        fields: [
          {
            key: 'swaleLengthM',
            label: 'Length',
            kind: 'number',
            readonly: true,
            suffix: 'm',
          },
          {
            key: 'swaleWidthM',
            label: 'Width',
            kind: 'number',
            required: true,
            suffix: 'm',
          },
          {
            key: 'swaleDepthM',
            label: 'Depth',
            kind: 'number',
            required: true,
            suffix: 'm',
          },
          phaseField,
          enterpriseField,
        ],
        initial: {
          swaleLengthM: Math.round(lengthM * 10) / 10,
          swaleWidthM: 0.6,
          swaleDepthM: 0.4,
          phase: phaseDefault,
          enterprise: enterpriseDefault,
        },
        onSave: (values) => {
          const w = Number(values.swaleWidthM);
          const d = Number(values.swaleDepthM);
          updateWaterNode(id, {
            swaleWidthM: Number.isFinite(w) ? w : undefined,
            swaleDepthM: Number.isFinite(d) ? d : undefined,
            phase: String(values.phase ?? '') || undefined,
            enterprise: String(values.enterprise ?? '') || undefined,
          });
        },
        onCancel: () => removeWaterNode(id),
      });
      }
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
    <div className={css.popover} role="dialog" aria-label="Swale tool">
      <span className={css.title}>Swale</span>
      <span className={css.hint}>
        Trace the swale line on contour — confirm width and depth in the popover.
      </span>
      <DimensionPanel allowedShapes={['line']} />
    </div>
  );
}
