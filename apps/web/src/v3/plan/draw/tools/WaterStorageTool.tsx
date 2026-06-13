/**
 * WaterStorageTool — point → storage WaterNode (Plan Module 2).
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  useWaterSystemsStore,
  type StorageNodeKind,
} from '../../../../store/waterSystemsStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import type { SnapTargets } from '../../../lib/snapPoint.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { usePhaseFieldSpec } from '../usePhaseFieldSpec.js';
import { useEnterpriseFieldSpec } from '../useEnterpriseFieldSpec.js';
import { STORAGE_LABEL } from '../../cards/water-management/waterMath.js';
import { gatePlacement } from '../../validation/placementGate.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

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

const STORAGE_OPTIONS: { value: StorageNodeKind; label: string }[] = (
  Object.keys(STORAGE_LABEL) as StorageNodeKind[]
).map((k) => ({ value: k, label: STORAGE_LABEL[k] }));

export default function WaterStorageTool({ map, projectId, sourceObjectiveId, parcelBoundary, getSnapTargets }: Props) {
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
      const id = newAnnotationId('wn-s');
      const anchor = geom.coordinates as [number, number];
      const storageKind: StorageNodeKind = 'cistern';

      // Placement gate BEFORE the skeleton record (block → no record, no
      // form; cancelled warn dialog likewise).
      const gate = await gatePlacement(geom, { kind: 'storage', category: 'water' }, {
        projectId,
        anchor,
        boundary: parcelBoundary ?? null,
      });
      if (!gate.ok) return;

      addWaterNode({
        id,
        projectId,
        sourceObjectiveId: sourceObjectiveId ?? undefined,
        name: 'Storage',
        kind: 'storage',
        center: anchor,
        storageKind,
        capacityL: 0,
        overflowToNodeId: null,
        phase: phaseDefault || undefined,
        ...(gate.acknowledgments ? { placementAcknowledgments: gate.acknowledgments } : {}),
        createdAt: new Date().toISOString(),
      });

      openForm({
        title: 'Storage',
        anchor,
        fields: [
          {
            key: 'storageKind',
            label: 'Type',
            kind: 'select',
            required: true,
            options: STORAGE_OPTIONS,
          },
          {
            key: 'capacityL',
            label: 'Capacity',
            kind: 'number',
            required: true,
            suffix: 'L',
          },
          {
            key: 'householdLpd',
            label: 'Household use',
            kind: 'number',
            suffix: 'L/day',
            placeholder: 'e.g. 600',
          },
          {
            key: 'daysOffGrid',
            label: 'Off-grid days',
            kind: 'number',
            suffix: 'd',
            placeholder: 'e.g. 7',
          },
          phaseField,
          enterpriseField,
        ],
        initial: {
          storageKind,
          capacityL: '',
          householdLpd: '',
          daysOffGrid: '',
          phase: phaseDefault,
          enterprise: enterpriseDefault,
        },
        onSave: (values) => {
          const cap =
            typeof values.capacityL === 'number'
              ? values.capacityL
              : Number(values.capacityL);
          const hh =
            typeof values.householdLpd === 'number'
              ? values.householdLpd
              : Number(values.householdLpd);
          const dog =
            typeof values.daysOffGrid === 'number'
              ? values.daysOffGrid
              : Number(values.daysOffGrid);
          updateWaterNode(id, {
            storageKind: values.storageKind as StorageNodeKind,
            capacityL: Number.isFinite(cap) ? cap : 0,
            householdLpd: Number.isFinite(hh) && hh > 0 ? hh : undefined,
            daysOffGrid: Number.isFinite(dog) && dog > 0 ? dog : undefined,
            phase: String(values.phase ?? '') || undefined,
            enterprise: String(values.enterprise ?? '') || undefined,
          });
        },
        onCancel: () => removeWaterNode(id),
      });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Storage tool">
      <span className={css.title}>Storage</span>
      <span className={css.hint}>
        Drop a point — pick the storage type and capacity in the popover.
      </span>
    </div>
  );
}
