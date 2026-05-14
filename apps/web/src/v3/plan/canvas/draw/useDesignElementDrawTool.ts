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
  addDesignElements,
  getDesignElementsForProject,
} from '../../../../store/builtEnvironmentSelectors.js';
import type { DesignElement } from '../../../../store/designElementsStore.js';
import { useStampModeStore } from '../stampModeStore.js';
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
 *  category spacing. Returns the first violation reason, or `{ ok: true }`.
 *  Exported for reuse by the polygon-fill stamp path (`stampHexFill`). */
export function validatePlacement(
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

/** Generate hex-grid stamp points inside a polygon and persist as a
 *  bulk insert. Each candidate centroid is validated against the parcel
 *  boundary + same-`category` neighbour distance via `validatePlacement`,
 *  so a fill that overlaps the parcel edge or pre-existing same-kind
 *  trees is silently clipped. Dispatches `plan:tree-stamp-summary` with
 *  the tally. The polygon itself is consumed by the caller's MapboxDraw
 *  control (auto `deleteAll` after `onComplete`); never persisted. */
function stampHexFill(
  polygon: GeoJSON.Polygon,
  spec: DesignElementSpec,
  projectId: string,
  parcelBoundary: GeoJSON.Polygon | undefined,
  view: PlanViewLike,
): { stamped: number; skipped: number } {
  const spacing = spec.defaultSpacingM;
  if (!spacing || spacing <= 0) return { stamped: 0, skipped: 0 };

  const bbox = turf.bbox(polygon);
  // turf.hexGrid cellSide is the hex edge length. Picking cellSide =
  // spacing gives centroids ~spacing*sqrt(3) apart; for a steward
  // expectation of "trees this far apart", scale to (spacing / sqrt(3)).
  const cellSide = spacing / Math.sqrt(3);
  const grid = turf.hexGrid(bbox, cellSide, { units: 'meters' });

  const polyFeature = turf.feature(polygon);
  const candidates: [number, number][] = [];
  for (const cell of grid.features) {
    const c = turf.centroid(cell).geometry.coordinates as [number, number];
    if (turf.booleanPointInPolygon(turf.point(c), polyFeature)) {
      candidates.push(c);
    }
  }

  const sameKindStart = getDesignElementsForProject(projectId).filter(
    (e) => e.kind === spec.kind,
  ).length;

  const accepted: [number, number][] = [];
  const placedThisRun: GeoJSON.Position[] = [];
  let skipped = 0;
  for (const c of candidates) {
    const result = validatePlacement(c, spec, projectId, parcelBoundary);
    if (!result.ok) {
      skipped += 1;
      continue;
    }
    // Also enforce inter-stamp spacing within this batch — the store
    // doesn't see the previous accepted point until after the batch
    // commits, so guard manually here.
    let conflict = false;
    for (const p of placedThisRun) {
      const d = turf.distance(c, p as [number, number], { units: 'meters' });
      if (d < spacing) {
        conflict = true;
        break;
      }
    }
    if (conflict) {
      skipped += 1;
      continue;
    }
    accepted.push(c);
    placedThisRun.push(c);
  }

  const nowIso = new Date().toISOString();
  const elements: DesignElement[] = accepted.map((coords, i) => ({
    id: `de-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
    category: spec.category,
    kind: spec.kind,
    geometry: { type: 'Point', coordinates: coords },
    phase: spec.phase,
    label: `${spec.label} ${nextLetter(sameKindStart + i)}`,
    createdAt: nowIso,
    view,
  }));

  if (elements.length > 0) {
    addDesignElements(projectId, elements);
  }

  window.dispatchEvent(
    new CustomEvent('plan:tree-stamp-summary', {
      detail: { stamped: elements.length, skipped, kind: spec.kind },
    }),
  );

  return { stamped: elements.length, skipped };
}

// Re-exported view shape so the helper above doesn't pull a hook type.
type PlanViewLike = ReturnType<typeof usePlanView>;

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
  const stampMode = useStampModeStore((s) => s.mode);
  const fillEligible = isPoint && !!spec?.defaultSpacingM;
  const pointFillMode = fillEligible && stampMode === 'fill';

  // Spacing snap: only for point kinds with a `defaultSpacingM` in the
  // catalog (today: oak / pine / apple / shrub). Non-spacing point kinds
  // skip the ring + validation entirely. Suppressed in fill mode — the
  // polygon outline is the affordance there, not the per-cursor ring.
  const spacing =
    isPoint && spec?.defaultSpacingM && !pointFillMode
      ? {
          radiusM: spec.defaultSpacingM,
          validate: (lngLat: [number, number]) =>
            validatePlacement(lngLat, spec, projectId, parcelBoundary),
        }
      : undefined;

  const handleFillComplete = useCallback(
    (geom: DrawGeometry) => {
      if (!spec || geom.type !== 'Polygon') {
        onComplete?.();
        return;
      }
      stampHexFill(geom, spec, projectId, parcelBoundary, currentView);
      onComplete?.();
    },
    [spec, projectId, parcelBoundary, currentView, onComplete],
  );

  useContinuousPointDrawTool({
    map,
    enabled: isPoint && !pointFillMode,
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

  const { liveArea, liveLength } = useMapboxDrawTool({
    map,
    mode: pointFillMode ? 'draw_polygon' : (spec?.drawMode ?? 'draw_point'),
    onComplete: pointFillMode ? handleFillComplete : handleComplete,
    enabled: !isPoint || pointFillMode,
  });

  return { liveArea, liveLength };
}
