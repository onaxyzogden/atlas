/**
 * AnnotationVertexEditHandler — Observe-stage composition of
 * `SharedVertexEditHandler`. Wires Observe's selection store + the
 * line/polygon dispatch from `annotationGeometryRegistry` into the shared
 * MapboxDraw `direct_select` lifecycle.
 *
 * Why a separate MapboxDraw instance from the placement tools? The 14
 * placement tools each spin up their own short-lived MapboxDraw via
 * `useMapboxDrawTool` and unmount on tool-exit. Vertex edit lives outside
 * that lifecycle — it engages from the SelectionFloater, not the tools
 * panel — and only when no Observe placement tool is active (gate on
 * `useMapToolStore.activeTool` to avoid two MapboxDraw controls fighting
 * over the canvas).
 *
 * Observe's gate policy: only `observe.*` tools block — Plan tools (which
 * may not even exist in the same map context, but defensively) shouldn't
 * suppress Observe vertex edits.
 */

import { useMemo } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useObserveSelectionStore } from '../../../../store/observeSelectionStore.js';
import {
  LINESTRING_KINDS,
  POLYGON_KINDS,
  readLineString,
  readPolygon,
  writeLineString,
  writePolygon,
} from './annotationGeometryRegistry.js';
import type { AnnotationKind } from './annotationFieldSchemas.js';
import SharedVertexEditHandler, {
  type VertexEditDispatch,
  type VertexEditTarget,
} from '../../../builtEnvironment/handlers/SharedVertexEditHandler.js';

interface Props {
  map: MaplibreMap;
}

export default function AnnotationVertexEditHandler({ map }: Props) {
  const selected = useObserveSelectionStore((s) => s.selected);
  const clear = useObserveSelectionStore((s) => s.clear);

  // Single-selection only; first-and-only entry becomes the vertex-edit target.
  const target: VertexEditTarget | null =
    selected.length === 1 && selected[0]
      ? { kind: selected[0].kind, id: selected[0].id }
      : null;

  const dispatch = useMemo<VertexEditDispatch>(
    () => ({
      featureIdPrefix: 'vertex-edit',
      shouldSuppressForTool: (activeTool) =>
        activeTool != null && activeTool.startsWith('observe.'),
      geometryKindFor: (kind) => {
        const k = kind as AnnotationKind;
        if (LINESTRING_KINDS.has(k)) return 'line';
        if (POLYGON_KINDS.has(k)) return 'polygon';
        return null;
      },
      readLine: (kind, id) => readLineString(kind as AnnotationKind, id),
      readPolygon: (kind, id) => readPolygon(kind as AnnotationKind, id),
      writeLine: (kind, id, geom) => writeLineString(kind as AnnotationKind, id, geom),
      writePolygon: (kind, id, geom) => writePolygon(kind as AnnotationKind, id, geom),
    }),
    [],
  );

  return (
    <SharedVertexEditHandler
      map={map}
      target={target}
      onClear={clear}
      dispatch={dispatch}
    />
  );
}
