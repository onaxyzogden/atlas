/**
 * SurveyLayer -- renders one reception survey's DRAWN features as persistent
 * MapLibre layers, colour-coded per survey class. Generic over any
 * `createSurveyStore` bundle, so all five Stratum-3 ("Tier 2 Systems Reading")
 * surveys share one renderer instead of five hand-copied layers.
 *
 * Lifted from SlopeSurveyLayer, with two generalisations:
 *   - the colour-match expression keys off the generic `surveyClass` property
 *     (slope used `slopeClass`), built from the bundle's CLASS_COLORS;
 *   - the render discriminator is the per-feature geometry `kind`, so a
 *     mixed-geometry survey (e.g. hydrology = flow lines + wet/dry zones)
 *     renders each class with the right primitive: poly fill+outline, line,
 *     or point circle, plus a shared centroid/point text label.
 *
 * Keeps the slope layer's getStyle()-gated re-apply (survives basemap swaps via
 * style.load + load + styledata), the matrix-toggle visibility gate (the single
 * shared `receptionSurvey` key), and the `{surveyClass, kind, id, projectId}`
 * feature-property publish for future click-select. Source/layer ids are namespaced
 * by the bundle's idPrefix so the five layers never collide.
 */

import { useEffect, useMemo } from 'react';
import type { Map as MaplibreMap, ExpressionSpecification } from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useMatrixTogglesStore } from '../../../store/matrixTogglesStore.js';
import type {
  SurveyFeature,
  SurveyStoreBundle,
} from '../../../store/createSurveyStore.js';

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bundle: SurveyStoreBundle<any>;
  map: MaplibreMap;
  projectId: string;
}

export default function SurveyLayer({ bundle, map, projectId }: Props) {
  const SOURCE_ID = `${bundle.config.idPrefix}-survey-src`;
  const FILL_LAYER = `${bundle.config.idPrefix}-fill`;
  const POLY_LINE_LAYER = `${bundle.config.idPrefix}-poly-line`;
  const LINE_LAYER = `${bundle.config.idPrefix}-line`;
  const POINT_LAYER = `${bundle.config.idPrefix}-point`;
  const LABEL_LAYER = `${bundle.config.idPrefix}-label`;

  const byProject = bundle.useStore((s) => s.byProject);
  const visible = useMatrixTogglesStore((s) => s.receptionSurvey);

  /** ['match', ['get','surveyClass'], key, color, ..., fallback] */
  const colorMatch = useMemo<ExpressionSpecification>(() => {
    const stops: string[] = [];
    for (const [key, color] of Object.entries(bundle.CLASS_COLORS)) {
      stops.push(key, color as string);
    }
    return [
      'match',
      ['get', 'surveyClass'],
      ...stops,
      '#8a8675',
    ] as unknown as ExpressionSpecification;
  }, [bundle]);

  const data = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = [];
    const rows = byProject[projectId] ?? {};
    for (const f of Object.values(rows) as SurveyFeature<string>[]) {
      // Geometry feature -- `id`+`projectId` published for future click-select;
      // `kind` is the render discriminator the sublayer filters key off.
      features.push({
        type: 'Feature',
        properties: { surveyClass: f.surveyClass, kind: f.kind, id: f.id, projectId },
        geometry: f.geometry,
      });
      // Label anchor: centroid for poly/line, the point itself for points.
      let center: GeoJSON.Position | null = null;
      try {
        center = turf.centroid(f.geometry).geometry.coordinates;
      } catch {
        center = null;
      }
      if (center) {
        features.push({
          type: 'Feature',
          properties: {
            surveyClass: f.surveyClass,
            kind: 'label',
            label: bundle.CLASS_LABELS[f.surveyClass] ?? f.surveyClass,
          },
          geometry: { type: 'Point', coordinates: center },
        });
      }
    }
    return { type: 'FeatureCollection', features };
  }, [byProject, projectId, bundle]);

  useEffect(() => {
    const apply = () => {
      // Gate on getStyle() (not isStyleLoaded(), which flips false mid
      // setStyle(diff:false) swap) and retry on idle -- mirrors SlopeSurveyLayer.
      if (!map.getStyle()) {
        map.once('idle', apply);
        return;
      }
      try {
        const existing = map.getSource(SOURCE_ID) as
          | maplibregl.GeoJSONSource
          | undefined;
        if (existing) {
          existing.setData(data);
        } else {
          map.addSource(SOURCE_ID, { type: 'geojson', data });
        }

        if (!map.getLayer(FILL_LAYER)) {
          map.addLayer({
            id: FILL_LAYER,
            type: 'fill',
            source: SOURCE_ID,
            filter: ['==', ['get', 'kind'], 'poly'],
            paint: { 'fill-color': colorMatch, 'fill-opacity': 0.32 },
          });
        }
        if (!map.getLayer(POLY_LINE_LAYER)) {
          map.addLayer({
            id: POLY_LINE_LAYER,
            type: 'line',
            source: SOURCE_ID,
            filter: ['==', ['get', 'kind'], 'poly'],
            paint: { 'line-color': colorMatch, 'line-width': 2 },
          });
        }
        if (!map.getLayer(LINE_LAYER)) {
          map.addLayer({
            id: LINE_LAYER,
            type: 'line',
            source: SOURCE_ID,
            filter: ['==', ['get', 'kind'], 'line'],
            paint: { 'line-color': colorMatch, 'line-width': 3 },
          });
        }
        if (!map.getLayer(POINT_LAYER)) {
          map.addLayer({
            id: POINT_LAYER,
            type: 'circle',
            source: SOURCE_ID,
            filter: ['==', ['get', 'kind'], 'point'],
            paint: {
              'circle-color': colorMatch,
              'circle-radius': 5,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1.5,
            },
          });
        }
        if (!map.getLayer(LABEL_LAYER)) {
          map.addLayer({
            id: LABEL_LAYER,
            type: 'symbol',
            source: SOURCE_ID,
            filter: ['==', ['get', 'kind'], 'label'],
            layout: {
              'text-field': ['get', 'label'],
              'text-size': 11,
              'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
              'text-anchor': 'center',
              'text-offset': [0, 0.8],
            },
            paint: {
              'text-color': '#23311f',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.4,
            },
          });
        }
        // Re-apply matrix-toggle visibility on every (re)apply so it survives
        // basemap swaps + feature edits (mirrors SlopeSurveyLayer).
        for (const layerId of [
          FILL_LAYER,
          POLY_LINE_LAYER,
          LINE_LAYER,
          POINT_LAYER,
          LABEL_LAYER,
        ]) {
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(
              layerId,
              'visibility',
              visible ? 'visible' : 'none',
            );
          }
        }
      } catch {
        /* map mid-teardown; the next style.load re-applies */
      }
    };

    apply();
    const onStyle = () => apply();
    map.on('style.load', onStyle);
    map.on('load', onStyle);
    map.on('styledata', onStyle);

    return () => {
      try {
        map.off('style.load', onStyle);
        map.off('load', onStyle);
        map.off('styledata', onStyle);
        for (const layerId of [
          LABEL_LAYER,
          POINT_LAYER,
          LINE_LAYER,
          POLY_LINE_LAYER,
          FILL_LAYER,
        ]) {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
        }
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        /* map already disposed */
      }
    };
  }, [
    map,
    data,
    visible,
    colorMatch,
    SOURCE_ID,
    FILL_LAYER,
    POLY_LINE_LAYER,
    LINE_LAYER,
    POINT_LAYER,
    LABEL_LAYER,
  ]);

  return null;
}
