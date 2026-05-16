/**
 * useMapCursor — single source of truth for the map cursor across Plan
 * (Current + Vision Layout) and Observe stages.
 *
 * Priority (top wins):
 *   1. drawArmed → 'crosshair'
 *   2. mapCursorIntentStore.intent ('grabbing' | 'move' | 'grab') — the
 *      imperative channel feature drag/hover code uses instead of writing
 *      the canvas itself, so this hook stays the only cursor writer.
 *   3. select + hovering selectable feature → 'pointer'
 *   4. select → 'crosshair'
 *   5. pan + hovering selectable feature (not dragging) → 'pointer'
 *   6. pan + mouse down → 'grabbing'
 *   7. pan → 'grab'
 *
 * MapLibre re-applies its own cursor on every `mousemove`, so we re-write
 * ours on `mousemove` (and on the matching mouse-down/up) to win the race.
 *
 * Hovering is detected internally — we `queryRenderedFeatures` on
 * `mousemove` against a known list of interactive layer-id prefixes so
 * the hover affordance works for design elements, plan-data features,
 * Observe annotations, and Built-Environment entities without each layer
 * having to wire it up.
 */

import { useEffect } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useMapCursorIntentStore } from './mapCursorIntentStore.js';

export type CursorMode = 'pan' | 'select';

interface Opts {
  drawArmed: boolean;
  mode: CursorMode;
  /**
   * Optional external hover flag — when truthy, forces 'pointer' in select
   * mode regardless of internal detection. Kept for back-compat with
   * VisionLayoutCanvas's existing onHoverChange wiring; new call sites can
   * omit it and rely on the internal feature probe.
   */
  hovering?: boolean;
}

/** Layer-id prefixes considered "selectable" — hover here flips to pointer. */
const INTERACTIVE_LAYER_PREFIXES = [
  'design-el-',
  'plan-data-',
  'observe-annot-',
  'obs-annot-',
  'be-v2-',
  // Plan-stage scheduled-move badges (PlanScheduledMovesOverlay). Clickable
  // → opens the edit form; the hover-pointer affordance is computed here
  // instead of the overlay writing the canvas itself.
  'plan-scheduled-moves-',
];

interface HostProps {
  map: MaplibreMap | null;
  drawArmed: boolean;
  mode: CursorMode;
  hovering?: boolean;
}

/**
 * Invisible host component — mounts the cursor effect inside a map render-prop
 * tree. Shared between VisionLayoutCanvas, PlanLayout (Current view), and
 * ObserveLayout so cursor priority is consistent across all stages.
 */
export function MapCursorHost({ map, drawArmed, mode, hovering }: HostProps) {
  useMapCursor(map, { drawArmed, mode, hovering });
  return null;
}

export function useMapCursor(map: MaplibreMap | null, opts: Opts): void {
  const { drawArmed, mode, hovering: externalHovering } = opts;

  useEffect(() => {
    if (!map) return;
    const canvas = map.getCanvas();
    const prev = canvas.style.cursor;

    let isDown = false;
    let internalHover = false;

    const isInteractiveLayer = (id: string) =>
      INTERACTIVE_LAYER_PREFIXES.some((p) => id.startsWith(p));

    const probeHover = (point: { x: number; y: number }): boolean => {
      try {
        const style = map.getStyle();
        const layerIds = (style?.layers ?? [])
          .map((l) => l.id)
          .filter(isInteractiveLayer)
          .filter((id) => map.getLayer(id));
        if (layerIds.length === 0) return false;
        const feats = map.queryRenderedFeatures(point as maplibregl.PointLike, {
          layers: layerIds,
        });
        return feats.length > 0;
      } catch {
        return false;
      }
    };

    const compute = () => {
      if (drawArmed) return 'crosshair';
      // Imperative affordance channel — feature drag/hover code declares
      // 'grabbing'/'move'/'grab' here rather than writing the canvas, so
      // this hook remains the sole writer. Beats hover/pan/select below.
      const intent = useMapCursorIntentStore.getState().intent;
      if (intent) return intent;
      const hov = externalHovering || internalHover;
      if (mode === 'select') {
        return hov ? 'pointer' : 'crosshair';
      }
      // pan — pointer over an interactive feature (the universal "this is
      // clickable" affordance), unless actively dragging the map.
      if (hov && !isDown) return 'pointer';
      return isDown ? 'grabbing' : 'grab';
    };

    const apply = () => {
      try {
        const c = compute();
        if (c) {
          // !important — MapLibre's internal handlers (dragPan, etc.) write
          // `canvas.style.cursor` on every mousemove/down/up. Setting with
          // `important` priority pins ours so we don't have to outrace them.
          canvas.style.setProperty('cursor', c, 'important');
        } else {
          canvas.style.removeProperty('cursor');
        }
      } catch {
        /* canvas disposed */
      }
    };

    const onMove = (e: { point: { x: number; y: number } }) => {
      // Probe whenever the answer can change the cursor — in select OR pan
      // mode (pan shows a pointer over interactive features), without an
      // external hover override and not while draw is armed.
      if (!drawArmed && !externalHovering) {
        const next = probeHover(e.point);
        if (next !== internalHover) {
          internalHover = next;
        }
      }
      apply();
    };

    const onDown = () => {
      if (mode !== 'pan' || drawArmed) return;
      isDown = true;
      apply();
    };
    const onUp = () => {
      if (!isDown) return;
      isDown = false;
      apply();
    };

    // Re-assert immediately whenever anything else rewrites the canvas
    // cursor. `useMapCursor` previously only re-applied on map `mousemove`
    // (+ down/up), but the ~30 ad-hoc writers in PlanDataLayers, the draw
    // tools, mapbox-gl-draw, and AnnotationDrag/SectorHandles set
    // `canvas.style.cursor = ''` (or bare values) on click / dblclick /
    // mouseup / keydown / cleanup — events with NO following map
    // `mousemove`. `= ''` strips our `!important` declaration, so the
    // canvas falls back to MapLibre's container `grab` and stays there
    // until the user happens to move the mouse again (the reported
    // "flashes the right cursor then reverts to the open hand while
    // drawing"). Watching the `style` attribute closes that gap
    // regardless of which event the clobber rode in on. The equality
    // guard makes our own `apply()` write a no-op for the observer, so
    // there is no feedback loop.
    let observer: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        const c = compute();
        if (c && canvas.style.getPropertyValue('cursor') !== c) apply();
      });
      observer.observe(canvas, {
        attributes: true,
        attributeFilter: ['style'],
      });
    }

    // Re-apply when the imperative intent changes. Hover-enter/leave and
    // drag start/end fire on layer events with no following map
    // `mousemove`, so the intent slot wouldn't otherwise be picked up
    // until the next pointer move (the same gap the observer closes for
    // external writes). The equality guard in `apply()` is implicit — a
    // no-op write is harmless and the observer ignores it.
    const unsubIntent = useMapCursorIntentStore.subscribe(() => apply());

    apply();
    map.on('mousemove', onMove);
    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);

    return () => {
      try {
        map.off('mousemove', onMove);
      } catch {
        /* map disposed */
      }
      observer?.disconnect();
      unsubIntent();
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      try {
        canvas.style.removeProperty('cursor');
        if (prev) canvas.style.cursor = prev;
      } catch {
        /* canvas disposed */
      }
    };
  }, [map, drawArmed, mode, externalHovering]);
}
