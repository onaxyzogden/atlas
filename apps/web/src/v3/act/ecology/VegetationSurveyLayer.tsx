/**
 * VegetationSurveyLayer -- renders the drawn s2-ecology-c1 vegetation-community
 * polygons as persistent MapLibre layers (fill + line + centroid label),
 * colour-coded per community. Mounted as a DiagnoseMap render-prop child while
 * the survey rail-takeover is open.
 *
 * Mirrors the minimal ObserveAnnotationLayers source/layer idiom: one GeoJSON
 * source, ensure-layer on first add, re-applied on `style.load` so it survives
 * basemap swaps, and best-effort teardown on unmount (the map may already be
 * half-destroyed on a route change).
 */

import { useEffect, useMemo } from 'react';
import type {
  Map as MaplibreMap,
  ExpressionSpecification,
} from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  useVegetationSurveyStore,
  VEG_COMMUNITY_COLORS,
  type VegCommunityKey,
} from '../../../store/vegetationSurveyStore.js';
import { VEG_COMMUNITIES } from '../tier-shell/EcologyCapture.js';

const SOURCE_ID = 'veg-survey-src';
const FILL_LAYER = 'veg-survey-fill';
const LINE_LAYER = 'veg-survey-line';
const LABEL_LAYER = 'veg-survey-label';

const LABEL_BY_KEY: Record<string, string> = Object.fromEntries(
  VEG_COMMUNITIES.map((c) => [c.key, c.label]),
);

/** ['match', ['get','community'], key, color, ..., fallback] */
function buildColorMatch(): ExpressionSpecification {
  const stops: (string | string[])[] = [];
  for (const [key, color] of Object.entries(VEG_COMMUNITY_COLORS)) {
    stops.push(key, color);
  }
  return [
    'match',
    ['get', 'community'],
    ...stops,
    '#7a8c62',
  ] as unknown as ExpressionSpecification;
}

interface Props {
  map: MaplibreMap;
  projectId: string;
}

export default function VegetationSurveyLayer({ map, projectId }: Props) {
  const byProject = useVegetationSurveyStore((s) => s.byProject);

  const data = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = [];
    const rows = byProject[projectId] ?? {};
    for (const f of Object.values(rows)) {
      // Polygon fill/line feature.
      features.push({
        type: 'Feature',
        properties: { community: f.community, kind: 'poly' },
        geometry: f.geometry,
      });
      // Centroid label feature (carries the community label text).
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
            community: f.community,
            kind: 'label',
            label: LABEL_BY_KEY[f.community] ?? f.community,
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
      } catch {
        /* map mid-teardown; the next style.load re-applies */
      }
    };

    apply();
    const onStyle = () => apply();
    map.on('style.load', onStyle);

    return () => {
      try {
        map.off('style.load', onStyle);
        for (const id of [LABEL_LAYER, LINE_LAYER, FILL_LAYER]) {
          if (map.getLayer(id)) map.removeLayer(id);
        }
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        /* map already disposed */
      }
    };
  }, [map, data]);

  return null;
}

// Re-export the community key type for sibling components that import the
// layer module first (keeps the ecology-folder imports cohesive).
export type { VegCommunityKey };
