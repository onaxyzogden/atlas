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
import { useDesignElementsForProject } from '../../../../store/builtEnvironmentSelectors.js';
import {
  PHASE_VIEW_CAP,
  phaseIndex,
  type PlanView,
} from '../../types.js';
import { findElementSpec } from '../elementCatalog.js';
import type { DesignElement } from '../../../../store/designElementsStore.js';

interface Props {
  map: MaplibreMap;
  projectId: string;
  view: PlanView;
  /** Currently selected design element id. Drives the feature-state highlight. */
  selectedId?: string | null;
}

const SOURCE_PREFIX = 'design-el-';
const LAYER_PREFIX = 'design-el-';

export default function DesignElementLayers({
  map,
  projectId,
  view,
  selectedId,
}: Props) {
  const elements = useDesignElementsForProject(projectId);

  const { polyFC, lineFC, pointFC, labelFC, conflictPolyFC, conflictLineFC } = useMemo(() => {
    const cap =
      view === 'phase-1' || view === 'phase-2'
        ? phaseIndex(PHASE_VIEW_CAP[view])
        : Infinity;

    const visible = elements
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
      });

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
        lines.push({ type: 'Feature', id: el.id, properties: props, geometry: el.geometry });
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
  }, [elements, view]);

  useEffect(() => {
    if (!map) return;

    const apply = () => {
      if ((map.getStyle()?.layers?.length ?? 0) === 0) return;

      const ensureSource = (id: string, data: GeoJSON.FeatureCollection) => {
        const sid = `${SOURCE_PREFIX}${id}`;
        const existing = map.getSource(sid) as
          | maplibregl.GeoJSONSource
          | undefined;
        if (existing) existing.setData(data);
        else map.addSource(sid, { type: 'geojson', data, promoteId: 'id' });
        return sid;
      };

      const polySid = ensureSource('poly', polyFC);
      const lineSid = ensureSource('line', lineFC);
      const pointSid = ensureSource('point', pointFC);
      const labelSid = ensureSource('label', labelFC);
      const conflictPolySid = ensureSource('utility-conflict-poly', conflictPolyFC);
      const conflictLineSid = ensureSource('utility-conflict-line', conflictLineFC);

      const ensureLayer = (spec: maplibregl.LayerSpecification) => {
        if (!map.getLayer(spec.id)) map.addLayer(spec);
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

      ensureLayer({
        id: `${LAYER_PREFIX}poly-fill`,
        type: 'fill',
        source: polySid,
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': ['case', selFlag, 0.55, 0.28],
        },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}poly-line`,
        type: 'line',
        source: polySid,
        paint: {
          'line-color': ['case', selFlag, SEL_GOLD, ['get', 'color']],
          'line-width': ['case', selFlag, 3, 1.5],
          'line-opacity': 0.9,
        },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}line`,
        type: 'line',
        source: lineSid,
        paint: {
          'line-color': ['case', selFlag, SEL_GOLD, ['get', 'color']],
          'line-width': ['case', selFlag, 4, 2],
          'line-opacity': 0.9,
          'line-dasharray': [2, 1],
        },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}point`,
        type: 'circle',
        source: pointSid,
        paint: {
          'circle-radius': ['case', selFlag, 9, 6],
          'circle-color': ['get', 'color'],
          'circle-stroke-color': ['case', selFlag, SEL_GOLD, '#1f1d1a'],
          'circle-stroke-width': ['case', selFlag, 3, 1.5],
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

    return () => {
      try {
        map.off('style.load', onStyle);
      } catch {
        /* map already disposed */
      }
    };
  }, [map, polyFC, lineFC, pointFC, labelFC, conflictPolyFC, conflictLineFC]);

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
