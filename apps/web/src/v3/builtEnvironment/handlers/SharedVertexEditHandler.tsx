/**
 * SharedVertexEditHandler — stage-agnostic MapboxDraw `direct_select`
 * lifecycle for vertex editing. Both Plan (`PlanVertexEditHandler`) and
 * Observe (`AnnotationVertexEditHandler`) compose this with a small
 * dispatch table that resolves their stage-specific stores.
 *
 * Lifecycle (identical to the two callers it replaces):
 *   1. When `target` becomes set → mount a fresh MapboxDraw, seed it with
 *      the current geometry, switch into `direct_select`.
 *   2. On `draw.update` → call `dispatch.writeLine` / `dispatch.writePolygon`.
 *   3. On Esc / target cleared / unmount → remove the control.
 *
 * Activation is gated by `dispatch.shouldSuppressForTool(activeTool)` so
 * Plan's "any tool blocks" and Observe's "only `observe.*` tools block"
 * policies coexist without changes here.
 */

import { useEffect } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { MAPLIBRE_DRAW_STYLES } from '../../observe/components/draw/mapboxDrawStyles.js';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';

export interface VertexEditTarget {
  kind: string;
  id: string;
}

export type VertexGeometryKind = 'line' | 'polygon';

export interface VertexEditDispatch {
  /**
   * Returns 'line' or 'polygon' if this kind is editable, null otherwise.
   * Driving the gate by kind (not by selection layer-id) lets Observe's
   * full taxonomy + Plan's polygon kinds share the same handler.
   */
  geometryKindFor: (kind: string) => VertexGeometryKind | null;
  /** Returns the current LineString geometry for (kind,id) or null. */
  readLine: (kind: string, id: string) => GeoJSON.LineString | null;
  /** Returns the current Polygon geometry for (kind,id) or null. */
  readPolygon: (kind: string, id: string) => GeoJSON.Polygon | null;
  /** Persists a new LineString to the owning store. */
  writeLine: (kind: string, id: string, geom: GeoJSON.LineString) => void;
  /** Persists a new Polygon to the owning store (incl. any side effects). */
  writePolygon: (kind: string, id: string, geom: GeoJSON.Polygon) => void;
  /** True when an active draw tool is in flight and we must stand down. */
  shouldSuppressForTool: (activeTool: string | null) => boolean;
  /** A short token used in the synthetic MapboxDraw featureId (debug only). */
  featureIdPrefix: string;
}

interface DrawUpdateEvent {
  features?: GeoJSON.Feature[];
  action?: string;
}

interface Props {
  map: MaplibreMap;
  target: VertexEditTarget | null;
  /** Called when the user presses Esc inside the map (not in a form field). */
  onClear: () => void;
  dispatch: VertexEditDispatch;
}

export default function SharedVertexEditHandler({
  map,
  target,
  onClear,
  dispatch,
}: Props) {
  const activeTool = useMapToolStore((s) => s.activeTool);

  useEffect(() => {
    if (!map) return;
    if (!target) return;
    if (dispatch.shouldSuppressForTool(activeTool)) return;

    const { kind, id } = target;
    const geomKind = dispatch.geometryKindFor(kind);
    if (!geomKind) return;

    const initial: GeoJSON.LineString | GeoJSON.Polygon | null =
      geomKind === 'line' ? dispatch.readLine(kind, id) : dispatch.readPolygon(kind, id);
    if (!initial) return;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: MAPLIBRE_DRAW_STYLES,
    });
    map.addControl(draw);

    const featureId = `${dispatch.featureIdPrefix}-${kind}-${id}`;
    const feature: GeoJSON.Feature = {
      id: featureId,
      type: 'Feature',
      properties: {},
      geometry: initial,
    };
    try {
      draw.add(feature);
      (
        draw.changeMode as (mode: string, opts?: { featureId: string }) => unknown
      )('direct_select', { featureId });
    } catch {
      // Malformed geometry (e.g. polygon with <3 points after a botched
      // migration) — bail cleanly without leaving the control attached.
      try {
        map.removeControl(draw);
      } catch {
        /* ignore */
      }
      return;
    }

    const onUpdate = (e: DrawUpdateEvent) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const geom = feat.geometry;
      if (geomKind === 'line' && geom.type === 'LineString') {
        dispatch.writeLine(kind, id, geom);
      } else if (geomKind === 'polygon' && geom.type === 'Polygon') {
        dispatch.writePolygon(kind, id, geom);
      }
    };
    (
      map as unknown as {
        on: (ev: string, h: (e: DrawUpdateEvent) => void) => void;
      }
    ).on('draw.update', onUpdate);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const focused = document.activeElement;
      const tag = focused?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      onClear();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      (
        map as unknown as {
          off: (ev: string, h: (e: DrawUpdateEvent) => void) => void;
        }
      ).off('draw.update', onUpdate);
      try {
        map.removeControl(draw);
      } catch {
        /* map disposed */
      }
    };
  }, [map, target, activeTool, dispatch, onClear]);

  return null;
}
