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
  line: 'Click to add vertices, double-click to finish.',
  polygon: 'Outline the footprint. Double-click to finish.',
};

export default function BeV2ExistingTool({
  map,
  projectId,
  kind,
  state = 'existing',
}: Props) {
  const spec = getBuiltEnvironmentKind(kind);

  const mode: DrawMode = spec ? GEOM_TO_MODE[spec.geometryType] : 'draw_point';

  const { liveArea, liveLength } = useMapboxDrawTool<DrawGeometry>({
    map,
    mode,
    onComplete: (geom) => {
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
    },
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
      {spec.geometryType === 'polygon' && liveArea !== null && (
        <div className={css.readout}>
          <DrawAreaReadout
            m2={liveArea}
            labelClassName={css.readoutLabel}
            valueClassName={css.readoutValue}
          />
        </div>
      )}
      {spec.geometryType === 'line' && liveLength !== null && (
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
