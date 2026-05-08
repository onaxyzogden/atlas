/**
 * PlanDataLayers — renders persisted Plan-stage features (water nodes, zones,
 * paths) as MapLibre layers on the Current Land map. Mirrors
 * `DesignElementLayers` but reads from the canonical Plan stores.
 *
 * Sources:
 *   - plan-poly       — polygons (catchments + zones)
 *   - plan-line       — lines (swales + paths)
 *   - plan-point      — points (storage + sink)
 *   - plan-label      — symbol labels (one per feature)
 */

import { useEffect, useMemo } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useWaterSystemsStore } from '../../../store/waterSystemsStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { usePathStore } from '../../../store/pathStore.js';
import { useCropStore } from '../../../store/cropStore.js';
import { useClosedLoopStore } from '../../../store/closedLoopStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import {
  useLayeringLensStore,
  RANK_COLOR,
} from '../../../store/layeringLensStore.js';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const SOURCE_PREFIX = 'plan-data-';
const LAYER_PREFIX = 'plan-data-';

const WATER_COLOR: Record<string, string> = {
  catchment: '#5fc7d4',
  storage: '#3a8fb7',
  swale: '#7cb6c8',
  sink: '#205c7a',
};

// Fertility-infra palette: structural practices (composter / hugelkultur /
// biochar / worm_bin) sit on warm earth tones; biological practices
// (cover_crop / chop_and_drop / dynamic_accumulator / rotational_grazing)
// sit on greens. Yeomans rank 7 (Soil).
const FERTILITY_COLOR: Record<string, string> = {
  composter:           '#8a6a3a',
  hugelkultur:         '#6a4a28',
  biochar:             '#3a2a1a',
  worm_bin:            '#a07050',
  cover_crop:          '#7aae3c',
  chop_and_drop:       '#6b8b3d',
  dynamic_accumulator: '#9bc15a',
  rotational_grazing:  '#a8c97f',
};

const FERTILITY_LABEL: Record<string, string> = {
  composter:           'Composter',
  hugelkultur:         'Hugelkultur',
  biochar:             'Biochar',
  worm_bin:            'Worm bin',
  cover_crop:          'Cover crop',
  chop_and_drop:       'Chop & drop',
  dynamic_accumulator: 'Accumulator',
  rotational_grazing:  'Rot. grazing',
};

/**
 * Build a MapLibre `match` expression that maps the per-feature
 * `yeomansRank` to a Yeomans-rank colour. Falls back to `color` if the
 * rank is missing (defensive — every plan-data feature now ships with a
 * rank).
 */
function rankColorExpr(): unknown {
  const branches: unknown[] = [];
  for (const [rank, color] of Object.entries(RANK_COLOR)) {
    branches.push(Number(rank), color);
  }
  return ['match', ['get', 'yeomansRank'], ...branches, ['get', 'color']];
}

export default function PlanDataLayers({ map, projectId }: Props) {
  const waterNodes = useWaterSystemsStore((s) => s.waterNodes);
  const zones = useZoneStore((s) => s.zones);
  const paths = usePathStore((s) => s.paths);
  const cropAreas = useCropStore((s) => s.cropAreas);
  const fertilityInfra = useClosedLoopStore((s) => s.fertilityInfra);
  const paddocks = useLivestockStore((s) => s.paddocks);
  const lensEnabled = useLayeringLensStore((s) => s.enabled);

  const { polyFC, lineFC, pointFC, labelFC } = useMemo(() => {
    const polys: GeoJSON.Feature[] = [];
    const lines: GeoJSON.Feature[] = [];
    const points: GeoJSON.Feature[] = [];
    const labels: GeoJSON.Feature[] = [];

    // Zones (polygon) — Yeomans rank 4 (Access; activity proximity).
    for (const z of zones) {
      if (z.projectId !== projectId) continue;
      const props = { id: z.id, color: z.color, label: z.name, yeomansRank: 4 };
      polys.push({ type: 'Feature', id: z.id, properties: props, geometry: z.geometry });
      try {
        const c = turf.centroid(z.geometry).geometry;
        labels.push({ type: 'Feature', id: z.id, properties: props, geometry: c });
      } catch {
        /* skip */
      }
    }

    // Crop areas (polygon) — Module 5 Plant Systems. Yeomans rank 8.
    for (const c of cropAreas) {
      if (c.projectId !== projectId) continue;
      const props = { id: c.id, color: c.color, label: c.name, yeomansRank: 8 };
      polys.push({ type: 'Feature', id: c.id, properties: props, geometry: c.geometry });
      try {
        const ctr = turf.centroid(c.geometry).geometry;
        labels.push({ type: 'Feature', id: c.id, properties: props, geometry: ctr });
      } catch {
        /* skip */
      }
    }

    // Paddocks (polygon) — Module 4 Livestock & Subdivision. Yeomans rank 9.
    for (const pd of paddocks) {
      if (pd.projectId !== projectId) continue;
      const props = { id: pd.id, color: pd.color, label: pd.name, yeomansRank: 9 };
      polys.push({ type: 'Feature', id: pd.id, properties: props, geometry: pd.geometry });
      try {
        const ctr = turf.centroid(pd.geometry).geometry;
        labels.push({ type: 'Feature', id: pd.id, properties: props, geometry: ctr });
      } catch {
        /* skip */
      }
    }

    // Paths (line) — Yeomans rank 4 (Access).
    for (const p of paths) {
      if (p.projectId !== projectId) continue;
      const props = { id: p.id, color: p.color, label: p.name, yeomansRank: 4 };
      lines.push({ type: 'Feature', id: p.id, properties: props, geometry: p.geometry });
    }

    // Fertility infra (point) — Module 6 Soil & Closed-Loop. Yeomans rank 7.
    for (const f of fertilityInfra) {
      if (f.projectId !== projectId) continue;
      const color = FERTILITY_COLOR[f.type] ?? '#8a6a3a';
      const label = FERTILITY_LABEL[f.type] ?? f.type;
      const props = { id: f.id, color, label, yeomansRank: 7 };
      points.push({
        type: 'Feature',
        id: f.id,
        properties: props,
        geometry: { type: 'Point', coordinates: f.center },
      });
      labels.push({
        type: 'Feature',
        id: f.id,
        properties: props,
        geometry: { type: 'Point', coordinates: f.center },
      });
    }

    // Water nodes — polygons (catchments use stored geometry? They don't —
    // catchment geometry isn't on WaterNode. v1: render storage/sink as
    // points; render swale as a thin line if a length is set; skip catchment
    // polygon rendering until WaterNode carries geometry. The Plan slide-up
    // cards already show catchments as a list; the map shows the rest.
    for (const n of waterNodes) {
      if (n.projectId !== projectId) continue;
      const color = WATER_COLOR[n.kind] ?? '#5fc7d4';
      const props = { id: n.id, color, label: n.name };
      // No geometry stored on WaterNode itself — skip in v1 (the slide-up
      // remains the canonical readout). Future: persist geometry on node.
      void props;
    }

    return {
      polyFC: { type: 'FeatureCollection' as const, features: polys },
      lineFC: { type: 'FeatureCollection' as const, features: lines },
      pointFC: { type: 'FeatureCollection' as const, features: points },
      labelFC: { type: 'FeatureCollection' as const, features: labels },
    };
  }, [waterNodes, zones, paths, cropAreas, fertilityInfra, paddocks, projectId]);

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

      const ensureLayer = (spec: maplibregl.LayerSpecification) => {
        if (!map.getLayer(spec.id)) map.addLayer(spec);
      };

      // Colour expression toggles between per-feature `color` (default) and
      // a Yeomans-rank `match` (when the layering lens is enabled).
      const colorExpr = lensEnabled ? rankColorExpr() : ['get', 'color'];

      ensureLayer({
        id: `${LAYER_PREFIX}poly-fill`,
        type: 'fill',
        source: polySid,
        paint: { 'fill-color': colorExpr as never, 'fill-opacity': 0.28 },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}poly-line`,
        type: 'line',
        source: polySid,
        paint: {
          'line-color': colorExpr as never,
          'line-width': 1.5,
          'line-opacity': 0.9,
        },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}line`,
        type: 'line',
        source: lineSid,
        paint: {
          'line-color': colorExpr as never,
          'line-width': 2,
          'line-opacity': 0.9,
        },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}point`,
        type: 'circle',
        source: pointSid,
        paint: {
          'circle-radius': 6,
          'circle-color': colorExpr as never,
          'circle-stroke-color': '#1f1d1a',
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.95,
        },
      });

      // Re-apply paint properties on existing layers so the toggle takes
      // effect for already-created layers (ensureLayer is a no-op when the
      // layer exists).
      try {
        map.setPaintProperty(`${LAYER_PREFIX}poly-fill`, 'fill-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}poly-line`, 'line-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}line`, 'line-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}point`, 'circle-color', colorExpr as never);
      } catch {
        /* layer may have been removed mid-toggle */
      }
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
  }, [map, polyFC, lineFC, pointFC, labelFC, lensEnabled]);

  // Cleanup on unmount.
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
