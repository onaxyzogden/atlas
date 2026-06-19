/**
 * Plan3DSelectionHandler — lightweight click-to-select wiring for the Plan
 * stage's Vision / Phase / Terrain3D canvases.
 *
 * The standard 2D editing surface (`PlanDataLayers` with `editable=true`)
 * registers drag-translate + inline-edit popovers for every selectable
 * Plan kind. Under a pitched 3D camera those drag affordances feel wrong
 * (translating polygons under perspective scrambles the operator's
 * spatial intuition) and the inline popovers crowd the design canvas.
 *
 * This handler does ONLY what 3D needs:
 *   - left-click on a Plan feature → `setSelection([{ kind, id }])`
 *     (or `toggle` on shift-click)
 *   - left-click on empty map → `setSelection([])`
 *
 * Pair with `<PlanDataLayers editable={false}>` so the polygons render
 * without their drag handlers, and `<PlanSelectionFloater>` so the
 * Delete / Edit-vertices / Clear toolbar appears on selection.
 */

import { useEffect } from 'react';
import { maplibregl } from '../../../lib/maplibre.js';
import {
  usePlanSelectionStore,
  type PlanSelectionKind,
} from '../../../store/planSelectionStore.js';

const LAYER_PREFIX = 'plan-data-';

/**
 * Layer-id → PlanSelectionKind. Mirrors the kind-mapping logic scattered
 * across `PlanDataLayers`'s click handlers; centralised here because in
 * 3D we don't have layer-specific click handlers to read `kind` from the
 * feature properties.
 */
const SELECTABLE_LAYERS = [
  `${LAYER_PREFIX}poly-fill`,
  `${LAYER_PREFIX}line`,
  `${LAYER_PREFIX}point`,
  `${LAYER_PREFIX}flow-line`,
  `${LAYER_PREFIX}flow-arrow`,
  `${LAYER_PREFIX}transect-line`,
  `${LAYER_PREFIX}setback-fill`,
  `${LAYER_PREFIX}setback-line`,
];

// Design elements (plant systems, springs, roads, turnarounds) render via
// `DesignElementLayers` under the `design-el-` prefix and own their OWN
// selection lifecycle: a `mousedown` on one sets the selection (with its
// `projectId`) and arms drag-translate. Those layers are intentionally NOT in
// `SELECTABLE_LAYERS` above — this handler must not re-select them. But it must
// also not CLEAR them: a click that lands on a design element has to leave the
// `mousedown`-set selection intact, otherwise the edit toolbar vanishes on
// release. We query these only to detect that case and bail (mirrors the
// design-el guard already present in `PlanDataLayers.onBgClick`).
const DESIGN_EL_LAYERS = [
  'design-el-poly-fill',
  'design-el-line',
  'design-el-point',
];

function mapKindToSelectionKind(
  kind: string | undefined,
): PlanSelectionKind | null {
  if (!kind) return null;
  // `water_catchment` is the polygon kind on `poly-fill`; the selection
  //  store rolls it up under `water` (same lookup target).
  if (kind === 'water_catchment') return 'water';
  if (kind === 'fence-line') return null; // not selectable in 3D
  const ALLOWED: ReadonlySet<string> = new Set([
    'guild',
    'zone',
    'crop',
    'paddock',
    'path',
    'structure',
    'fertility',
    'water',
    'utility',
    'setback',
    'flow',
    'transect',
  ]);
  return ALLOWED.has(kind) ? (kind as PlanSelectionKind) : null;
}

interface Props {
  map: maplibregl.Map;
}

export default function Plan3DSelectionHandler({ map }: Props) {
  useEffect(() => {
    if (!map) return;
    const onClick = (e: maplibregl.MapMouseEvent) => {
      // A click that lands on a design element is owned by DesignElementLayers
      // (it selected on `mousedown`). Bail without touching the store so the
      // freshly-set selection — and its edit toolbar — survives the release.
      const designPresent = DESIGN_EL_LAYERS.filter((id) => map.getLayer(id));
      if (designPresent.length > 0) {
        let designHits: maplibregl.MapGeoJSONFeature[] = [];
        try {
          designHits = map.queryRenderedFeatures(e.point, {
            layers: designPresent,
          });
        } catch {
          /* query unavailable — fall through to plan-data handling */
        }
        if (designHits.length > 0) return;
      }
      const present = SELECTABLE_LAYERS.filter((id) => map.getLayer(id));
      if (present.length === 0) return;
      let features: maplibregl.MapGeoJSONFeature[] = [];
      try {
        features = map.queryRenderedFeatures(e.point, { layers: present });
      } catch {
        return;
      }
      if (features.length === 0) {
        usePlanSelectionStore.getState().set([]);
        return;
      }
      const f = features[0];
      if (!f) return;
      const rawKind = f.properties?.kind;
      const kind = mapKindToSelectionKind(
        typeof rawKind === 'string' ? rawKind : undefined,
      );
      const id = f.properties?.id;
      if (!kind || typeof id !== 'string') return;
      const selItem = { kind, id };
      if (e.originalEvent.shiftKey) {
        usePlanSelectionStore.getState().toggle(selItem);
      } else {
        usePlanSelectionStore.getState().set([selItem]);
      }
    };
    map.on('click', onClick);
    return () => {
      try {
        map.off('click', onClick);
      } catch {
        /* map already disposed */
      }
    };
  }, [map]);

  return null;
}
