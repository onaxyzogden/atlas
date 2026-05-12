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
import {
  checkUtilityConflicts,
  depthTriggersVeto,
} from '../../utils/utilityConflicts.js';
import { useUtilityConflictStore } from '../../draw/utilityConflictStore.js';
import { usePlanView } from '../../PlanViewContext.js';

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

/** Anchor used by the utility-conflict dialog popover. */
function geometryAnchor(geom: DrawGeometry): [number, number] | null {
  try {
    if (geom.type === 'Point') return geom.coordinates as [number, number];
    if (geom.type === 'LineString') {
      const coords = geom.coordinates;
      if (coords.length === 0) return null;
      const mid = coords[Math.floor(coords.length / 2)];
      return mid as [number, number];
    }
    // Polygon: use turf centroid.
    const c = turf.centroid(turf.feature(geom)).geometry.coordinates;
    return c as [number, number];
  } catch {
    return null;
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
  const currentView = usePlanView();

  const handleComplete = useCallback(
    (geom: DrawGeometry) => {
      if (!spec) return;
      const acreage =
        geom.type === 'Polygon' ? polygonAcres(geom) : undefined;
      const sameKindCount = list.filter((e) => e.kind === kind).length;
      const label = `${spec.label} ${nextLetter(sameKindCount)}`;

      // Buried-utility safety check — ADR 2026-05-10-plan-earthwork-
      // utility-veto. Kinds with `earthworkDepthCm > 30` (pond 200,
      // swale 60, road 40 today) route through the soft-veto dialog
      // when their geometry intersects a 3 m buffer around any
      // OBSERVE-recorded BuriedUtility.
      const conflicts = depthTriggersVeto(spec.earthworkDepthCm)
        ? checkUtilityConflicts(geom, projectId)
        : [];

      const persist = (extras: {
        utilityConflicts?: { id: string; kind: string }[];
        utilityAcknowledgment?: string;
      }) => {
        add(projectId, {
          id: `de-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          category: spec.category,
          kind: spec.kind,
          geometry: geom,
          phase: spec.phase,
          label,
          acreage,
          createdAt: new Date().toISOString(),
          view: currentView,
          ...extras,
        });
        onComplete?.();
      };

      if (conflicts.length > 0) {
        const anchor = geometryAnchor(geom);
        if (anchor) {
          useUtilityConflictStore.getState().open({
            conflicts,
            anchor,
            onConfirm: (ack) =>
              persist({
                utilityConflicts: conflicts.map((c) => ({ id: c.id, kind: c.kind })),
                utilityAcknowledgment: ack,
              }),
            onCancel: () => {
              // Steward declined — MapboxDraw has already cleared the
              // in-progress polygon; clearing activeKind via onComplete
              // lets the palette disarm cleanly.
              onComplete?.();
            },
          });
          return;
        }
        // Anchor failed (degenerate geometry) — fall through and
        // persist without the gate rather than block the draw.
      }

      persist({});
    },
    [spec, list, kind, projectId, add, onComplete, currentView],
  );

  useMapboxDrawTool({
    map,
    mode: spec?.drawMode ?? 'draw_point',
    onComplete: handleComplete,
  });
}
