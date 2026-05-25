/**
 * PlanWaterRouterOverlay — Rec #3 v2 map surfacing of the water-router audit.
 *
 * The WaterRouterCard (Plan · Module 2 · Water) audits drawn water-harvest
 * elements (tanks, ponds, swales) and flags those placed low in the watershed,
 * where gravity head is squandered. v1 was textual-only. This overlay renders
 * the same verdict on the Plan-stage map:
 *   - a **downslope flow arrow** from every scored element's centroid, tracing
 *     the catchment gravity would carry its water toward (colour by tier); and
 *   - a **suggested-catchment pin** at the parcel's upper-third coordinate for
 *     each low-potential element (the one-click "move" still lives on the card).
 *
 * Read-only — mirrors PlanScheduledMovesOverlay's lifecycle exactly
 * (ensure-source/ensure-layer, re-apply on `styledata`, visibility gated on a
 * matrix toggle). Gated on `useMatrixTogglesStore.waterRouter`; default off.
 *
 * Elevation model is the v1 aspect-projected heuristic (no DEM sampler passed
 * to `computeFlowPath`); the DEM swap point is `estimateElevationM`, unchanged.
 */

import { useEffect, useMemo } from 'react';
import { maplibregl } from '../../../lib/maplibre.js';
import { useMatrixTogglesStore } from '../../../store/matrixTogglesStore.js';
import { useLandDesignStore } from '../../../store/landDesignStore.js';
import { useProjectStore } from '../../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import {
  aspectToBearingDeg,
  buildParcelBox,
  computeWaterRows,
  type ParcelBox,
} from '../cards/water-management/waterRouterMath.js';
import { computeFlowPath } from '../cards/water-management/waterFlowPath.js';

const SOURCE_ID = 'plan-water-router-source';
const LINE_LAYER = 'plan-water-router-line';
const PIN_LAYER = 'plan-water-router-pin';

interface ElevationSummary {
  min_elevation_m?: number;
  max_elevation_m?: number;
  predominant_aspect?: string;
}

const TIER_COLOR: Record<string, string> = {
  excellent: '#2f8f4e',
  adequate: '#9a7b1f',
  'low-potential': '#a3401d',
};

interface Props {
  map: maplibregl.Map;
  projectId: string;
}

export default function PlanWaterRouterOverlay({ map, projectId }: Props) {
  const visible = useMatrixTogglesStore((s) => s.waterRouter);
  const byProject = useLandDesignStore((s) => s.byProject);
  const project = useProjectStore((s) =>
    s.projects.find((p) => p.id === projectId),
  );
  const siteData = useSiteData(projectId);

  const elev = useMemo(() => {
    if (!siteData) return null;
    return getLayerSummary<ElevationSummary>(siteData, 'elevation');
  }, [siteData]);

  const fc = useMemo<GeoJSON.FeatureCollection>(() => {
    const empty: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    };
    const parcel = project?.parcelBoundaryGeojson ?? null;
    if (!parcel || (parcel.features?.length ?? 0) === 0) return empty;
    const minM = elev?.min_elevation_m;
    const maxM = elev?.max_elevation_m;
    if (typeof minM !== 'number' || typeof maxM !== 'number' || maxM <= minM) {
      return empty;
    }
    const bearing = aspectToBearingDeg(elev?.predominant_aspect ?? null);
    if (bearing === null) return empty;
    const box: ParcelBox | null = buildParcelBox(parcel, bearing);
    if (!box) return empty;

    const rows = computeWaterRows(byProject[projectId] ?? [], box, minM, maxM);
    const features: GeoJSON.Feature[] = [];
    for (const r of rows) {
      // Downslope flow arrow from the element centroid.
      const flow = computeFlowPath(r.centroid, box, {
        minElevationM: minM,
        maxElevationM: maxM,
      });
      if (flow) {
        features.push({
          type: 'Feature',
          id: `flow-${r.id}`,
          geometry: flow.geometry,
          properties: { kind: 'flow', tier: r.tier, color: TIER_COLOR[r.tier] },
        });
      }
      // Suggested-catchment pin for low-potential placements.
      if (r.tier === 'low-potential' && r.suggestion) {
        features.push({
          type: 'Feature',
          id: `pin-${r.id}`,
          geometry: { type: 'Point', coordinates: r.suggestion },
          properties: {
            kind: 'pin',
            label: `⚑ ${r.label}`,
          },
        });
      }
    }
    return { type: 'FeatureCollection', features };
  }, [project?.parcelBoundaryGeojson, elev, byProject, projectId]);

  useEffect(() => {
    if (!map) return;

    const ensure = () => {
      const src = map.getSource(SOURCE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!src) {
        map.addSource(SOURCE_ID, { type: 'geojson', data: fc });
      } else {
        src.setData(fc);
      }
      if (!map.getLayer(LINE_LAYER)) {
        map.addLayer({
          id: LINE_LAYER,
          type: 'line',
          source: SOURCE_ID,
          filter: ['==', ['geometry-type'], 'LineString'],
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2.5,
            'line-opacity': 0.85,
            'line-dasharray': [2, 1.5],
          },
        });
      }
      if (!map.getLayer(PIN_LAYER)) {
        map.addLayer({
          id: PIN_LAYER,
          type: 'symbol',
          source: SOURCE_ID,
          filter: ['==', ['geometry-type'], 'Point'],
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 12,
            'text-anchor': 'bottom',
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-padding': 2,
          },
          paint: {
            'text-color': '#a3401d',
            'text-halo-color': '#f7efd8',
            'text-halo-width': 3,
            'text-halo-blur': 0.5,
          },
        });
      }
      [LINE_LAYER, PIN_LAYER].forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(
            id,
            'visibility',
            visible ? 'visible' : 'none',
          );
        }
      });
    };

    const ready = () => (map.getStyle()?.layers?.length ?? 0) > 0;
    if (ready()) ensure();
    const onStyle = () => {
      if (!ready()) return;
      ensure();
    };
    map.on('styledata', onStyle);
    return () => {
      map.off('styledata', onStyle);
    };
  }, [map, fc, visible]);

  return null;
}
