import { useEffect, useMemo } from 'react';
import type maplibregl from 'maplibre-gl';
import { buildWindbreakLines } from '@ogden/shared';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import { useMapStore } from '../../store/mapStore.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';

interface WindbreakOverlayProps {
  projectId: string;
  map: maplibregl.Map | null;
  boundaryGeojson: GeoJSON.FeatureCollection | null | undefined;
}

const SOURCE_ID = 'windbreak-candidates';
const LINE_LAYER_ID = 'windbreak-candidates-line';
const LABEL_LAYER_ID = 'windbreak-candidates-label';

interface ClimateShape {
  prevailing_wind?: string | null;
}

/**
 * §6 Windbreak opportunity overlay — lifts the candidate windbreak lines from
 * the dashboard SVG minimap onto the main Mapbox map. Lines are computed
 * client-side from the parcel bbox + `climate.prevailing_wind` using the
 * shared `buildWindbreakLines` heuristic; no API call.
 */
export default function WindbreakOverlay({ projectId, map, boundaryGeojson }: WindbreakOverlayProps) {
  const visible = useMapStore((s) => s.windbreakVisible);
  const overlayOpacity = useMapStore((s) => s.overlayOpacity);
  const siteData = useSiteData(projectId);
  const climate = siteData ? getLayerSummary<ClimateShape>(siteData, 'climate') : null;

  const candidates = useMemo(() => {
    const bbox = computeBbox(boundaryGeojson);
    if (!bbox) return null;
    return buildWindbreakLines(bbox, climate?.prevailing_wind ?? null, 3);
  }, [boundaryGeojson, climate?.prevailing_wind]);

  const geojson = useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (!candidates || candidates.lines.length === 0) return null;
    return {
      type: 'FeatureCollection',
      features: candidates.lines.map((line, i) => ({
        type: 'Feature',
        properties: {
          index: i + 1,
          lengthM: Math.round(line.lengthM),
          faceAzimuth: Math.round(candidates.faceAzimuth),
          windAzimuth: Math.round(candidates.windAzimuth),
          windwardEdge: candidates.windwardEdge,
        },
        geometry: { type: 'LineString', coordinates: line.coords },
      })),
    };
  }, [candidates]);

  useEffect(() => {
    if (!map) return;

    const sync = () => {
      if (!map.isStyleLoaded()) return;

      if (visible && geojson) {
        const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
        if (src) {
          src.setData(geojson);
          if (map.getLayer(LINE_LAYER_ID)) {
            map.setPaintProperty(LINE_LAYER_ID, 'line-opacity', overlayOpacity);
          }
        } else {
          map.addSource(SOURCE_ID, { type: 'geojson', data: geojson });
          map.addLayer({
            id: LINE_LAYER_ID,
            type: 'line',
            source: SOURCE_ID,
            paint: {
              'line-color': '#8ac8ac',
              'line-width': 3,
              'line-dasharray': [1.8, 1.2],
              'line-opacity': overlayOpacity,
            },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
          });
          map.addLayer({
            id: LABEL_LAYER_ID,
            type: 'symbol',
            source: SOURCE_ID,
            layout: {
              'symbol-placement': 'line-center',
              'text-field': ['concat', 'Windbreak ', ['to-string', ['get', 'index']]],
              'text-size': 11,
              'text-offset': [0, -0.9],
            },
            paint: {
              'text-color': '#eaf2ec',
              'text-halo-color': 'rgba(16, 28, 22, 0.85)',
              'text-halo-width': 1.2,
            },
          });
        }
      } else {
        for (const id of [LABEL_LAYER_ID, LINE_LAYER_ID]) {
          if (map.getLayer(id)) map.removeLayer(id);
        }
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      }
    };

    sync();
    map.on('style.load', sync);
    return () => {
      map.off('style.load', sync);
    };
  }, [map, visible, geojson, overlayOpacity]);

  return null;
}

export function WindbreakToggle({ compact = false }: { compact?: boolean } = {}) {
  const visible = useMapStore((s) => s.windbreakVisible);
  const setVisible = useMapStore((s) => s.setWindbreakVisible);
  if (compact) {
    return (
      <DelayedTooltip label="Windbreak candidate overlay">
        <button
          onClick={() => setVisible(!visible)}
          aria-pressed={visible}
          className="spine-btn"
          data-active={visible}
          aria-label="Toggle windbreak candidate overlay"
        >
          {/* Lucide Wind — inlined */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
            <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
            <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
          </svg>
        </button>
      </DelayedTooltip>
    );
  }
  return (
    <DelayedTooltip label="Toggle windbreak candidate overlay">
      <button
        onClick={() => setVisible(!visible)}
        aria-pressed={visible}
        style={{
          padding: '6px 10px',
          borderRadius: 6,
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 500,
          background: visible ? '#8ac8ac' : 'var(--color-chrome-bg-translucent)',
          color: visible ? '#12251c' : '#c4b49a',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'auto',
        }}
      >
        Windbreaks
      </button>
    </DelayedTooltip>
  );
}

function computeBbox(
  geojson: GeoJSON.FeatureCollection | null | undefined,
): [number, number, number, number] | null {
  if (!geojson?.features?.length) return null;
  let minLon = Infinity, minLat = Infinity;
  let maxLon = -Infinity, maxLat = -Infinity;
  const visit = (ring: GeoJSON.Position[]) => {
    for (const coord of ring) {
      const lng = coord[0];
      const lat = coord[1];
      if (lng === undefined || lat === undefined) continue;
      if (lng < minLon) minLon = lng;
      if (lng > maxLon) maxLon = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  };
  for (const f of geojson.features) {
    if (f.geometry?.type === 'Polygon') {
      for (const ring of (f.geometry as GeoJSON.Polygon).coordinates) visit(ring);
    } else if (f.geometry?.type === 'MultiPolygon') {
      for (const poly of (f.geometry as GeoJSON.MultiPolygon).coordinates) {
        for (const ring of poly) visit(ring);
      }
    }
  }
  if (!isFinite(minLon)) return null;
  return [minLon, minLat, maxLon, maxLat];
}
