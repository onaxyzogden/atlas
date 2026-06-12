/**
 * DesignElementLayers — renders Vision-Layout design elements as persistent
 * MapLibre layers. Mirrors ObserveAnnotationLayers but reads from
 * designElementsStore and is filtered by the active phase view.
 *
 * One source per geometry kind (point/line/polygon), labels rendered as a
 * separate symbol layer driven by feature properties.
 */

import { useEffect, useMemo } from 'react';
import type { ExpressionSpecification, Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  getDesignElementsForProject,
  updateDesignElement,
  useDesignElementsForProject,
} from '../../../../store/builtEnvironmentSelectors.js';
import { useTemporalScrubStore } from '../temporalScrubStore.js';
import { canopyAtAge } from '@ogden/shared';
import {
  findOverlaps,
  overlappingIds,
} from '../../cards/plant-systems/temporalCoherenceMath.js';
import { usePlanSelectionStore } from '../../../../store/planSelectionStore.js';
import { translateByDelta } from '../../layers/translateGeometry.js';
import {
  phaseIndex,
  yeomansCapForYear,
  type PlanView,
  type PlanModule,
} from '../../types.js';
import { findElementSpec } from '../elementCatalog.js';
import type { DesignCategory } from '../elementCatalog.js';
import type { DesignElement } from '../../../../store/designElementsStore.js';
import { gatePlacement } from '../../validation/placementGate.js';
import type { PlacementGeometry } from '../../validation/placementContext.js';

/**
 * Maps a design-element category to the Plan objective (module) it belongs to.
 * Used to scope the Vision design-element canvas to a single objective when the
 * Plan map is in single-objective focus (an objective is "Open on Map"). When
 * `activeModule` is null the full design-element set renders. `custom` has no
 * home objective, so it is hidden under focus.
 */
const CATEGORY_MODULE: Record<DesignCategory, PlanModule | null> = {
  water: 'hydrology',
  access: 'access-circulation',
  grazing: 'animals-livestock',
  structure: 'built-infrastructure',
  machinery: 'built-infrastructure',
  amenity: 'built-infrastructure',
  vegetation: 'plants-food',
  earthworks: 'hydrology',
  habitat: 'ecology',
  custom: null,
};

interface Props {
  map: MaplibreMap;
  projectId: string;
  view: PlanView;
  /** Currently selected design element id. Drives the feature-state highlight. */
  selectedId?: string | null;
  /** Called with true when the pointer enters a design-element layer,
   *  false when it leaves. Used by VisionLayoutCanvas to drive the
   *  hover-affordance cursor in Select mode. */
  onHoverChange?: (hovering: boolean) => void;
  /** Notified when a design-element is selected (or selection cleared) via
   *  a direct map click. Lets the parent mirror the local `selectedId` state
   *  that drives the gold-outline feature-state highlight. */
  onSelect?: (id: string | null) => void;
  /** When set, scope the canvas to a single Plan objective: only design
   *  elements whose category maps to `activeModule` render (CATEGORY_MODULE).
   *  Null = full design-element set (no focus). Mirrors the strict
   *  single-objective rail/overlay focus. */
  activeModule?: PlanModule | null;
  /** Parcel boundary for the drag-move placement gate's containment rule.
   *  Only threaded on editable mounts (Plan Current); other mounts leave it
   *  undefined and the boundary rule no-ops on drag re-validation. */
  parcelBoundary?: GeoJSON.Polygon;
}

const SOURCE_PREFIX = 'design-el-';
const LAYER_PREFIX = 'design-el-';

/**
 * Representative anchor for the drag-move placement gate — mirrors
 * `dragGateAnchor` in PlanDataLayers: Point = the point, LineString = the
 * middle vertex, Polygon = turf centroid. Null (degenerate geometry) means
 * the move commits ungated, same as the draw tools' fall-through.
 */
function dragGateAnchor(
  geom: GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon,
): [number, number] | null {
  try {
    if (geom.type === 'Point') {
      const [lng, lat] = geom.coordinates;
      return lng != null && lat != null ? [lng, lat] : null;
    }
    if (geom.type === 'LineString') {
      const mid = geom.coordinates[Math.floor(geom.coordinates.length / 2)];
      const lng = mid?.[0];
      const lat = mid?.[1];
      return lng != null && lat != null ? [lng, lat] : null;
    }
    const [lng, lat] = turf.centroid(geom).geometry.coordinates;
    return lng != null && lat != null ? [lng, lat] : null;
  } catch {
    return null;
  }
}

export default function DesignElementLayers({
  map,
  projectId,
  view,
  selectedId,
  onHoverChange,
  onSelect,
  activeModule = null,
  parcelBoundary,
}: Props) {
  // Opt into draft rows so the generated-design review layer renders;
  // every other consumer excludes drafts by default (ADR 2026-05-14).
  const elements = useDesignElementsForProject(projectId, {
    includeDrafts: true,
  });
  // Yeomans cap is now derived from the year scrubber's currentYear
  // (replaces the retired `phase-1` / `phase-2` view tabs, 2026-05-14).
  // Also drives the per-vegetation canopy scaling effect below.
  const currentYear = useTemporalScrubStore((s) => s.currentYear);

  const { polyFC, lineFC, pointFC, labelFC, conflictPolyFC, conflictLineFC } = useMemo(() => {
    const capKey = yeomansCapForYear(currentYear);
    const cap = capKey ? phaseIndex(capKey) : Infinity;

    const visible = elements
      .filter((el) => !el.hidden)
      .filter((el) => phaseIndex(el.phase) <= cap)
      .filter((el) => {
        // Per-view origin scoping (2026-05-11):
        //  - On `current`, show only `current`-origin elements.
        //  - On non-`current` views, show this view's own elements plus
        //    `current`-origin ones that have NOT been hidden on this view.
        const originView = el.view ?? 'current';
        if (view === 'current') return originView === 'current';
        if (originView === view) return true;
        if (originView === 'current')
          return !(el.hiddenInViews ?? []).includes(view);
        return false;
      })
      // Single-objective focus (2026-05-24): when an objective is "Open on
      // Map", show only design elements whose category maps to it. `custom`
      // (CATEGORY_MODULE = null) is hidden under focus. Full set when null.
      .filter(
        (el) =>
          activeModule == null ||
          CATEGORY_MODULE[el.category] === activeModule,
      );

    const polys: GeoJSON.Feature[] = [];
    const lines: GeoJSON.Feature[] = [];
    const points: GeoJSON.Feature[] = [];
    const labels: GeoJSON.Feature[] = [];
    // Utility-conflict halos (ADR 2026-05-10) — earthwork elements
    // whose draw intersected a buried utility carry `utilityConflicts`.
    // Rendered as a `#c4422a` outline behind the main element so the
    // conflict reads at a glance.
    const conflictPolys: GeoJSON.Feature[] = [];
    const conflictLines: GeoJSON.Feature[] = [];

    for (const el of visible) {
      // Skip rows whose geometry is missing or malformed. The DesignElement
      // type declares `geometry` as required, but synced/draft rows can
      // arrive without it (Auto-Design drafts land here because this is the
      // only consumer that opts into `includeDrafts`). Accessing
      // `el.geometry.type` on such a row throws "Cannot read properties of
      // undefined (reading 'type')" and takes down the whole Plan canvas.
      // Mirrors the skip-on-malformed convention used for centroids below
      // and PlanDataLayers' `acresOf` guard.
      const geom = el.geometry as GeoJSON.Geometry | undefined;
      if (!geom || typeof geom.type !== 'string') continue;
      const spec = findElementSpec(el.kind);
      const color = spec?.color ?? '#888';
      const originView = el.view ?? 'current';
      const editable = originView === view;
      const props = {
        id: el.id,
        kind: el.kind,
        category: el.category,
        color,
        label:
          el.label && el.acreage != null
            ? `${el.label} — ${el.acreage.toFixed(1)} ac`
            : (el.label ?? spec?.label ?? el.kind),
        originView,
        editable,
        draft: el.draft === true,
      };
      const hasConflict =
        Array.isArray(el.utilityConflicts) && el.utilityConflicts.length > 0;
      if (el.geometry.type === 'Polygon') {
        polys.push({ type: 'Feature', id: el.id, properties: props, geometry: el.geometry });
        if (hasConflict) {
          conflictPolys.push({
            type: 'Feature',
            id: `${el.id}:halo`,
            properties: { id: el.id, kind: 'utility_conflict' },
            geometry: el.geometry,
          });
        }
        try {
          const c = turf.centroid(el.geometry).geometry;
          labels.push({ type: 'Feature', id: el.id, properties: props, geometry: c });
        } catch {
          /* malformed polygon — skip label */
        }
      } else if (el.geometry.type === 'LineString') {
        const widthM = el.widthM ?? spec?.defaultWidthM ?? 1;
        lines.push({
          type: 'Feature',
          id: el.id,
          properties: { ...props, widthM },
          geometry: el.geometry,
        });
        if (hasConflict) {
          conflictLines.push({
            type: 'Feature',
            id: `${el.id}:halo`,
            properties: { id: el.id, kind: 'utility_conflict' },
            geometry: el.geometry,
          });
        }
      } else {
        points.push({ type: 'Feature', id: el.id, properties: props, geometry: el.geometry });
        labels.push({
          type: 'Feature',
          id: el.id,
          properties: props,
          geometry: el.geometry,
        });
      }
    }
    return {
      polyFC: { type: 'FeatureCollection' as const, features: polys },
      lineFC: { type: 'FeatureCollection' as const, features: lines },
      pointFC: { type: 'FeatureCollection' as const, features: points },
      labelFC: { type: 'FeatureCollection' as const, features: labels },
      conflictPolyFC: { type: 'FeatureCollection' as const, features: conflictPolys },
      conflictLineFC: { type: 'FeatureCollection' as const, features: conflictLines },
    };
  }, [elements, view, currentYear, activeModule]);

  useEffect(() => {
    if (!map) return;

    let disposed = false;
    let idleRetryArmed = false;
    const armIdleRetry = () => {
      if (disposed || idleRetryArmed) return;
      idleRetryArmed = true;
      map.once('idle', () => {
        idleRetryArmed = false;
        if (!disposed) apply();
      });
    };

    const apply = () => {
      if (disposed) return;
      // Don't gate on isStyleLoaded() — it flips back to false during
      // tile loads and basemap swaps, which would suppress legitimate
      // re-applies. Gate only on the style having been initialised at all.
      if (!map.getStyle()) {
        armIdleRetry();
        return;
      }

      const ensureSource = (id: string, data: GeoJSON.FeatureCollection) => {
        const sid = `${SOURCE_PREFIX}${id}`;
        const existing = map.getSource(sid) as
          | maplibregl.GeoJSONSource
          | undefined;
        if (existing) existing.setData(data);
        else map.addSource(sid, { type: 'geojson', data, promoteId: 'id' });
        return sid;
      };

      let polySid: string, lineSid: string, pointSid: string, labelSid: string;
      let conflictPolySid: string, conflictLineSid: string;
      try {
        polySid = ensureSource('poly', polyFC);
        lineSid = ensureSource('line', lineFC);
        pointSid = ensureSource('point', pointFC);
        labelSid = ensureSource('label', labelFC);
        conflictPolySid = ensureSource('utility-conflict-poly', conflictPolyFC);
        conflictLineSid = ensureSource('utility-conflict-line', conflictLineFC);
      } catch {
        // Style not actually ready despite getStyle() returning a value
        // (e.g. mid-setStyle interleaving). Retry on next idle.
        armIdleRetry();
        return;
      }

      const ensureLayer = (spec: maplibregl.LayerSpecification) => {
        try {
          if (!map.getLayer(spec.id)) map.addLayer(spec);
        } catch {
          armIdleRetry();
        }
      };

      // Utility-conflict halos — added first so the `#c4422a` outline
      // sits behind the main element render. Per ADR 2026-05-10.
      ensureLayer({
        id: `${LAYER_PREFIX}utility-conflict-poly`,
        type: 'line',
        source: conflictPolySid,
        paint: {
          'line-color': '#c4422a',
          'line-width': 4,
          'line-opacity': 0.95,
        },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}utility-conflict-line`,
        type: 'line',
        source: conflictLineSid,
        paint: {
          'line-color': '#c4422a',
          'line-width': 4,
          'line-opacity': 0.95,
        },
      });

      const selFlag: ExpressionSpecification = ['boolean', ['feature-state', 'selected'], false];
      const SEL_GOLD = '#c4a265';
      // Auto-Design drafts (ADR 2026-05-14) read dashed + extra-translucent
      // so the steward can tell generated-but-unreviewed geometry apart
      // from committed design at a glance.
      const draftFlag: ExpressionSpecification = [
        'boolean',
        ['get', 'draft'],
        false,
      ];

      ensureLayer({
        id: `${LAYER_PREFIX}poly-fill`,
        type: 'fill',
        source: polySid,
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': [
            'case',
            selFlag,
            0.55,
            draftFlag,
            0.14,
            0.28,
          ],
        },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}poly-line`,
        type: 'line',
        source: polySid,
        paint: {
          'line-color': ['case', selFlag, SEL_GOLD, ['get', 'color']],
          'line-width': ['case', selFlag, 3, 1.5],
          'line-opacity': ['case', draftFlag, 0.65, 0.9],
        },
      });
      // Draft-only dashed overlay on polygon edges. `line-dasharray` is
      // not a data-driven property in MapLibre, so the dash can't be a
      // `get`-expression on the shared layer — instead a separate layer
      // statically dashed and filtered to draft features carries it.
      ensureLayer({
        id: `${LAYER_PREFIX}poly-line-draft`,
        type: 'line',
        source: polySid,
        filter: ['==', ['get', 'draft'], true],
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.5,
          'line-opacity': 0.85,
          'line-dasharray': [2, 2],
        },
      });
      // Width-aware line rendering: real-world `widthM` (per-feature override
      // or kind default from elementCatalog, stamped onto the GeoJSON props
      // above) is interpolated across zoom into screen pixels. The `max(…)`
      // floors keep narrow kinds legible at low zoom. The +2 px selection
      // emphasis is folded into each interpolate stop's OUTPUT (not wrapped
      // around the whole expression): MapLibre requires the zoom curve to be
      // the outermost expression of `line-width` and forbids more than one
      // zoom-based sub-expression, so a `['case', selFlag, ['+', expr, 2],
      // expr]` wrapper — which nests the zoom interpolate twice — throws
      // "Only one zoom-based step/interpolate subexpression may be used" on
      // every repaint. feature-state is allowed in the stop outputs.
      const lineWidthExpr: ExpressionSpecification = [
        'interpolate',
        ['exponential', 2],
        ['zoom'],
        12, ['+', ['max', 0.5, ['*', ['coalesce', ['get', 'widthM'], 1], 0.05]], ['case', selFlag, 2, 0]],
        19, ['+', ['max', 1.5, ['*', ['coalesce', ['get', 'widthM'], 1], 1.6]],  ['case', selFlag, 2, 0]],
        22, ['+', ['max', 2,   ['*', ['coalesce', ['get', 'widthM'], 1], 25]],   ['case', selFlag, 2, 0]],
      ];
      ensureLayer({
        id: `${LAYER_PREFIX}line`,
        type: 'line',
        source: lineSid,
        paint: {
          'line-color': ['case', selFlag, SEL_GOLD, ['get', 'color']],
          'line-width': lineWidthExpr,
          'line-opacity': ['case', draftFlag, 0.65, 0.9],
          'line-dasharray': [2, 1],
        },
      });
      // Vegetation point trees use a feature-state-driven `canopyR` so
      // the bottom-canvas TemporalScrubSlider can scale crowns live as
      // the steward walks Year 1..50. Non-vegetation kinds keep
      // canopyR=null, so `coalesce` falls back to the base 6 px and the
      // overlap branch never fires (per the 2026-04-28 temporal-slider ADR).
      const overlapFlag: ExpressionSpecification = [
        'boolean',
        ['feature-state', 'overlap5y'],
        false,
      ];
      ensureLayer({
        id: `${LAYER_PREFIX}point`,
        type: 'circle',
        source: pointSid,
        paint: {
          'circle-radius': [
            'case',
            selFlag,
            9,
            ['coalesce', ['feature-state', 'canopyR'], 6],
          ],
          'circle-color': ['get', 'color'],
          'circle-stroke-color': [
            'case',
            selFlag,
            SEL_GOLD,
            overlapFlag,
            '#8a4f3a',
            '#1f1d1a',
          ],
          'circle-stroke-width': [
            'case',
            selFlag,
            3,
            overlapFlag,
            2.5,
            1.5,
          ],
          'circle-opacity': 0.95,
        },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}label`,
        type: 'symbol',
        source: labelSid,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-offset': [0, 1.1],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#f2ede3',
          'text-halo-color': 'rgba(31, 29, 26, 0.85)',
          'text-halo-width': 1.2,
        },
      });
    };

    apply();
    const onStyle = () => apply();
    map.on('style.load', onStyle);
    map.on('load', onStyle);
    // `styledata` fires on initial paint AND every basemap swap, where
    // `style.load` is unreliable in some F5/setStyle interleavings (see
    // ADDENDUM 7 in DiagnoseMap). Idempotent ensureSource/ensureLayer
    // guards make repeated invocations safe.
    map.on('styledata', onStyle);

    return () => {
      disposed = true;
      try {
        map.off('style.load', onStyle);
        map.off('load', onStyle);
        map.off('styledata', onStyle);
      } catch {
        /* map already disposed */
      }
    };
  }, [map, polyFC, lineFC, pointFC, labelFC, conflictPolyFC, conflictLineFC]);

  // Pointer hover bookkeeping — report enter/leave on any of the three
  // clickable design-element layers up to the canvas so the centralized
  // cursor effect can show a `pointer` affordance in Select mode.
  useEffect(() => {
    if (!map || !onHoverChange) return;
    const layerIds = ['design-el-poly-fill', 'design-el-line', 'design-el-point'];
    const onEnter = () => onHoverChange(true);
    const onLeave = () => onHoverChange(false);
    for (const id of layerIds) {
      map.on('mouseenter', id, onEnter);
      map.on('mouseleave', id, onLeave);
    }
    return () => {
      try {
        for (const id of layerIds) {
          map.off('mouseenter', id, onEnter);
          map.off('mouseleave', id, onLeave);
        }
        onHoverChange(false);
      } catch {
        /* map disposed */
      }
    };
  }, [map, onHoverChange]);

  // Direct-click selection + drag-to-translate. Brings design-element
  // interaction parity with PlanDataLayers' per-kind handlers — without
  // this, design-elements were only selectable via DesignToolRail's
  // gated `select` mode and could not be moved at all.
  //
  // Respects the `editable` feature property (origin-view scoping): a
  // current-origin element rendered on a non-current view stays
  // read-only.
  useEffect(() => {
    if (!map) return;

    const DRAG_THRESHOLD_PX = 4;
    const layerIds = ['design-el-poly-fill', 'design-el-line', 'design-el-point'];

    type DragState = {
      id: string;
      startX: number;
      startY: number;
      startLng: number;
      startLat: number;
      origGeom: GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon;
      dragging: boolean;
    };
    let down: DragState | null = null;

    const onMouseEnter = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      const props = f?.properties as { editable?: boolean } | undefined;
      if (props?.editable === false) return;
      map.getCanvas().style.cursor = 'move';
    };
    const onMouseLeave = () => {
      if (!down?.dragging) map.getCanvas().style.cursor = '';
    };

    const onMouseDown = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const props = f.properties as
        | { id?: string; editable?: boolean }
        | undefined;
      const id = props?.id;
      if (!id) return;
      // Skip read-only renders (current-origin element on a non-current view).
      if (props?.editable === false) return;
      e.preventDefault();

      const list = getDesignElementsForProject(projectId);
      const el = list.find((x) => x.id === id);
      if (!el) return;

      const selStore = usePlanSelectionStore.getState();
      const selItem = {
        kind: 'design-element' as const,
        id,
        projectId,
      };
      if (e.originalEvent.shiftKey) {
        selStore.toggle(selItem);
      } else {
        selStore.set([selItem]);
      }
      onSelect?.(id);

      down = {
        id,
        startX: e.point.x,
        startY: e.point.y,
        startLng: e.lngLat.lng,
        startLat: e.lngLat.lat,
        origGeom: el.geometry,
        dragging: false,
      };

      const onMove = (ev: maplibregl.MapMouseEvent) => {
        if (!down) return;
        const dx = ev.point.x - down.startX;
        const dy = ev.point.y - down.startY;
        if (!down.dragging && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
          down.dragging = true;
          map.dragPan.disable();
          map.getCanvas().style.cursor = 'grabbing';
        }
        if (!down.dragging) return;
        const dLng = ev.lngLat.lng - down.startLng;
        const dLat = ev.lngLat.lat - down.startLat;
        const next = translateByDelta<
          GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon
        >(down.origGeom, dLng, dLat);
        updateDesignElement(projectId, down.id, { geometry: next });
      };

      const onUp = () => {
        map.off('mousemove', onMove);
        map.off('mouseup', onUp);
        const d = down;
        down = null;
        map.dragPan.enable();
        map.getCanvas().style.cursor = '';
        if (!d?.dragging) return;

        // Drag-move re-validation (mouseup only — never on mousemove). The
        // live mousemove writes already left the final geometry in the
        // store; gate it as the same {kind, category} candidate the draw
        // tool used, so draw-time and move-time rules can't diverge. There
        // is no zundo temporal middleware on designElementsStore, so no
        // undo-window protocol applies: a rejected (or warn-cancelled) move
        // simply restores the original geometry.
        const el2 = getDesignElementsForProject(projectId).find(
          (x) => x.id === d.id,
        );
        if (!el2) return;
        const finalGeom = el2.geometry;
        const anchor = dragGateAnchor(finalGeom);
        if (!anchor) return; // degenerate — ungated commit, mirrors draw fall-through
        const spec = findElementSpec(el2.kind);
        void (async () => {
          const gate = await gatePlacement(
            finalGeom as PlacementGeometry,
            { kind: el2.kind, category: spec?.category ?? 'custom' },
            {
              projectId,
              anchor,
              boundary: parcelBoundary ?? null,
              excludeFeatureId: d.id,
            },
          );
          if (!gate.ok) {
            // Block, or steward cancelled the warn dialog — the gate's
            // toast/dialog already explained why. Snap back.
            updateDesignElement(projectId, d.id, { geometry: d.origGeom });
            return;
          }
          if (gate.acknowledgments?.length) {
            updateDesignElement(projectId, d.id, {
              placementAcknowledgments: [
                ...(el2.placementAcknowledgments ?? []),
                ...gate.acknowledgments,
              ],
            });
          }
        })();
      };

      map.on('mousemove', onMove);
      map.on('mouseup', onUp);
    };

    for (const id of layerIds) {
      map.on('mouseenter', id, onMouseEnter);
      map.on('mouseleave', id, onMouseLeave);
      map.on('mousedown', id, onMouseDown);
    }
    return () => {
      try {
        for (const id of layerIds) {
          map.off('mouseenter', id, onMouseEnter);
          map.off('mouseleave', id, onMouseLeave);
          map.off('mousedown', id, onMouseDown);
        }
        map.dragPan.enable();
      } catch {
        /* map disposed */
      }
    };
  }, [map, projectId, onSelect, parcelBoundary]);

  // Drive feature-state highlight off selectedId. Re-runs on FC changes
  // because source.setData() wipes feature-state.
  useEffect(() => {
    if (!map) return;
    const sources = [
      `${SOURCE_PREFIX}poly`,
      `${SOURCE_PREFIX}line`,
      `${SOURCE_PREFIX}point`,
    ];
    try {
      for (const source of sources) {
        if (!map.getSource(source)) continue;
        map.removeFeatureState({ source });
      }
      if (selectedId) {
        for (const source of sources) {
          if (!map.getSource(source)) continue;
          map.setFeatureState({ source, id: selectedId }, { selected: true });
        }
      }
    } catch {
      /* sources not yet ready — next data effect will re-apply */
    }
  }, [map, selectedId, polyFC, lineFC, pointFC]);

  // ── Temporal slider: per-vegetation-point canopyR + overlap5y ──
  // Drives the live tree-radius scaling and fired-clay overlap stroke
  // tied to `useTemporalScrubStore.currentYear`. Re-runs on year change,
  // on zoom/pan (pixel radius depends on the camera), on element changes,
  // and after the selection effect (which wipes feature-state) so the
  // canopy state is always re-applied. (`currentYear` is read once at
  // component top alongside the Yeomans-cap subscription.)
  useEffect(() => {
    if (!map) return;
    const source = `${SOURCE_PREFIX}point`;
    let rafId: number | null = null;
    const apply = () => {
      rafId = null;
      try {
        if (!map.getSource(source)) return;
        const vegPoints = elements.filter(
          (e) => e.category === 'vegetation' && e.geometry.type === 'Point',
        );
        const overlaps = findOverlaps(vegPoints, currentYear, 5);
        const flagged = overlappingIds(overlaps);
        for (const el of vegPoints) {
          if (el.geometry.type !== 'Point') continue;
          const [lng, lat] = el.geometry.coordinates as [number, number];
          const canopyM = canopyAtAge(el.kind, currentYear).canopyM;
          const radiusM = canopyM / 2;
          // Project centre and a destination point `radiusM` north of
          // it, then take the pixel-delta as the canopy radius. Cheap;
          // accurate enough at permaculture scale.
          const dest = turf.destination(
            [lng, lat],
            radiusM / 1000,
            0,
            { units: 'kilometers' },
          ).geometry.coordinates as [number, number];
          const pCentre = map.project([lng, lat]);
          const pDest = map.project(dest);
          const canopyR = Math.max(
            3,
            Math.hypot(pDest.x - pCentre.x, pDest.y - pCentre.y),
          );
          map.setFeatureState(
            { source, id: el.id },
            { canopyR, overlap5y: flagged.has(el.id) },
          );
        }
      } catch {
        /* source/style not ready — next dep change retries */
      }
    };
    const schedule = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(apply);
    };
    schedule();
    map.on('moveend', schedule);
    map.on('zoomend', schedule);
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      try {
        map.off('moveend', schedule);
        map.off('zoomend', schedule);
      } catch {
        /* map disposed */
      }
    };
  }, [map, currentYear, elements, selectedId, pointFC]);

  // Cleanup on unmount: remove our sources + layers so they don't bleed into
  // the Current Land view.
  useEffect(() => {
    return () => {
      if (!map) return;
      try {
        const allLayers = map.getStyle()?.layers ?? [];
        for (const l of allLayers) {
          if (l.id.startsWith(LAYER_PREFIX) && map.getLayer(l.id)) {
            map.removeLayer(l.id);
          }
        }
        const sources = (map.getStyle()?.sources ?? {}) as Record<
          string,
          unknown
        >;
        for (const sid of Object.keys(sources)) {
          if (sid.startsWith(SOURCE_PREFIX) && map.getSource(sid)) {
            map.removeSource(sid);
          }
        }
      } catch {
        /* map already disposed */
      }
    };
  }, [map]);

  return null;
}
