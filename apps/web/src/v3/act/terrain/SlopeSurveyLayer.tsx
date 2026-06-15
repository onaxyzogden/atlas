/**
 * SlopeSurveyLayer -- renders the drawn s2-terrain-c2 slope-class polygons as
 * persistent MapLibre layers (fill + line + centroid label), colour-coded per
 * class. Mounted as a DiagnoseMap render-prop child while the slope survey
 * rail-takeover is open. Direct sibling of VegetationSurveyLayer.
 *
 * One GeoJSON source, ensure-layer on first add, re-applied on `style.load` so
 * it survives basemap swaps, and best-effort teardown on unmount (the map may
 * already be half-destroyed on a route change).
 */

import { useEffect, useMemo } from 'react';
import type {
  Map as MaplibreMap,
  ExpressionSpecification,
} from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  useSlopeSurveyStore,
  SLOPE_CLASS_COLORS,
} from '../../../store/slopeSurveyStore.js';
import { useMatrixTogglesStore } from '../../../store/matrixTogglesStore.js';
import { SLOPE_CLASSES } from '../tier-shell/TerrainCapture.js';

const SOURCE_ID = 'slope-survey-src';
const FILL_LAYER = 'slope-survey-fill';
const LINE_LAYER = 'slope-survey-line';
const LABEL_LAYER = 'slope-survey-label';

const LABEL_BY_KEY: Record<string, string> = Object.fromEntries(
  SLOPE_CLASSES.map((c) => [c.key, c.label]),
);

/** ['match', ['get','slopeClass'], key, color, ..., fallback] */
function buildColorMatch(): ExpressionSpecification {
  const stops: (string | string[])[] = [];
  for (const [key, color] of Object.entries(SLOPE_CLASS_COLORS)) {
    stops.push(key, color);
  }
  return [
    'match',
    ['get', 'slopeClass'],
    ...stops,
    '#8a8675',
  ] as unknown as ExpressionSpecification;
}

interface Props {
  map: MaplibreMap;
  projectId: string;
}

export default function SlopeSurveyLayer({ map, projectId }: Props) {
  const byProject = useSlopeSurveyStore((s) => s.byProject);
  const visible = useMatrixTogglesStore((s) => s.slopeSurvey);

  const data = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = [];
    const rows = byProject[projectId] ?? {};
    for (const f of Object.values(rows)) {
      // Polygon fill/line feature. `id` + `projectId` are published so the
      // Plan canvas can click-select the polygon (Delete / Reshape / Reclassify
      // via planFeatureActions); `kind:'poly'` stays the render discriminator.
      features.push({
        type: 'Feature',
        properties: { slopeClass: f.slopeClass, kind: 'poly', id: f.id, projectId },
        geometry: f.geometry,
      });
      // Centroid label feature (carries the class label text).
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
            slopeClass: f.slopeClass,
            kind: 'label',
            label: LABEL_BY_KEY[f.slopeClass] ?? f.slopeClass,
          },
          geometry: { type: 'Point', coordinates: center },
        });
      }
    }
    return { type: 'FeatureCollection', features };
  }, [byProject, projectId]);

  useEffect(() => {
    const colorMatch = buildColorMatch();

    const apply = () => {
      // Don't gate on isStyleLoaded() -- it flips back to false *during* a
      // setStyle(diff:false) basemap swap, which would skip the re-add. Gate on
      // getStyle() (null only before the first style loads / after dispose) and
      // retry on the next idle if the style isn't ready yet (mirrors
      // DesignElementLayers). Without this the source/layers are silently lost
      // after every basemap swap and never come back.
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
            paint: {
              'fill-color': colorMatch,
              'fill-opacity': 0.35,
            },
          });
        }
        if (!map.getLayer(LINE_LAYER)) {
          map.addLayer({
            id: LINE_LAYER,
            type: 'line',
            source: SOURCE_ID,
            filter: ['==', ['get', 'kind'], 'poly'],
            paint: {
              'line-color': colorMatch,
              'line-width': 2,
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
            },
            paint: {
              'text-color': '#23311f',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.4,
            },
          });
        }
        // Apply the matrix-toggle visibility on every (re)apply so it survives
        // basemap swaps and feature edits (mirrors PlanSunPathOverlay).
        for (const id of [FILL_LAYER, LINE_LAYER, LABEL_LAYER]) {
          if (map.getLayer(id)) {
            map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
          }
        }
      } catch {
        /* map mid-teardown; the next style.load re-applies */
      }
    };

    apply();
    const onStyle = () => apply();
    // Cover all three re-add triggers (mirrors DesignElementLayers). style.load
    // alone is unreliable across F5 / setStyle interleavings, and a
    // setStyle(diff:false) basemap swap wipes our source+layers: styledata fires
    // on initial paint AND every basemap swap; load covers the first ready paint.
    map.on('style.load', onStyle);
    map.on('load', onStyle);
    map.on('styledata', onStyle);

    return () => {
      try {
        map.off('style.load', onStyle);
        map.off('load', onStyle);
        map.off('styledata', onStyle);
        for (const id of [LABEL_LAYER, LINE_LAYER, FILL_LAYER]) {
          if (map.getLayer(id)) map.removeLayer(id);
        }
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        /* map already disposed */
      }
    };
  }, [map, data, visible]);

  return null;
}
