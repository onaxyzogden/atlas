import { useEffect, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { useMapStore } from '../../store/mapStore.js';
import { semantic } from '../../lib/tokens.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';

// Esri Wayback â€” free global historical World Imagery archive. Releases are
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
  /** When true, render a 40 px icon-only trigger; dropdown opens to the right. */
  compact?: boolean;
}

/**
 * Loads the Esri Wayback release list once and presents a dropdown. Selecting
 * a release adds a raster tile layer on top of the current basemap. The
 * project boundary (when available) is mirrored on top so the user can orient
 * the historical imagery to the parcel.
 */
export default function HistoricalImageryControl({ map, boundaryGeojson, compact = false }: HistoricalImageryControlProps) {
  const release = useMapStore((s) => s.historicalRelease);
  const setRelease = useMapStore((s) => s.setHistoricalRelease);
  const overlayOpacity = useMapStore((s) => s.overlayOpacity);
  const [open, setOpen] = useState(false);
  const [releases, setReleases] = useState<Release[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tileStatus, setTileStatus] = useState<'idle' | 'loading' | 'ok' | 'empty'>('idle');

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

  // Track tile success/empty once per release selection.
  useEffect(() => {
    if (!map || !release) { setTileStatus('idle'); return; }
    setTileStatus('loading');
    let gotTiles = false;
    const onData = (e: maplibregl.MapSourceDataEvent) => {
      if (e.sourceId === SOURCE_ID && e.isSourceLoaded && e.sourceDataType !== 'metadata') {
        gotTiles = true;
        setTileStatus('ok');
      }
    };
    map.on('sourcedata', onData);
    const timer = setTimeout(() => { if (!gotTiles) setTileStatus('empty'); }, 5000);
    return () => {
      map.off('sourcedata', onData);
      clearTimeout(timer);
    };
  }, [map, release]);

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
            paint: { 'raster-opacity': overlayOpacity },
          });
        } else if (map.getLayer(LAYER_ID)) {
          map.setPaintProperty(LAYER_ID, 'raster-opacity', overlayOpacity);
        }
        // Boundary mirror â€” re-add above the raster so the parcel stays visible.
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
  }, [map, release, boundaryGeojson, overlayOpacity]);

  const btnStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    background: release ? semantic.primary : 'var(--color-chrome-bg-translucent)',
    color: release ? '#fff' : '#c4b49a',
    backdropFilter: 'blur(8px)',
    pointerEvents: 'auto',
  };

  const popoverPosition: React.CSSProperties = compact
    ? { position: 'absolute', top: 0, left: 'calc(100% + 8px)' }
    : { position: 'absolute', top: '100%', left: 0, marginTop: 4 };

  return (
    <div style={{ position: 'relative' }}>
      {compact ? (
        <DelayedTooltip label={release ? `Historical · ${release.date}` : 'Historical imagery'} position="right">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-pressed={!!release}
          className={`spine-btn${release ? ' signifier-shimmer' : ''}`}
          data-active={!!release}
          aria-label="Historical imagery"
        >
          {/* Lucide History */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/>
            <path d="M3 3v5h5"/>
            <path d="M12 7v5l4 2"/>
          </svg>
        </button>
        </DelayedTooltip>
      ) : (
        <button onClick={() => setOpen((v) => !v)} style={btnStyle} aria-pressed={!!release}>
          {release
            ? tileStatus === 'loading'
              ? `Historical Â· ${release.date} Â· â€¦`
              : tileStatus === 'empty'
              ? `Historical Â· ${release.date} Â· no coverage`
              : `Historical Â· ${release.date}`
            : 'Historical'}
        </button>
      )}
      {open && (
        <div
          style={{
            ...popoverPosition,
            background: 'var(--color-chrome-bg-translucent)',
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
          {!releases && !err && <div style={{ color: '#c4b49a', fontSize: 11, padding: 4 }}>Loading releasesâ€¦</div>}
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
