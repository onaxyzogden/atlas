import { useEffect, useMemo, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { useMapStore } from '../../store/mapStore.js';
import { semantic } from '../../lib/tokens.js';

interface OsmVectorOverlayProps {
  map: maplibregl.Map | null;
  boundaryGeojson?: GeoJSON.FeatureCollection | null | undefined;
}

const OVERPASS = 'https://overpass-api.de/api/interpreter';

const LAYER_IDS = {
  roads: 'osm-roads',
  water: { fill: 'osm-water-fill', line: 'osm-water-line' },
  buildings: 'osm-buildings',
};
const SOURCE_IDS = {
  roads: 'osm-roads-src',
  water: 'osm-water-src',
  buildings: 'osm-buildings-src',
};

interface OsmFc {
  roads: GeoJSON.FeatureCollection;
  water: GeoJSON.FeatureCollection;
  buildings: GeoJSON.FeatureCollection;
}

function bboxOf(fc: GeoJSON.FeatureCollection | null | undefined): [number, number, number, number] | null {
  if (!fc?.features?.length) return null;
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  const visit = (c: unknown) => {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === 'number' && typeof c[1] === 'number') {
      if (c[0] < minLng) minLng = c[0] as number;
      if (c[0] > maxLng) maxLng = c[0] as number;
      if (c[1] < minLat) minLat = c[1] as number;
      if (c[1] > maxLat) maxLat = c[1] as number;
      return;
    }
    for (const item of c) visit(item);
  };
  for (const f of fc.features) visit((f.geometry as { coordinates: unknown }).coordinates);
  if (minLng === Infinity) return null;
  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Overpass returns { elements: [{ type, geometry: [{lat,lng},...], tags }] }
 * when we use `out geom`. Convert to GeoJSON FeatureCollections split by kind.
 */
interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  geometry?: { lat: number; lon: number }[];
  tags?: Record<string, string>;
}

function elementsToFc(elements: OverpassElement[]): OsmFc {
  const roads: GeoJSON.Feature[] = [];
  const water: GeoJSON.Feature[] = [];
  const buildings: GeoJSON.Feature[] = [];
  for (const el of elements) {
    if (el.type !== 'way' || !el.geometry?.length) continue;
    const coords = el.geometry.map((p) => [p.lon, p.lat] as [number, number]);
    const tags = el.tags ?? {};
    if (tags.highway) {
      roads.push({ type: 'Feature', properties: { class: tags.highway }, geometry: { type: 'LineString', coordinates: coords } });
    } else if (tags.natural === 'water' || tags.water || tags.waterway) {
      const isPoly = coords.length > 2 && coords[0]![0] === coords[coords.length - 1]![0] && coords[0]![1] === coords[coords.length - 1]![1];
      water.push({
        type: 'Feature',
        properties: { class: tags.waterway ?? tags.water ?? 'water' },
        geometry: isPoly ? { type: 'Polygon', coordinates: [coords] } : { type: 'LineString', coordinates: coords },
      });
    } else if (tags.building) {
      buildings.push({ type: 'Feature', properties: { class: tags.building }, geometry: { type: 'Polygon', coordinates: [coords] } });
    }
  }
  return {
    roads: { type: 'FeatureCollection', features: roads },
    water: { type: 'FeatureCollection', features: water },
    buildings: { type: 'FeatureCollection', features: buildings },
  };
}

/**
 * §2 Phase 5 — OSM roads/water/buildings overlay. Fetches features in the
 * parcel bbox from the Overpass API once on mount; visibility of each kind is
 * controlled via mapStore.osmLayersVisible. Paint opacity is multiplied by the
 * global overlayOpacity so the dedicated slider dims everything together.
 */
export default function OsmVectorOverlay({ map, boundaryGeojson }: OsmVectorOverlayProps) {
  const osmVisible = useMapStore((s) => s.osmLayersVisible);
  const opacity = useMapStore((s) => s.overlayOpacity);
  const setOsmOverlayStatus = useMapStore((s) => s.setOsmOverlayStatus);
  const [data, setData] = useState<OsmFc | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const bbox = useMemo(() => bboxOf(boundaryGeojson), [boundaryGeojson]);
  const anyVisible = osmVisible.roads || osmVisible.water || osmVisible.buildings;
  const cacheKey = bbox
    ? `osm-overlay:${bbox.map((n) => n.toFixed(4)).join(',')}`
    : null;

  // Fetch once when first enabled and we have a bbox. Cached in localStorage
  // for 24h to avoid re-hitting Overpass on repeat panel toggles.
  useEffect(() => {
    if (!anyVisible || !bbox || !cacheKey || data || err || loading) return;

    // Cache hit?
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw) as { ts: number; data: OsmFc };
        if (Date.now() - cached.ts < 24 * 60 * 60 * 1000) {
          setData(cached.data);
          setOsmOverlayStatus('ready');
          return;
        }
      }
    } catch { /* fall through to fetch */ }

    setLoading(true);
    setOsmOverlayStatus('loading');
    const [minLng, minLat, maxLng, maxLat] = bbox;
    // Overpass bbox order: south,west,north,east
    const q = `[out:json][timeout:25];(
  way["highway"](${minLat},${minLng},${maxLat},${maxLng});
  way["natural"="water"](${minLat},${minLng},${maxLat},${maxLng});
  way["waterway"](${minLat},${minLng},${maxLat},${maxLng});
  way["building"](${minLat},${minLng},${maxLat},${maxLng});
);out geom;`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30_000);

    fetch(OVERPASS, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(q),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: ctrl.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Overpass returned ${r.status}`);
        return r.json() as Promise<{ elements: OverpassElement[] }>;
      })
      .then((json) => {
        const fc = elementsToFc(json.elements ?? []);
        setData(fc);
        setOsmOverlayStatus('ready');
        try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: fc })); } catch { /* quota */ }
      })
      .catch((e: Error) => {
        const msg = e.name === 'AbortError' ? 'Overpass request timed out' : e.message;
        setErr(msg);
        setOsmOverlayStatus('error', msg);
      })
      .finally(() => { clearTimeout(timer); setLoading(false); });

    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [anyVisible, bbox, cacheKey, data, err, loading, setOsmOverlayStatus]);

  // Sync layers to the map when data or visibility changes.
  useEffect(() => {
    if (!map || !data) return;
    const sync = () => {
      if (!map.isStyleLoaded()) return;

      // ── Roads ─────────────────────────────────────────────────────────
      if (osmVisible.roads) {
        if (!map.getSource(SOURCE_IDS.roads)) {
          map.addSource(SOURCE_IDS.roads, { type: 'geojson', data: data.roads });
          map.addLayer({
            id: LAYER_IDS.roads,
            type: 'line',
            source: SOURCE_IDS.roads,
            paint: {
              'line-color': '#e9decb',
              'line-width': ['match', ['get', 'class'],
                ['motorway', 'trunk'], 3,
                ['primary', 'secondary'], 2,
                1.2,
              ],
              'line-opacity': opacity * 0.85,
            },
          });
        } else {
          map.setPaintProperty(LAYER_IDS.roads, 'line-opacity', opacity * 0.85);
        }
      } else if (map.getLayer(LAYER_IDS.roads)) {
        map.removeLayer(LAYER_IDS.roads);
        map.removeSource(SOURCE_IDS.roads);
      }

      // ── Water ─────────────────────────────────────────────────────────
      if (osmVisible.water) {
        if (!map.getSource(SOURCE_IDS.water)) {
          map.addSource(SOURCE_IDS.water, { type: 'geojson', data: data.water });
          map.addLayer({
            id: LAYER_IDS.water.fill,
            type: 'fill',
            source: SOURCE_IDS.water,
            filter: ['==', ['geometry-type'], 'Polygon'],
            paint: { 'fill-color': '#4a90d9', 'fill-opacity': opacity * 0.4 },
          });
          map.addLayer({
            id: LAYER_IDS.water.line,
            type: 'line',
            source: SOURCE_IDS.water,
            paint: { 'line-color': '#2d6b9e', 'line-width': 1.5, 'line-opacity': opacity * 0.8 },
          });
        } else {
          map.setPaintProperty(LAYER_IDS.water.fill, 'fill-opacity', opacity * 0.4);
          map.setPaintProperty(LAYER_IDS.water.line, 'line-opacity', opacity * 0.8);
        }
      } else if (map.getLayer(LAYER_IDS.water.fill)) {
        map.removeLayer(LAYER_IDS.water.fill);
        map.removeLayer(LAYER_IDS.water.line);
        map.removeSource(SOURCE_IDS.water);
      }

      // ── Buildings ─────────────────────────────────────────────────────
      if (osmVisible.buildings) {
        if (!map.getSource(SOURCE_IDS.buildings)) {
          map.addSource(SOURCE_IDS.buildings, { type: 'geojson', data: data.buildings });
          map.addLayer({
            id: LAYER_IDS.buildings,
            type: 'fill',
            source: SOURCE_IDS.buildings,
            paint: {
              'fill-color': '#8B7355',
              'fill-opacity': opacity * 0.55,
              'fill-outline-color': '#5b4a38',
            },
          });
        } else {
          map.setPaintProperty(LAYER_IDS.buildings, 'fill-opacity', opacity * 0.55);
        }
      } else if (map.getLayer(LAYER_IDS.buildings)) {
        map.removeLayer(LAYER_IDS.buildings);
        map.removeSource(SOURCE_IDS.buildings);
      }
    };
    sync();
    map.on('style.load', sync);
    return () => {
      map.off('style.load', sync);
    };
  }, [map, data, osmVisible, opacity]);

  return null;
}

interface OsmVectorControlsProps {
  disabled?: boolean;
}

/** Compact toggle group + global opacity slider for the overlay stack. */
export function OsmVectorControls({ disabled }: OsmVectorControlsProps) {
  const { roads, water, buildings } = useMapStore((s) => s.osmLayersVisible);
  const setOsmLayerVisible = useMapStore((s) => s.setOsmLayerVisible);
  const opacity = useMapStore((s) => s.overlayOpacity);
  const setOverlayOpacity = useMapStore((s) => s.setOverlayOpacity);
  const status = useMapStore((s) => s.osmOverlayStatus);
  const error = useMapStore((s) => s.osmOverlayError);
  const [open, setOpen] = useState(false);
  const anyOn = roads || water || buildings;

  const btnStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 6,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 12,
    fontWeight: 500,
    background: anyOn ? semantic.primary : 'rgba(26, 22, 17, 0.85)',
    color: anyOn ? '#fff' : '#c4b49a',
    backdropFilter: 'blur(8px)',
    pointerEvents: 'auto',
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <div style={{ position: 'relative', pointerEvents: 'auto' }}>
      <button onClick={() => setOpen((v) => !v)} style={btnStyle} disabled={disabled} title="OSM overlays + opacity">
        Overlays{anyOn ? ` · ${[roads && 'R', water && 'W', buildings && 'B'].filter(Boolean).join('')}` : ''}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            background: 'rgba(26, 22, 17, 0.95)',
            border: '1px solid rgba(196,180,154,0.25)',
            borderRadius: 8,
            padding: 10,
            minWidth: 200,
            pointerEvents: 'auto',
            zIndex: 4,
            color: '#e9decb',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            <ToggleRow label="Roads" on={roads} onChange={(v) => setOsmLayerVisible('roads', v)} />
            <ToggleRow label="Water" on={water} onChange={(v) => setOsmLayerVisible('water', v)} />
            <ToggleRow label="Buildings" on={buildings} onChange={(v) => setOsmLayerVisible('buildings', v)} />
          </div>
          <div style={{ fontSize: 10, color: '#c4b49a', marginBottom: 4, letterSpacing: '0.05em' }}>
            OVERLAY OPACITY · {Math.round(opacity * 100)}%
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOverlayOpacity(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: 9, color: '#6b5b4a', marginTop: 6 }}>
            Source: OpenStreetMap via Overpass API
          </div>
          {status === 'loading' && (
            <div style={{ fontSize: 10, color: '#c4b49a', marginTop: 4 }}>Fetching OSM features…</div>
          )}
          {status === 'error' && error && (
            <div style={{ fontSize: 10, color: '#d07b7b', marginTop: 4 }}>
              OSM fetch failed: {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: on ? 'rgba(196,162,101,0.18)' : 'transparent',
        border: on ? '1px solid rgba(196,162,101,0.4)' : '1px solid transparent',
        borderRadius: 6,
        padding: '5px 8px',
        cursor: 'pointer',
        color: '#e9decb',
        fontSize: 12,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: on ? semantic.primary : '#3d3328',
          flexShrink: 0,
        }}
      />
      {label}
    </button>
  );
}
