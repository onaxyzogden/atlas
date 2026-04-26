import { useEffect, useMemo, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  dijkstraLCP,
  frictionForCell,
  pickCorridorAnchors,
  gridDims,
  type ZoneInput,
} from '@ogden/shared';
import { api } from '../../lib/apiClient.js';
import { useMapStore } from '../../store/mapStore.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';

interface BiodiversityCorridorOverlayProps {
  projectId: string;
  map: maplibregl.Map | null;
}

const BAND_SOURCE_ID = 'biodiversity-corridor-band';
const LINE_SOURCE_ID = 'biodiversity-corridor-line';
const ANCHOR_SOURCE_ID = 'biodiversity-corridor-anchors';
const BAND_LAYER_ID = 'biodiversity-corridor-band-fill';
const LINE_LAYER_ID = 'biodiversity-corridor-line-stroke';
const ANCHOR_LAYER_ID = 'biodiversity-corridor-anchors-circle';

interface CorridorGeo {
  line: GeoJSON.Feature<GeoJSON.LineString>;
  band: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
  anchors: GeoJSON.FeatureCollection<GeoJSON.Point>;
}

function buildCorridorGeo(
  geojson: GeoJSON.FeatureCollection,
): CorridorGeo | null {
  const features = geojson.features.filter(
    (f): f is GeoJSON.Feature<GeoJSON.Point> =>
      f.geometry?.type === 'Point' && typeof (f.properties as { zoneId?: number } | null)?.zoneId === 'number',
  );
  if (features.length < 4) return null;

  const totalZones = features.length;
  const coordsByZone = new Map<number, [number, number]>();
  const zones: ZoneInput[] = [];
  for (const f of features) {
    const props = f.properties as {
      zoneId: number;
      primaryIntervention?: string;
      coverClass?: string | null;
      disturbanceLevel?: number | null;
    } | null;
    if (!props) continue;
    const [lon, lat] = f.geometry.coordinates as [number, number];
    coordsByZone.set(props.zoneId, [lon, lat]);
    zones.push({
      zoneId: props.zoneId,
      primaryIntervention: props.primaryIntervention ?? null,
      coverClass: props.coverClass ?? null,
      disturbanceLevel: props.disturbanceLevel ?? null,
    });
  }

  const { cols, rows } = gridDims(totalZones);
  const minCellDistance = Math.max(2, Math.hypot(rows, cols) * 0.35);
  const anchors = pickCorridorAnchors(zones, totalZones, minCellDistance);
  if (!anchors) return null;

  const frictionByZone = new Map<number, number>();
  for (const z of zones) {
    frictionByZone.set(
      z.zoneId,
      frictionForCell({
        intervention: z.primaryIntervention,
        coverClass: z.coverClass,
        disturbanceLevel: z.disturbanceLevel,
      }),
    );
  }

  const lcp = dijkstraLCP(totalZones, anchors.source.zoneId, anchors.sink.zoneId, frictionByZone);
  if (!lcp || lcp.pathZoneIds.length < 2) return null;

  const pathCoords: [number, number][] = [];
  for (const zid of lcp.pathZoneIds) {
    const c = coordsByZone.get(zid);
    if (c) pathCoords.push(c);
  }
  if (pathCoords.length < 2) return null;

  const line = turf.lineString(pathCoords);
  // 50 m buffer gives a planning-scale "corridor band" that reads at parcel zoom
  // without dominating the interventions it traverses.
  const band = turf.buffer(line, 50, { units: 'meters' }) as GeoJSON.Feature<
    GeoJSON.Polygon | GeoJSON.MultiPolygon
  >;

  const sourceCoord = coordsByZone.get(anchors.source.zoneId);
  const sinkCoord = coordsByZone.get(anchors.sink.zoneId);
  const anchorFeatures: GeoJSON.Feature<GeoJSON.Point>[] = [];
  if (sourceCoord) {
    anchorFeatures.push(turf.point(sourceCoord, { role: 'source' }));
  }
  if (sinkCoord) {
    anchorFeatures.push(turf.point(sinkCoord, { role: 'sink' }));
  }

  return {
    line,
    band,
    anchors: { type: 'FeatureCollection', features: anchorFeatures },
  };
}

/**
 * §7 Biodiversity corridor overlay. Paints a least-cost-path connectivity
 * candidate between the two farthest high-opportunity habitat anchors on
 * the `soil_regeneration` grid. Friction is a zone-polygonized land-cover ×
 * impedance surface (forest/wetland most permeable → urban/water near-barriers)
 * scaled by disturbance and discounted by planned permeable interventions.
 * Still planning-grade, not a true pixel raster. Deferred: regional-plant
 * lists, Steiner-tree multi-anchor corridors, true pixel-scale friction
 * raster, cross-parcel links.
 */
export default function BiodiversityCorridorOverlay({
  projectId,
  map,
}: BiodiversityCorridorOverlayProps) {
  const visible = useMapStore((s) => s.biodiversityCorridorVisible);
  const overlayOpacity = useMapStore((s) => s.overlayOpacity);
  const [rawGeojson, setRawGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!visible || fetched) return;
    api.layers
      .get(projectId, 'soil_regeneration')
      .then((res) => {
        const data = (res as { data?: { geojsonData?: GeoJSON.FeatureCollection | null } }).data;
        if (data?.geojsonData && data.geojsonData.type === 'FeatureCollection') {
          setRawGeojson(data.geojsonData);
        }
      })
      .catch(() => { /* layer not materialised yet — leave null */ })
      .finally(() => setFetched(true));
  }, [visible, fetched, projectId]);

  const corridor = useMemo(() => (rawGeojson ? buildCorridorGeo(rawGeojson) : null), [rawGeojson]);

  useEffect(() => {
    if (!map) return;

    const sync = () => {
      if (!map.isStyleLoaded()) return;

      if (visible && corridor) {
        // Sources
        const bandSrc = map.getSource(BAND_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
        const lineSrc = map.getSource(LINE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
        const anchorSrc = map.getSource(ANCHOR_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;

        if (bandSrc && lineSrc && anchorSrc) {
          bandSrc.setData(corridor.band);
          lineSrc.setData(corridor.line);
          anchorSrc.setData(corridor.anchors);
          if (map.getLayer(BAND_LAYER_ID)) {
            map.setPaintProperty(BAND_LAYER_ID, 'fill-opacity', overlayOpacity * 0.28);
          }
          if (map.getLayer(LINE_LAYER_ID)) {
            map.setPaintProperty(LINE_LAYER_ID, 'line-opacity', overlayOpacity * 0.9);
          }
          if (map.getLayer(ANCHOR_LAYER_ID)) {
            map.setPaintProperty(ANCHOR_LAYER_ID, 'circle-opacity', overlayOpacity);
          }
        } else {
          map.addSource(BAND_SOURCE_ID, { type: 'geojson', data: corridor.band });
          map.addSource(LINE_SOURCE_ID, { type: 'geojson', data: corridor.line });
          map.addSource(ANCHOR_SOURCE_ID, { type: 'geojson', data: corridor.anchors });

          map.addLayer({
            id: BAND_LAYER_ID,
            type: 'fill',
            source: BAND_SOURCE_ID,
            paint: {
              'fill-color': '#6ba47a',
              'fill-opacity': overlayOpacity * 0.28,
            },
          });
          map.addLayer({
            id: LINE_LAYER_ID,
            type: 'line',
            source: LINE_SOURCE_ID,
            paint: {
              'line-color': '#4f7f5a',
              'line-opacity': overlayOpacity * 0.9,
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                10, 1.5,
                14, 2.5,
                18, 4,
              ],
            },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
          });
          map.addLayer({
            id: ANCHOR_LAYER_ID,
            type: 'circle',
            source: ANCHOR_SOURCE_ID,
            paint: {
              'circle-color': '#6ba47a',
              'circle-stroke-color': '#1a1a1a',
              'circle-stroke-width': 1.5,
              'circle-opacity': overlayOpacity,
              'circle-radius': 6,
            },
          });
        }
      } else {
        for (const id of [ANCHOR_LAYER_ID, LINE_LAYER_ID, BAND_LAYER_ID]) {
          if (map.getLayer(id)) map.removeLayer(id);
        }
        for (const id of [ANCHOR_SOURCE_ID, LINE_SOURCE_ID, BAND_SOURCE_ID]) {
          if (map.getSource(id)) map.removeSource(id);
        }
      }
    };

    sync();
    map.on('style.load', sync);
    return () => {
      map.off('style.load', sync);
    };
  }, [map, visible, corridor, overlayOpacity]);

  return null;
}

export function BiodiversityCorridorToggle() {
  const visible = useMapStore((s) => s.biodiversityCorridorVisible);
  const setVisible = useMapStore((s) => s.setBiodiversityCorridorVisible);
  return (
    <DelayedTooltip label="Biodiversity corridor" position="right">
      <button
        onClick={() => setVisible(!visible)}
        aria-pressed={visible}
        className={`spine-btn${visible ? ' signifier-shimmer' : ''}`}
        data-active={visible}
        aria-label="Toggle biodiversity corridor overlay"
      >
        {/* Lucide Waypoints — connectivity signifier */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="4.5" r="2.5" />
          <circle cx="12" cy="19.5" r="2.5" />
          <circle cx="4.5" cy="12" r="2.5" />
          <circle cx="19.5" cy="12" r="2.5" />
          <path d="M6.5 10.5 10 7" />
          <path d="M14 7l3.5 3.5" />
          <path d="M17.5 13.5 14 17" />
          <path d="M10 17l-3.5-3.5" />
        </svg>
      </button>
    </DelayedTooltip>
  );
}
