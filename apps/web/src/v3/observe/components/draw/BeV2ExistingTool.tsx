/**
 * BeV2ExistingTool — generic Built-Environment placement tool that writes
 * directly to `useBuiltEnvironmentStoreV2` with `state: 'existing'`.
 *
 * Phase 5.2.A: surfaces the 23 BE kinds in the Observe rail that don't have
 * bespoke tools (cabin, yurt, prayer-pavilion, barn, greenhouse, …). The
 * 8 originally-Observe kinds (building/well/septic/power-line/buried-utility/
 * fence/gate/driveway) keep their bespoke `*Tool.tsx` files so their
 * subtype/depthM/areaM2/etc. metadata continues to be authored via the
 * slide-up form on create. Those legacy tools persist through V1 facades
 * which already write to V2 (Phase 3).
 *
 * Geometry mode is read from the kind registry — point kinds get
 * `draw_point`, line kinds `draw_line_string`, polygon kinds `draw_polygon`.
 *
 * Post-place: no slide-up. The entity appears immediately on the map; users
 * can rename / annotate via the floating popover (Phase 4.4) by clicking the
 * placed feature. A V2-existing edit-schema builder for these 23 kinds is
 * Phase 5.2.B.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import { useBuiltEnvironmentStoreV2 } from '../../../../store/builtEnvironmentStoreV2.js';
import { useCustomDrawSelectionStore } from '../../../../store/customDrawSelectionStore.js';
import {
  getBuiltEnvironmentKind,
  type BuiltEnvironmentGeometryType,
  type BuiltEnvironmentState,
} from '@ogden/shared';
import {
  useMapboxDrawTool,
  type DrawMode,
  type DrawGeometry,
} from './useMapboxDrawTool.js';
import DrawAreaReadout from './DrawAreaReadout.js';
import DrawLengthReadout from './DrawLengthReadout.js';
import {
  useDimensionDrawStore,
  useDimensionValues,
} from '../../../plan/draw/dimensionDrawStore.js';
import { useDimensionDrawTool } from '../../../plan/draw/useDimensionDrawTool.js';
import DimensionPanel from '../../../plan/draw/DimensionPanel.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
  /** Canonical kind id from `BUILT_ENVIRONMENT_KINDS`. */
  kind: string;
  /** Default 'existing' (Observe). Plan rail passes 'proposed'. */
  state?: BuiltEnvironmentState;
}

const GEOM_TO_MODE: Readonly<Record<BuiltEnvironmentGeometryType, DrawMode>> = {
  point: 'draw_point',
  line: 'draw_line_string',
  polygon: 'draw_polygon',
};

const GEOM_TO_HINT: Readonly<Record<BuiltEnvironmentGeometryType, string>> = {
  point: 'Click on the map to drop the marker.',
  line: 'Trace the line (Freehand) or set Length / Bearing (Dimensions).',
  polygon:
    'Outline the footprint (Freehand) or set Width × Depth / Radius (Dimensions).',
};

export default function BeV2ExistingTool({
  map,
  projectId,
  kind,
  state = 'existing',
}: Props) {
  const spec = getBuiltEnvironmentKind(kind);

  const mode: DrawMode = spec ? GEOM_TO_MODE[spec.geometryType] : 'draw_point';
  const isPoint = !spec || spec.geometryType === 'point';
  const isLine = spec?.geometryType === 'line';
  const isPolygon = spec?.geometryType === 'polygon';

  const dimMode = useDimensionDrawStore((s) => s.mode);
  const dimShape = useDimensionDrawStore((s) => s.shape);
  const dimValues = useDimensionValues();

  const place = (geom: DrawGeometry) => {
    if (!spec) return;
    // Geometry constraint: useBuiltEnvironmentStoreV2.create asserts the
    // GeoJSON type matches the registry's geometryType. We've already
    // selected `mode` from the registry so this is enforced upstream.
    // Phase 6: when placing a `custom-glb`, stamp the active customModelId
    // from `customDrawSelectionStore` so the scenegraph layer can resolve
    // the right blob URL at render time.
    const customId =
      spec.kind === 'custom-glb'
        ? useCustomDrawSelectionStore.getState().activeCustomModelId
        : null;
    useBuiltEnvironmentStoreV2.getState().create({
      projectId,
      kind: spec.kind,
      state,
      geometry: geom,
      ...(customId ? { proposed: { customModelId: customId } } : {}),
    });
  };

  const { liveArea, liveLength } = useMapboxDrawTool<DrawGeometry>({
    map,
    mode,
    enabled: isPoint || dimMode === 'freehand',
    onComplete: place,
  });

  useDimensionDrawTool({
    map,
    shape: isLine ? 'line' : dimShape === 'circle' ? 'circle' : 'rect',
    values: dimValues,
    enabled: !isPoint && dimMode === 'dimensions',
    onComplete: (geom) => place(geom as DrawGeometry),
  });

  if (!spec) {
    return (
      <div className={css.popover} role="dialog" aria-label={kind}>
        <span className={css.title}>{kind}</span>
        <span className={css.hint}>Unknown built-environment kind.</span>
      </div>
    );
  }

  return (
    <div className={css.popover} role="dialog" aria-label={spec.label}>
      <span className={css.title}>{spec.label}</span>
      <span className={css.hint}>{GEOM_TO_HINT[spec.geometryType]}</span>
      {isPolygon && <DimensionPanel allowedShapes={['rect', 'circle']} />}
      {isLine && <DimensionPanel allowedShapes={['line']} />}
      {isPolygon && liveArea !== null && (
        <div className={css.readout}>
          <DrawAreaReadout
            m2={liveArea}
            labelClassName={css.readoutLabel}
            valueClassName={css.readoutValue}
          />
        </div>
      )}
      {isLine && liveLength !== null && (
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
