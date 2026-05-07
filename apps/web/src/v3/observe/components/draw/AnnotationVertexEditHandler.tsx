/**
 * AnnotationVertexEditHandler — mounts a dedicated MapboxDraw instance in
 * `direct_select` mode when the steward has selected exactly one
 * line/polygon annotation. The user can drag vertices; on `draw.update`
 * the new geometry is patched back into the owning namespace store via
 * `writeLineString` / `writePolygon`.
 *
 * Why a separate MapboxDraw instance from the placement tools? The 14
 * placement tools each spin up their own short-lived MapboxDraw via
 * `useMapboxDrawTool` and unmount on tool-exit. Vertex edit lives outside
 * that lifecycle — it engages from the SelectionFloater, not the tools
 * panel — and only when no placement tool is active (we gate on
 * `useMapToolStore.activeTool` to avoid two MapboxDraw controls fighting
 * over the canvas).
 *
 * Esc / selection clear / unmount → remove the control gracefully.
 */

import { useEffect } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { useObserveSelectionStore } from '../../../../store/observeSelectionStore.js';
import { useMapToolStore } from '../measure/useMapToolStore.js';
import {
  LINESTRING_KINDS,
  POLYGON_KINDS,
  readLineString,
  readPolygon,
  writeLineString,
  writePolygon,
} from './annotationGeometryRegistry.js';

interface Props {
  map: MaplibreMap;
}

interface DrawUpdateEvent {
  features?: GeoJSON.Feature[];
  action?: string;
}

export default function AnnotationVertexEditHandler({ map }: Props) {
  const selected = useObserveSelectionStore((s) => s.selected);
  const clear = useObserveSelectionStore((s) => s.clear);
  const activeTool = useMapToolStore((s) => s.activeTool);

  useEffect(() => {
    if (!map) return;
    // Single-selection only.
    if (selected.length !== 1) return;
    const sole = selected[0];
    if (!sole) return;
    const isLine = LINESTRING_KINDS.has(sole.kind);
    const isPoly = POLYGON_KINDS.has(sole.kind);
    if (!isLine && !isPoly) return;
    // Don't fight a placement tool — that tool already owns a MapboxDraw.
    if (activeTool && activeTool.startsWith('observe.')) return;

    const { kind, id } = sole;

    // Pull the current geometry. Bail if the record vanished between
    // selection and effect run.
    const initialGeom: GeoJSON.LineString | GeoJSON.Polygon | null = isLine
      ? readLineString(kind, id)
      : readPolygon(kind, id);
    if (!initialGeom) return;

    const draw = new MapboxDraw({ displayControlsDefault: false, controls: {} });
    map.addControl(draw);

    const featureId = `vertex-edit-${kind}-${id}`;
    const featureToAdd: GeoJSON.Feature = {
      id: featureId,
      type: 'Feature',
      properties: {},
      geometry: initialGeom,
    };
    try {
      draw.add(featureToAdd);
      // direct_select takes a featureId option; types are loose.
      (
        draw.changeMode as (mode: string, opts?: { featureId: string }) => unknown
      )('direct_select', { featureId });
    } catch {
      // If the geometry happens to be malformed (e.g. polygon with <3
      // points after a botched migration), MapboxDraw will throw — bail
      // cleanly without leaving the control attached.
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
      if (isLine && geom.type === 'LineString') {
        writeLineString(kind, id, geom);
      } else if (isPoly && geom.type === 'Polygon') {
        writePolygon(kind, id, geom);
      }
    };

    // MapboxDraw events are typed loosely on the maplibre map; cast through.
    (map as unknown as {
      on: (ev: string, h: (e: DrawUpdateEvent) => void) => void;
      off: (ev: string, h: (e: DrawUpdateEvent) => void) => void;
    }).on('draw.update', onUpdate);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const target = document.activeElement;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      clear();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      (map as unknown as {
        off: (ev: string, h: (e: DrawUpdateEvent) => void) => void;
      }).off('draw.update', onUpdate);
      try {
        map.removeControl(draw);
      } catch {
        /* map disposed */
      }
    };
  }, [map, selected, activeTool, clear]);

  return null;
}
