/**
 * ActDataLayers — renders persisted ACT-stage execution events as MapLibre
 * markers on top of read-only Plan/Observe layers. Mirrors PlanDataLayers'
 * source/layer lifecycle but for events, not authored geometry.
 *
 * Sources / layers:
 *   - act-data-harvest         (circle) — one point per HarvestEntry, placed
 *                               at the centroid of its parent Plan crop area
 *   - act-data-harvest-label   (symbol) — short "qty unit" label at high zoom
 *
 * Recency shading: an entry within the last 30 days renders in estate gold
 * (#c4a265); older entries fade to muted clay (#8a6a4a). Single-figure colour
 * choice — no colour ramp expression — to keep paint expressions trivial.
 */

import { useEffect, useMemo } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useHarvestLogStore } from '../../../store/harvestLogStore.js';
import { useCropStore } from '../../../store/cropStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useMaintenanceLogStore } from '../../../store/maintenanceLogStore.js';
import { useWaterSystemsStore } from '../../../store/waterSystemsStore.js';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const SOURCE_PREFIX = 'act-data-';
const LAYER_PREFIX = 'act-data-';

const RECENT_MS = 30 * 24 * 60 * 60 * 1000;
const RECENT_COLOR = '#c4a265';
const STALE_COLOR = '#8a6a4a';

export default function ActDataLayers({ map, projectId }: Props) {
  const entries = useHarvestLogStore((s) => s.entries);
  const cropAreas = useCropStore((s) => s.cropAreas);
  const paddocks = useLivestockStore((s) => s.paddocks);
  const maintEvents = useMaintenanceLogStore((s) => s.events);
  const earthworks = useWaterSystemsStore((s) => s.earthworks);
  const storageInfra = useWaterSystemsStore((s) => s.storageInfra);

  const harvestFC = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = [];
    const cropById = new Map(cropAreas.map((c) => [c.id, c]));
    const paddockById = new Map(paddocks.map((p) => [p.id, p]));
    const now = Date.now();

    const centroidOf = (geom: GeoJSON.Polygon): [number, number] | null => {
      try {
        const c = turf.centroid(geom).geometry.coordinates;
        if (typeof c[0] !== 'number' || typeof c[1] !== 'number') return null;
        return [c[0], c[1]];
      } catch {
        return null;
      }
    };

    for (const e of entries) {
      if (e.projectId !== projectId) continue;
      let center: [number, number] | null = null;
      let sourceName = '';
      if (e.sourceKind === 'livestock') {
        const pid = e.paddockId;
        const paddock = pid ? paddockById.get(pid) : undefined;
        if (!paddock) continue;
        center = centroidOf(paddock.geometry);
        sourceName = paddock.name;
      } else {
        const crop = cropById.get(e.cropAreaId);
        if (!crop) continue;
        center = centroidOf(crop.geometry);
        sourceName = crop.name;
      }
      if (!center) continue;
      const ageMs = now - new Date(e.date).getTime();
      const recent = Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= RECENT_MS;
      features.push({
        type: 'Feature',
        id: e.id,
        properties: {
          id: e.id,
          color: recent ? RECENT_COLOR : STALE_COLOR,
          label: `${e.quantity} ${e.unit}`,
          sourceKind: e.sourceKind,
          sourceName,
        },
        geometry: { type: 'Point', coordinates: center },
      });
    }

    return { type: 'FeatureCollection', features };
  }, [entries, cropAreas, paddocks, projectId]);

  const maintenanceFC = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = [];
    const earthworkById = new Map(earthworks.map((w) => [w.id, w]));
    const storageById = new Map(storageInfra.map((s) => [s.id, s]));
    const now = Date.now();

    for (const ev of maintEvents) {
      if (ev.projectId !== projectId) continue;
      let center: [number, number] | null = null;
      let sourceName = '';
      if (ev.sourceKind === 'earthwork') {
        const w = earthworkById.get(ev.sourceId);
        if (!w) continue;
        try {
          const coords = w.geometry.coordinates;
          if (!Array.isArray(coords) || coords.length === 0) continue;
          const mid = coords[Math.floor(coords.length / 2)];
          if (typeof mid?.[0] !== 'number' || typeof mid?.[1] !== 'number') continue;
          center = [mid[0], mid[1]];
        } catch {
          continue;
        }
        sourceName = w.type.replace('_', ' ');
      } else {
        const s = storageById.get(ev.sourceId);
        if (!s) continue;
        center = s.center;
        sourceName = s.type.replace('_', ' ');
      }
      if (!center) continue;
      const ageMs = now - new Date(ev.date).getTime();
      const recent = Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= RECENT_MS;
      features.push({
        type: 'Feature',
        id: ev.id,
        properties: {
          id: ev.id,
          color: recent ? RECENT_COLOR : STALE_COLOR,
          label: ev.action,
          sourceKind: ev.sourceKind,
          sourceName,
        },
        geometry: { type: 'Point', coordinates: center },
      });
    }

    return { type: 'FeatureCollection', features };
  }, [maintEvents, earthworks, storageInfra, projectId]);

  useEffect(() => {
    if (!map) return;

    const apply = () => {
      if ((map.getStyle()?.layers?.length ?? 0) === 0) return;

      const sid = `${SOURCE_PREFIX}harvest`;
      const existing = map.getSource(sid) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (existing) existing.setData(harvestFC);
      else map.addSource(sid, { type: 'geojson', data: harvestFC, promoteId: 'id' });

      if (!map.getLayer(`${LAYER_PREFIX}harvest`)) {
        map.addLayer({
          id: `${LAYER_PREFIX}harvest`,
          type: 'circle',
          source: sid,
          paint: {
            'circle-radius': 6,
            'circle-color': ['get', 'color'],
            'circle-stroke-color': '#1f1d1a',
            'circle-stroke-width': 1.5,
            'circle-opacity': 0.95,
          },
        });
      }
      if (!map.getLayer(`${LAYER_PREFIX}harvest-label`)) {
        map.addLayer({
          id: `${LAYER_PREFIX}harvest-label`,
          type: 'symbol',
          source: sid,
          minzoom: 16,
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 10,
            'text-offset': [0, 1.0],
            'text-anchor': 'top',
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': '#f2ede3',
            'text-halo-color': 'rgba(31, 29, 26, 0.85)',
            'text-halo-width': 1.2,
          },
        });
      }

      // Maintenance events — square markers (visually distinct from harvest circles).
      const msid = `${SOURCE_PREFIX}maintenance`;
      const mexisting = map.getSource(msid) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (mexisting) mexisting.setData(maintenanceFC);
      else map.addSource(msid, { type: 'geojson', data: maintenanceFC, promoteId: 'id' });

      if (!map.getLayer(`${LAYER_PREFIX}maintenance`)) {
        map.addLayer({
          id: `${LAYER_PREFIX}maintenance`,
          type: 'circle',
          source: msid,
          paint: {
            'circle-radius': 5,
            'circle-color': ['get', 'color'],
            'circle-stroke-color': '#1f1d1a',
            'circle-stroke-width': 2,
            'circle-opacity': 0.95,
            // Diamond-ish look via larger stroke + inner color, but
            // staying with 'circle' to keep paint expressions trivial.
          },
        });
      }
      if (!map.getLayer(`${LAYER_PREFIX}maintenance-label`)) {
        map.addLayer({
          id: `${LAYER_PREFIX}maintenance-label`,
          type: 'symbol',
          source: msid,
          minzoom: 16,
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 10,
            'text-offset': [0, 1.0],
            'text-anchor': 'top',
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': '#f2ede3',
            'text-halo-color': 'rgba(31, 29, 26, 0.85)',
            'text-halo-width': 1.2,
          },
        });
      }
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
  }, [map, harvestFC, maintenanceFC]);

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
        const sources = (map.getStyle()?.sources ?? {}) as Record<string, unknown>;
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
