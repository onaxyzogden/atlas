/**
 * Soil-properties map overlay (ISRIC SoilGrids v2.0).
 *
 * Mirrors GaezOverlay: when `visibleLayers` contains `soil_properties`, decodes
 * the currently-selected property's COG via geotiff.js into an offscreen
 * canvas, mounts it as a MapLibre `canvas` source + `raster` layer, and repaints
 * on selection change. On toggle-off / unmount, tears down source + layer.
 *
 * Unlike GAEZ, SoilGrids is CC BY 4.0 so no JWT is required on /raster/*.
 *
 * Companion `<SoilMapControls />` renders the floating picker (property
 * dropdown + legend). Co-located because both share the soilSelection state.
 */

import type maplibregl from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fromUrl } from 'geotiff';
import { useMapStore } from '../../store/mapStore.js';
import { rgbaToCss } from './gaezColor.js';
import { SOIL_RAMPS, rampGradientCss, type SoilRamp, type SoilRampId } from './soilColor.js';
import { map as mapTokens, mapZIndex, semantic } from '../../lib/tokens.js';
import { MapControlPopover } from '../../components/ui/MapControlPopover.js';

const OVERLAY_SOURCE_ID = 'soil-properties-source';
const OVERLAY_LAYER_ID = 'soil-properties-layer';

interface CatalogEntry {
  property: string;
  label: string;
  unit: string;
  range: [number, number];
  rampId: SoilRampId;
  filename: string;
  scale?: number;
  depthSlice?: string;
}

interface CatalogResponse {
  data: { entries: CatalogEntry[]; count: number; attribution: string };
  error: unknown;
}

interface TooltipState {
  x: number;
  y: number;
  text: string;
  borderColor: string;
}

interface RasterState {
  band: ArrayLike<number>;
  width: number;
  height: number;
  originX: number;
  originY: number;
  xRes: number;
  yRes: number;
  noData: number | null;
  entry: CatalogEntry;
}

// â”€â”€ SoilOverlay â€” canvas-source + decode lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface SoilOverlayProps {
  map: maplibregl.Map | null;
}

export function SoilOverlay({ map }: SoilOverlayProps) {
  const visible = useMapStore((s) => s.visibleLayers.has('soil_properties'));
  const selection = useMapStore((s) => s.soilSelection);
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  if (!canvasRef.current && typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    canvasRef.current = c;
  }

  const rasterStateRef = useRef<RasterState | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const rafHandleRef = useRef<number | null>(null);

  // Fetch catalog on first enable; shared with SoilMapControls via module-level refetch guard.
  useEffect(() => {
    if (!visible || catalog) return;
    let cancelled = false;
    fetch('/api/v1/soilgrids/catalog')
      .then(async (r) => {
        if (!r.ok) throw new Error(`Catalog HTTP ${r.status} — ${r.statusText}`);
        const text = await r.text();
        if (!text) throw new Error('Catalog returned empty body');
        try {
          return JSON.parse(text) as CatalogResponse;
        } catch {
          throw new Error(`Catalog returned non-JSON body: ${text.slice(0, 80)}`);
        }
      })
      .then((j) => {
        if (cancelled) return;
        setCatalog(j.data?.entries ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setCatalog([]);
      });
    return () => { cancelled = true; };
  }, [visible, catalog]);

  const activeEntry = useMemo(() => {
    if (!selection || !catalog) return null;
    return catalog.find((e) => e.property === selection.property) ?? null;
  }, [selection, catalog]);

  // Add/remove the MapLibre source+layer based on visibility.
  useEffect(() => {
    if (!map) return;
    if (!visible) {
      if (map.getLayer(OVERLAY_LAYER_ID)) map.removeLayer(OVERLAY_LAYER_ID);
      if (map.getSource(OVERLAY_SOURCE_ID)) map.removeSource(OVERLAY_SOURCE_ID);
      rasterStateRef.current = null;
      setTooltip(null);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ensureLayer = () => {
      if (!map.isStyleLoaded()) return;
      if (!map.getSource(OVERLAY_SOURCE_ID)) {
        map.addSource(OVERLAY_SOURCE_ID, {
          type: 'canvas',
          canvas,
          coordinates: [
            [-180,  90],
            [ 180,  90],
            [ 180, -90],
            [-180, -90],
          ],
          animate: false,
        });
      }
      if (!map.getLayer(OVERLAY_LAYER_ID)) {
        map.addLayer(
          {
            id: OVERLAY_LAYER_ID,
            type: 'raster',
            source: OVERLAY_SOURCE_ID,
            paint: { 'raster-opacity': 0.60, 'raster-fade-duration': 0 },
          },
          getFirstSymbolLayer(map),
        );
      }
    };

    ensureLayer();
    map.on('style.load', ensureLayer);
    return () => {
      map.off('style.load', ensureLayer);
      if (map.getLayer(OVERLAY_LAYER_ID)) map.removeLayer(OVERLAY_LAYER_ID);
      if (map.getSource(OVERLAY_SOURCE_ID)) map.removeSource(OVERLAY_SOURCE_ID);
    };
  }, [map, visible]);

  // Decode + paint on selection change.
  useEffect(() => {
    if (!map || !visible || !activeEntry) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const entry = activeEntry;
    const ramp = SOIL_RAMPS[entry.rampId]?.(entry.range);
    if (!ramp) return;

    let cancelled = false;
    (async () => {
      try {
        const url = `/api/v1/soilgrids/raster/${encodeURIComponent(entry.property)}`;
        const tiff = await fromUrl(url);
        const image = await tiff.getImage();
        const raster = await image.readRasters({ interleave: false });
        if (cancelled) return;

        const bandsUnknown = raster as unknown as ArrayLike<ArrayLike<number>>;
        const band = bandsUnknown[0];
        if (!band) return;

        const srcW = image.getWidth();
        const srcH = image.getHeight();
        const origin = image.getOrigin() as [number, number];
        const resolution = image.getResolution() as [number, number];
        const gdalNoData = (image.getGDALNoData?.() ?? null) as number | null;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (canvas.width !== srcW || canvas.height !== srcH) {
          canvas.width = srcW;
          canvas.height = srcH;
        }

        const imageData = ctx.createImageData(srcW, srcH);
        const scale = entry.scale ?? 1;
        const N = srcW * srcH;
        for (let i = 0; i < N; i++) {
          const raw = band[i] as number;
          if (!Number.isFinite(raw) || (gdalNoData !== null && raw === gdalNoData)) {
            const o = i * 4;
            imageData.data[o    ] = 0;
            imageData.data[o + 1] = 0;
            imageData.data[o + 2] = 0;
            imageData.data[o + 3] = 0;
            continue;
          }
          const v = raw / scale;
          const [r, g, b, a] = ramp.valueToRgba(v);
          const o = i * 4;
          imageData.data[o    ] = r;
          imageData.data[o + 1] = g;
          imageData.data[o + 2] = b;
          imageData.data[o + 3] = a;
        }
        ctx.putImageData(imageData, 0, 0);

        rasterStateRef.current = {
          band,
          width: srcW,
          height: srcH,
          originX: origin[0],
          originY: origin[1],
          xRes: resolution[0],
          yRes: resolution[1],
          noData: gdalNoData,
          entry,
        };

        // Nudge MapLibre to re-read the canvas pixels.
        const src = map.getSource(OVERLAY_SOURCE_ID) as (maplibregl.CanvasSource & { play?: () => void; pause?: () => void }) | undefined;
        if (src && typeof src.play === 'function' && typeof src.pause === 'function') {
          src.play();
          src.pause();
        } else if (src) {
          (src as unknown as { setCoordinates: (c: number[][]) => void }).setCoordinates([
            [-180,  90],
            [ 180,  90],
            [ 180, -90],
            [-180, -90],
          ]);
        }
      } catch (err) {
        console.warn('[Soil overlay] decode failed:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [map, visible, activeEntry]);

  // Hover readout â€” pixel-sampled in-memory (no network).
  useEffect(() => {
    if (!map || !visible) return;

    const compute = (lngLat: { lng: number; lat: number }, point: { x: number; y: number }) => {
      const s = rasterStateRef.current;
      if (!s) { setTooltip(null); return; }
      const { lng, lat } = lngLat;
      const px = Math.floor((lng - s.originX) / s.xRes);
      const py = Math.floor((lat - s.originY) / s.yRes);
      if (px < 0 || py < 0 || px >= s.width || py >= s.height) { setTooltip(null); return; }
      const raw = s.band[py * s.width + px] as number;
      if (raw == null || !Number.isFinite(raw)) { setTooltip(null); return; }
      if (s.noData != null && raw === s.noData) { setTooltip(null); return; }
      const scale = s.entry.scale ?? 1;
      const v = raw / scale;
      const ramp = SOIL_RAMPS[s.entry.rampId]?.(s.entry.range);
      if (!ramp) { setTooltip(null); return; }
      const rgba = ramp.valueToRgba(v);
      const formatted = formatValue(v, s.entry);
      setTooltip({
        x: point.x,
        y: point.y,
        text: `${s.entry.label} Â· ${formatted}`,
        borderColor: rgbaToCss(rgba),
      });
    };

    const onMove = (e: maplibregl.MapMouseEvent) => {
      if (rafHandleRef.current != null) return;
      rafHandleRef.current = window.requestAnimationFrame(() => {
        rafHandleRef.current = null;
        compute({ lng: e.lngLat.lng, lat: e.lngLat.lat }, { x: e.point.x, y: e.point.y });
      });
    };
    const onLeave = () => {
      if (rafHandleRef.current != null) {
        window.cancelAnimationFrame(rafHandleRef.current);
        rafHandleRef.current = null;
      }
      setTooltip(null);
    };

    map.on('mousemove', onMove);
    map.on('mouseleave', onLeave);
    return () => {
      map.off('mousemove', onMove);
      map.off('mouseleave', onLeave);
      if (rafHandleRef.current != null) {
        window.cancelAnimationFrame(rafHandleRef.current);
        rafHandleRef.current = null;
      }
    };
  }, [map, visible]);

  return tooltip ? (
    <div
      style={{
        position: 'absolute',
        left: tooltip.x + 12,
        top: tooltip.y + 12,
        background: 'var(--color-chrome-bg-translucent)',
        border: `1px solid ${tooltip.borderColor}`,
        color: mapTokens.label,
        padding: '6px 8px',
        borderRadius: 6,
        fontSize: 11,
        pointerEvents: 'none',
        zIndex: mapZIndex.tooltip,
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}
    >
      {tooltip.text}
    </div>
  ) : null;
}

function formatValue(v: number, entry: CatalogEntry): string {
  if (entry.unit === 'pH') return `pH ${v.toFixed(1)}`;
  if (entry.unit === '%') return `${v.toFixed(0)}%`;
  return `${v.toFixed(0)} ${entry.unit}`;
}

function getFirstSymbolLayer(map: maplibregl.Map): string | undefined {
  const layers = map.getStyle()?.layers;
  if (!layers) return undefined;
  for (const layer of layers) {
    if (layer.type === 'symbol') return layer.id;
  }
  return undefined;
}

// â”€â”€ SoilMapControls â€” floating picker + legend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function SoilMapControls() {
  const visible = useMapStore((s) => s.visibleLayers.has('soil_properties'));
  const selection = useMapStore((s) => s.soilSelection);
  const setSelection = useMapStore((s) => s.setSoilSelection);
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch catalog once on first enable.
  useEffect(() => {
    if (!visible || catalog) return;
    let cancelled = false;
    fetch('/api/v1/soilgrids/catalog')
      .then(async (r) => {
        if (!r.ok) throw new Error(`Catalog HTTP ${r.status} — ${r.statusText}`);
        const text = await r.text();
        if (!text) throw new Error('Catalog returned empty body');
        try {
          return JSON.parse(text) as CatalogResponse;
        } catch {
          throw new Error(`Catalog returned non-JSON body: ${text.slice(0, 80)}`);
        }
      })
      .then((j) => {
        if (cancelled) return;
        setCatalog(j.data?.entries ?? []);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => { cancelled = true; };
  }, [visible, catalog]);

  // Seed default selection once enabled + catalog arrives.
  useEffect(() => {
    if (!visible || !catalog || selection) return;
    if (catalog.length === 0) return;
    const preferred = catalog.find((c) => c.property === 'bedrock_depth');
    const pick = preferred ?? catalog[0];
    if (!pick) return;
    setSelection({ property: pick.property });
  }, [visible, catalog, selection, setSelection]);

  const activeEntry = useMemo(() => {
    if (!selection || !catalog) return null;
    return catalog.find((e) => e.property === selection.property) ?? null;
  }, [selection, catalog]);

  const activeRamp: SoilRamp | null = useMemo(() => {
    if (!activeEntry) return null;
    return SOIL_RAMPS[activeEntry.rampId]?.(activeEntry.range) ?? null;
  }, [activeEntry]);

  if (!visible) return null;

  return (
    <MapControlPopover
      variant="panel"
      collapsed={collapsed}
      style={{
        position: 'absolute',
        top: 12,
        right: 260,
        zIndex: mapZIndex.panel,
        color: mapTokens.label,
        minWidth: collapsed ? undefined : 220,
        fontSize: 12,
      }}
    >
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          color: semantic.sidebarIcon,
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: 0,
          display: 'block',
          width: '100%',
          textAlign: 'left',
        }}
      >
        Soil Properties {collapsed ? 'â–¸' : 'â–¾'}
      </button>
      {!collapsed && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {error && (
            <div style={{ color: '#c07878', fontSize: 11 }}>Catalog failed: {error}</div>
          )}
          {!catalog && !error && (
            <div style={{ color: semantic.sidebarIcon, fontSize: 11 }}>Loading catalogâ€¦</div>
          )}
          {catalog && catalog.length === 0 && (
            <div style={{ color: semantic.sidebarIcon, fontSize: 11 }}>
              SoilGrids rasters not ingested on this deployment.
            </div>
          )}
          {catalog && catalog.length > 0 && selection && activeEntry && (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ minWidth: 58, color: semantic.sidebarIcon }}>Property</span>
                <select
                  value={selection.property}
                  onChange={(e) => setSelection({ property: e.target.value })}
                  style={{
                    flex: 1,
                    background: 'rgba(61, 51, 40, 0.6)',
                    color: mapTokens.label,
                    border: '1px solid rgba(125, 97, 64, 0.5)',
                    borderRadius: 4,
                    padding: '3px 6px',
                    fontSize: 12,
                  }}
                >
                  {catalog.map((o) => (
                    <option key={o.property} value={o.property}>{o.label}</option>
                  ))}
                </select>
              </label>
              {activeRamp && <SoilLegend ramp={activeRamp} entry={activeEntry} />}
            </>
          )}
          <div style={{ fontSize: 10, color: semantic.sidebarIcon, fontStyle: 'italic', marginTop: 4 }}>
            ISRIC SoilGrids v2.0 Â· CC BY 4.0
          </div>
        </div>
      )}
    </MapControlPopover>
  );
}

function SoilLegend({ ramp, entry }: { ramp: SoilRamp; entry: CatalogEntry }) {
  const [min, max] = entry.range;
  return (
    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          height: 12,
          borderRadius: 3,
          background: rampGradientCss(ramp),
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: semantic.sidebarIcon }}>
        <span>{formatBound(min, entry)}</span>
        <span>{formatBound(max, entry)}</span>
      </div>
    </div>
  );
}

function formatBound(v: number, entry: CatalogEntry): string {
  if (entry.unit === 'pH') return v.toFixed(1);
  if (entry.unit === '%') return `${v}%`;
  return `${v} ${entry.unit}`;
}
