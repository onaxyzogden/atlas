/**
 * useDesignElementDrawTool — wraps the OBSERVE useMapboxDrawTool hook so the
 * Vision-Layout canvas can drop design elements (paddocks, ponds, structures,
 * etc.) into designElementsStore.
 *
 * One MapboxDraw lifecycle per active element kind. After draw.create, we
 * compute acreage (polygons only), assign a sequential letter label per
 * element kind, and persist. The activeKind state lives in the canvas
 * component; this hook is mounted only while a kind is active.
 */

import { useCallback } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  useMapboxDrawTool,
  type DrawGeometry,
} from '../../../observe/components/draw/useMapboxDrawTool.js';
import {
  useDesignElementsStore,
  type DesignElement,
} from '../../../../store/designElementsStore.js';
import { findElementSpec } from '../elementCatalog.js';

const EMPTY_ELEMENTS: DesignElement[] = [];

interface Args {
  map: MaplibreMap;
  projectId: string;
  /** Active element kind from the palette (e.g., 'paddock'). */
  kind: string;
  /** Called once after a successful draw + persist; canvas uses to clear active. */
  onComplete?: () => void;
}

/** Convert a polygon's area to acres via turf. */
function polygonAcres(geom: GeoJSON.Polygon): number {
  try {
    return turf.area(geom) * 0.000247105;
  } catch {
    return 0;
  }
}

/** Next alphabetic suffix for a given kind: A, B, ..., Z, AA, AB, ... */
function nextLetter(n: number): string {
  let s = '';
  let i = n;
  do {
    s = String.fromCharCode(65 + (i % 26)) + s;
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return s;
}

export function useDesignElementDrawTool({
  map,
  projectId,
  kind,
  onComplete,
}: Args) {
  const spec = findElementSpec(kind);
  const add = useDesignElementsStore((s) => s.add);
  const list = useDesignElementsStore(
    (s) => s.byProject[projectId] ?? EMPTY_ELEMENTS,
  );

  const handleComplete = useCallback(
    (geom: DrawGeometry) => {
      if (!spec) return;
      const acreage =
        geom.type === 'Polygon' ? polygonAcres(geom) : undefined;
      const sameKindCount = list.filter((e) => e.kind === kind).length;
      const label = `${spec.label} ${nextLetter(sameKindCount)}`;
      add(projectId, {
        id: `de-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        category: spec.category,
        kind: spec.kind,
        geometry: geom,
        phase: spec.phase,
        label,
        acreage,
        createdAt: new Date().toISOString(),
      });
      onComplete?.();
    },
    [spec, list, kind, projectId, add, onComplete],
  );

  useMapboxDrawTool({
    map,
    mode: spec?.drawMode ?? 'draw_point',
    onComplete: handleComplete,
  });
}
