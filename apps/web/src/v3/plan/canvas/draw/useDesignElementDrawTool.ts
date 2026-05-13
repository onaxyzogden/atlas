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
  addDesignElement,
  getDesignElementsForProject,
} from '../../../../store/builtEnvironmentSelectors.js';
import {
  findElementSpec,
  type DesignElementSpec,
} from '../elementCatalog.js';
import {
  checkUtilityConflicts,
  depthTriggersVeto,
} from '../../utils/utilityConflicts.js';
import { useUtilityConflictStore } from '../../draw/utilityConflictStore.js';
import { usePlanView } from '../../PlanViewContext.js';
import { useContinuousPointDrawTool } from './useContinuousPointDrawTool.js';

interface Args {
  map: MaplibreMap;
  projectId: string;
  /** Active element kind from the palette (e.g., 'paddock'). */
  kind: string;
  /** Called once after a successful draw + persist; canvas uses to clear active. */
  onComplete?: () => void;
  /**
   * Project parcel boundary, when known. Used as the spacing-snap
   * outer clip — clicks outside it are rejected with reason
   * "Outside parcel boundary". Omit to skip the parcel-boundary check
   * (per-tree spacing still applies).
   */
  parcelBoundary?: GeoJSON.Polygon;
}

/** Validate a candidate point placement against parcel boundary + same-
 *  category spacing. Returns the first violation reason, or `{ ok: true }`. */
function validatePlacement(
  lngLat: [number, number],
  spec: DesignElementSpec,
  projectId: string,
  parcelBoundary: GeoJSON.Polygon | undefined,
): { ok: true } | { ok: false; reason: string } {
  if (parcelBoundary) {
    const inside = turf.booleanPointInPolygon(
      turf.point(lngLat),
      turf.feature(parcelBoundary),
    );
    if (!inside) return { ok: false, reason: 'Outside parcel boundary' };
  }
  const radiusM = spec.defaultSpacingM;
  if (radiusM && radiusM > 0) {
    const neighbours = getDesignElementsForProject(projectId).filter(
      (e) =>
        e.category === spec.category &&
        e.geometry.type === 'Point',
    );
    for (const n of neighbours) {
      const coords = (n.geometry as GeoJSON.Point).coordinates as [
        number,
        number,
      ];
      const d = turf.distance(lngLat, coords, { units: 'meters' });
      if (d < radiusM) {
        return {
          ok: false,
          reason: `Too close to existing ${n.label}`,
        };
      }
    }
  }
  return { ok: true };
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
  parcelBoundary,
}: Args) {
  const spec = findElementSpec(kind);
  const currentView = usePlanView();

  const handleComplete = useCallback(
    (geom: DrawGeometry) => {
      if (!spec) return;
      const acreage =
        geom.type === 'Polygon' ? polygonAcres(geom) : undefined;
      // Read live count from the store on every placement so continuous-
      // point mode increments labels (A → B → C…) without depending on
      // React render timing.
      const sameKindCount = getDesignElementsForProject(projectId).filter(
        (e) => e.kind === kind,
      ).length;
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
        addDesignElement(projectId, {
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
    [spec, kind, projectId, onComplete, currentView],
  );

  // Continuous-point flow for trees and other point design elements:
  // every single click drops another, double-click (or Esc) exits.
  // Polygon / line kinds keep the existing one-shot MapboxDraw flow,
  // since dblclick already means "finish polygon" there.
  const isPoint = (spec?.drawMode ?? 'draw_point') === 'draw_point';

  // Spacing snap: only for point kinds with a `defaultSpacingM` in the
  // catalog (today: oak / pine / apple / shrub). Non-spacing point kinds
  // skip the ring + validation entirely.
  const spacing =
    isPoint && spec?.defaultSpacingM
      ? {
          radiusM: spec.defaultSpacingM,
          validate: (lngLat: [number, number]) =>
            validatePlacement(lngLat, spec, projectId, parcelBoundary),
        }
      : undefined;

  useContinuousPointDrawTool({
    map,
    enabled: isPoint,
    onPlace: useCallback(
      (lngLat: [number, number]) => {
        handleComplete({ type: 'Point', coordinates: lngLat });
      },
      [handleComplete],
    ),
    onExit: useCallback(() => {
      onComplete?.();
    }, [onComplete]),
    spacing,
  });

  useMapboxDrawTool({
    map,
    mode: spec?.drawMode ?? 'draw_point',
    onComplete: handleComplete,
    enabled: !isPoint,
  });
}
