/**
 * WaterCatchmentTool — polygon → catchment WaterNode (Plan Module 2).
 *
 * Persist-first: on draw.create, we add a skeleton catchment with surface
 * default 'metal_roof' and the computed area, then open the inline popover
 * for the steward to confirm/adjust. Cancel removes the just-created node.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  useWaterSystemsStore,
  type CatchmentSurface,
} from '../../../../store/waterSystemsStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { usePhaseFieldSpec } from '../usePhaseFieldSpec.js';
import { useEnterpriseFieldSpec } from '../useEnterpriseFieldSpec.js';
import { DEFAULT_COEFF, SURFACE_LABEL } from '../../cards/water-management/waterMath.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const SURFACE_OPTIONS: { value: CatchmentSurface; label: string }[] = (
  Object.keys(SURFACE_LABEL) as CatchmentSurface[]
).map((k) => ({ value: k, label: SURFACE_LABEL[k] }));

export default function WaterCatchmentTool({ map, projectId }: Props) {
  const addWaterNode = useWaterSystemsStore((s) => s.addWaterNode);
  const updateWaterNode = useWaterSystemsStore((s) => s.updateWaterNode);
  const removeWaterNode = useWaterSystemsStore((s) => s.removeWaterNode);
  const openForm = useInlineFormStore((s) => s.open);
  const closeForm = useInlineFormStore((s) => s.close);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);
  const { field: enterpriseField, defaultValue: enterpriseDefault } = useEnterpriseFieldSpec(projectId);

  useMapboxDrawTool<GeoJSON.Polygon>({
    map,
    mode: 'draw_polygon',
    onComplete: (geom) => {
      const id = newAnnotationId('wn-c');
      const areaM2 = turf.area(geom);
      const centroid = turf.centroid(geom).geometry.coordinates as [number, number];
      const surface: CatchmentSurface = 'metal_roof';
      addWaterNode({
        id,
        projectId,
        name: 'Catchment',
        kind: 'catchment',
        center: centroid,
        geometry: geom,
        surface,
        areaM2,
        runoffCoeff: DEFAULT_COEFF[surface],
        overflowToNodeId: null,
        phase: phaseDefault || undefined,
        createdAt: new Date().toISOString(),
      });

      openForm({
        title: 'Catchment',
        anchor: centroid,
        fields: [
          {
            key: 'surface',
            label: 'Surface',
            kind: 'select',
            required: true,
            options: SURFACE_OPTIONS,
          },
          {
            key: 'areaM2',
            label: 'Area',
            kind: 'number',
            readonly: true,
            suffix: 'm²',
          },
          {
            key: 'runoffCoeff',
            label: 'Runoff coeff',
            kind: 'number',
            required: true,
          },
          phaseField,
          enterpriseField,
        ],
        initial: {
          surface,
          areaM2: Math.round(areaM2),
          runoffCoeff: DEFAULT_COEFF[surface],
          phase: phaseDefault,
          enterprise: enterpriseDefault,
        },
        onSave: (values) => {
          const nextSurface = values.surface as CatchmentSurface;
          const nextCoeffRaw = values.runoffCoeff;
          const runoffCoeff =
            typeof nextCoeffRaw === 'number'
              ? nextCoeffRaw
              : Number(nextCoeffRaw);
          updateWaterNode(id, {
            surface: nextSurface,
            runoffCoeff: Number.isFinite(runoffCoeff)
              ? runoffCoeff
              : DEFAULT_COEFF[nextSurface],
            phase: String(values.phase ?? '') || undefined,
            enterprise: String(values.enterprise ?? '') || undefined,
          });
        },
        onCancel: () => removeWaterNode(id),
      });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Catchment tool">
      <span className={css.title}>Catchment</span>
      <span className={css.hint}>
        Outline a runoff surface (roof, pasture, gravel) — a small form will
        confirm surface and coefficient.
      </span>
      <button
        type="button"
        className={css.secondaryBtn}
        onClick={() => closeForm()}
      >
        Hide hint
      </button>
    </div>
  );
}
