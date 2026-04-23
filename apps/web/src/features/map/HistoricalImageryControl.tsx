import { useEffect, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { useMapStore } from '../../store/mapStore.js';
import { semantic } from '../../lib/tokens.js';

// Esri Wayback — free global historical World Imagery archive. Releases are
// quarterly snapshots of the World Imagery tile service.
const WAYBACK_CONFIG_URL =
  'https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json';

const tileUrl = (releaseId: number) =>
  `https://wayback.maptiles.arcgis.com/arcgis/rest/services/world_imagery/wmts/1.0.0/default028mm/MapServer/tile/${releaseId}/{z}/{y}/{x}`;

interface Release { id: number; date: string }

interface WaybackConfigEntry {
  itemTitle?: string;
  itemURL?: string;
  itemReleaseName?: string;
  itemID?: string;
}

const SOURCE_ID = 'wayback-imagery';
const LAYER_ID = 'wayback-imagery-raster';
const BOUNDARY_SRC_OVERLAY = 'wayback-boundary';
const BOUNDARY_LINE_OVERLAY = 'wayback-boundary-line';

interface HistoricalImageryControlProps {
  map: maplibregl.Map | null;
  boundaryGeojson?: GeoJSON.FeatureCollection | null | undefined;
}

/**
 * Loads the Esri Wayback release list once and presents a dropdown. Selecting
 * a release adds a raster tile layer on top of the current basemap. The
 * project boundary (when available) is mirrored on top so the user can orient
 * the historical imagery to the parcel.
 */
export default function HistoricalImageryControl({ map, boundaryGeojson }: HistoricalImageryControlProps) {
  const release = useMapStore((s) => s.historicalRelease);
  const setRelease = useMapStore((s) => s.setHistoricalRelease);
  const [open, setOpen] = useState(false);
  const [releases, setReleases] = useState<Release[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (releases || err) return;
    fetch(WAYBACK_CONFIG_URL)
      .then((r) => r.json() as Promise<Record<string, WaybackConfigEntry>>)
      .then((cfg) => {
        const parsed: Release[] = Object.entries(cfg)
          .map(([id, entry]) => {
            const title = entry.itemTitle ?? entry.itemReleaseName ?? '';
            // Title format: "World Imagery (Wayback YYYY-MM-DD)"
            const m = title.match(/(\d{4}-\d{2}-\d{2})/);
            return { id: Number(id), date: m?.[1] ?? title };
          })
          .filter((r) => !Number.isNaN(r.id) && /\d{4}-\d{2}-\d{2}/.test(r.date))
          .sort((a, b) => b.date.localeCompare(a.date));
        setReleases(parsed);
      })
      .catch((e: Error) => setErr(e.message));
  }, [releases, err]);

  // Sync raster + boundary overlay to the map.
  useEffect(() => {
    if (!map) return;
    const sync = () => {
      if (!map.isStyleLoaded()) return;

      if (release) {
        const src = map.getSource(SOURCE_ID) as (maplibregl.RasterTileSource & { tiles?: string[] }) | undefined;
        const nextTiles = [tileUrl(release.id)];
        if (src) {
          const sameTiles = Array.isArray(src.tiles) && src.tiles[0] === nextTiles[0];
          if (!sameTiles) {
            if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
            map.removeSource(SOURCE_ID);
          }
        }
        if (!map.getSource(SOURCE_ID)) {
          map.addSource(SOURCE_ID, { type: 'raster', tiles: nextTiles, tileSize: 256 });
          map.addLayer({
            id: LAYER_ID,
            type: 'raster',
            source: SOURCE_ID,
            paint: { 'raster-opacity': 0.95 },
          });
        }
        // Boundary mirror — re-add above the raster so the parcel stays visible.
        if (boundaryGeojson) {
          if (!map.getSource(BOUNDARY_SRC_OVERLAY)) {
            map.addSource(BOUNDARY_SRC_OVERLAY, { type: 'geojson', data: boundaryGeojson });
          }
          if (!map.getLayer(BOUNDARY_LINE_OVERLAY)) {
            map.addLayer({
              id: BOUNDARY_LINE_OVERLAY,
              type: 'line',
              source: BOUNDARY_SRC_OVERLAY,
              paint: { 'line-color': '#ffd27f', 'line-width': 2.5, 'line-dasharray': [2, 1] },
            });
          }
        }
      } else {
        for (const id of [BOUNDARY_LINE_OVERLAY, LAYER_ID]) {
          if (map.getLayer(id)) map.removeLayer(id);
        }
        for (const id of [BOUNDARY_SRC_OVERLAY, SOURCE_ID]) {
          if (map.getSource(id)) map.removeSource(id);
        }
      }
    };
    sync();
    map.on('style.load', sync);
    return () => {
      map.off('style.load', sync);
    };
  }, [map, release, boundaryGeojson]);

  const btnStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    background: release ? semantic.primary : 'rgba(26, 22, 17, 0.85)',
    color: release ? '#fff' : '#c4b49a',
    backdropFilter: 'blur(8px)',
    pointerEvents: 'auto',
  };

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen((v) => !v)} style={btnStyle} aria-pressed={!!release}>
        {release ? `Historical · ${release.date}` : 'Historical'}
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
            padding: 6,
            minWidth: 180,
            maxHeight: 260,
            overflow: 'auto',
            pointerEvents: 'auto',
            zIndex: 4,
          }}
        >
          {err && <div style={{ color: '#d07b7b', fontSize: 11, padding: 4 }}>{err}</div>}
          {!releases && !err && <div style={{ color: '#c4b49a', fontSize: 11, padding: 4 }}>Loading releases…</div>}
          {releases && (
            <>
              <button
                onClick={() => { setRelease(null); setOpen(false); }}
                style={rowStyle(!release)}
              >
                Off (current imagery)
              </button>
              {releases.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { setRelease(r); setOpen(false); }}
                  style={rowStyle(release?.id === r.id)}
                >
                  {r.date}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function rowStyle(active: boolean): React.CSSProperties {
  return {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '4px 8px',
    borderRadius: 4,
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    background: active ? semantic.primary : 'transparent',
    color: active ? '#fff' : '#e9decb',
  };
}
