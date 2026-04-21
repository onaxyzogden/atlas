/**
 * Sprint CB — map-side FAO GAEZ v4 suitability overlay.
 * Sprint CC — yield-gradient mode + hover readout + JWT auth on /raster/*.
 *
 * Two responsibilities, co-located because they share state (gaezSelection):
 *
 *   1. <GaezOverlay map={map} />
 *        When `visibleLayers` contains `gaez_suitability`, decodes the currently-
 *        selected (crop, waterSupply, inputLevel, variable) COG via geotiff.js
 *        into a full-world offscreen canvas (4320×2160) and mounts it as a
 *        MapLibre `canvas` source + `raster` layer.
 *
 *        CB: suitability paint only (5 categorical bands via suitabilityToRgba).
 *        CC: yield paint added via yieldToRgba + per-tile 99th-percentile max.
 *
 *        On selection change, re-decodes and nudges MapLibre to re-read the
 *        canvas via the standard play()/pause() trick. On toggle-off or unmount,
 *        tears down the layer + source.
 *
 *        CC also attaches a `mousemove`/`mouseleave` pair to the map that reads
 *        the pixel under the cursor from the in-memory band (no network call)
 *        and renders a small fixed tooltip. rAF-throttled so 60Hz mousemove
 *        can't saturate the paint loop.
 *
 *   2. <GaezMapControls />
 *        Floating top-right panel: crop / water / input / mode selects + color
 *        legend. Fetches `/api/v1/gaez/catalog` once on first enable, seeds a
 *        canonical default (`maize / rainfed / high / suitability`), and pushes
 *        selection changes into `useMapStore`.
 *
 *        CC adds a 4th control (Class / Yield mode toggle) and swaps the legend
 *        strip between the discrete suitability swatches and the continuous
 *        yield ramp.
 *
 * Auth (Sprint CC):
 *  - `/api/v1/gaez/catalog` stays public (manifest digest, no FAO bytes).
 *  - `/api/v1/gaez/raster/...` is now gated behind `fastify.authenticate`, so
 *    geotiff.js `fromUrl()` and the catalog fetch both carry the JWT pulled
 *    from `useAuthStore`. The geotiff.js `RemoteSourceOptions.headers` path is
 *    verified to forward custom headers through its internal fetch.
 *
 * Design notes:
 *  - Canvas-source re-upload: MapLibre reads a `type:'canvas'` source once on
 *    add when `animate:false`. Call `src.play(); src.pause()` after changing
 *    pixels to force a re-read.
 *  - Z-order: we pass `beforeId` pointing at the first `symbol` layer (labels)
 *    so the overlay sits below symbols but above the base style.
 *  - Decode cost: 4320×2160 → ~50–80ms on a modern laptop. Main-thread MVP;
 *    defer Web Worker offload until profiled.
 */

import type maplibregl from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fromUrl } from 'geotiff';
import {
  useMapStore,
  type GaezInputLevel,
  type GaezSelection,
  type GaezVariable,
  type GaezWaterSupply,
} from '../../store/mapStore.js';
import { useAuthStore } from '../../store/authStore.js';
import {
  suitabilityToRgba,
  SUITABILITY_SWATCHES,
  rgbaToCss,
  yieldToRgba,
  YIELD_GRADIENT_CSS,
} from './gaezColor.js';
import { map as mapTokens, semantic } from '../../lib/tokens.js';

// Full-world pixel dimensions for GAEZ v4 at 5 arc-min (4320 × 2160).
const WORLD_WIDTH = 4320;
const WORLD_HEIGHT = 2160;

const OVERLAY_SOURCE_ID = 'gaez-suitability-source';
const OVERLAY_LAYER_ID = 'gaez-suitability-layer';

// ── Types ──────────────────────────────────────────────────────────────────

interface CatalogEntry {
  crop: string;
  waterSupply: string;
  inputLevel: string;
  variables: string[];
}

interface CatalogResponse {
  data: { entries: CatalogEntry[]; count: number; attribution: string };
  error: unknown;
}

/**
 * Sprint CC — snapshot of the most recent successful decode. The hover handler
 * reads this by ref (no re-render storm) to look up the pixel under the cursor.
 * Georeferencing math mirrors GaezRasterService.samplePoint() (originX/originY
 * are the UL corner of the top-left pixel; xRes is positive, yRes is negative).
 */
interface RasterState {
  band: ArrayLike<number>;
  width: number;
  height: number;
  originX: number;   // UL-corner longitude of pixel (0,0)
  originY: number;   // UL-corner latitude  of pixel (0,0)
  xRes: number;      // degrees per pixel, east-positive
  yRes: number;      // degrees per pixel, south-negative (typically < 0)
  noData: number | null;
  variable: GaezVariable;
  maxYield: number;  // 0 when variable === 'suitability'
  selection: GaezSelection;
}

interface TooltipState {
  x: number;
  y: number;
  text: string;
  borderColor: string;
}

// ── GaezOverlay — the canvas-source + decode lifecycle ─────────────────────

interface GaezOverlayProps {
  map: maplibregl.Map | null;
}

export function GaezOverlay({ map }: GaezOverlayProps) {
  const visible = useMapStore((s) => s.visibleLayers.has('gaez_suitability'));
  const selection = useMapStore((s) => s.gaezSelection);
  const setGaezMaxYield = useMapStore((s) => s.setGaezMaxYield);
  const token = useAuthStore((s) => s.token);

  // Offscreen canvas (created once, reused across selection changes).
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  if (!canvasRef.current && typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = WORLD_WIDTH;
    c.height = WORLD_HEIGHT;
    canvasRef.current = c;
  }

  // Sprint CC — hover readout state. Ref holds the decoded band (large,
  // no need to re-render on change); state holds the tooltip position/text
  // (small, triggers the tooltip div render).
  const rasterStateRef = useRef<RasterState | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const rafHandleRef = useRef<number | null>(null);

  // ── Add/remove the MapLibre source+layer based on visibility. ────────────
  useEffect(() => {
    if (!map) return;
    if (!visible) {
      if (map.getLayer(OVERLAY_LAYER_ID)) map.removeLayer(OVERLAY_LAYER_ID);
      if (map.getSource(OVERLAY_SOURCE_ID)) map.removeSource(OVERLAY_SOURCE_ID);
      // CC — drop the ref so a stale decode doesn't answer hover after toggle-off.
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
            paint: { 'raster-opacity': 0.65, 'raster-fade-duration': 0 },
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

  // ── Decode + paint on selection change. ──────────────────────────────────
  useEffect(() => {
    if (!map || !visible || !selection) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    (async () => {
      try {
        const url = rasterUrl(selection);
        // Sprint CC — auth header on the raster request. RemoteSourceOptions.headers
        // is forwarded to geotiff's internal fetch (verified in remote.d.ts).
        const tiff = await fromUrl(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
        const image = await tiff.getImage();
        const raster = await image.readRasters({ interleave: false });
        if (cancelled) return;

        // Paint raster into the 4320×2160 offscreen canvas.
        const bandsUnknown = raster as unknown as ArrayLike<ArrayLike<number>>;
        const band = bandsUnknown[0];
        if (!band) return;

        const srcW = image.getWidth();
        const srcH = image.getHeight();
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // ── Georeferencing snapshot for the hover handler ─────────────────
        // geotiff.js exposes `getOrigin()` = [x, y] of the UL pixel corner and
        // `getResolution()` = [xRes, yRes]; yRes is typically negative (north-up).
        const origin = image.getOrigin() as [number, number];
        const resolution = image.getResolution() as [number, number];
        const gdalNoData = (image.getGDALNoData?.() ?? null) as number | null;

        // ── Max-yield (variable === 'yield' only) ─────────────────────────
        let maxYield = 0;
        if (selection.variable === 'yield') {
          const step = Math.max(1, Math.floor((band.length as number) / 10000));
          const samples: number[] = [];
          for (let i = 0; i < (band.length as number); i += step) {
            const v = band[i] as number;
            if (Number.isFinite(v) && v >= 0) samples.push(v);
          }
          samples.sort((a, b) => a - b);
          if (samples.length >= 100) {
            maxYield = samples[Math.floor(samples.length * 0.99)] ?? 1;
          } else if (samples.length > 0) {
            // Sparse tile fallback (per Risks table).
            maxYield = samples[samples.length - 1] ?? 1;
          } else {
            maxYield = 1;
          }
        }

        const imageData = ctx.createImageData(srcW, srcH);
        const N = srcW * srcH;
        if (selection.variable === 'yield') {
          for (let i = 0; i < N; i++) {
            const v = band[i] as number;
            const [r, g, b, a] = yieldToRgba(v, maxYield);
            const o = i * 4;
            imageData.data[o    ] = r;
            imageData.data[o + 1] = g;
            imageData.data[o + 2] = b;
            imageData.data[o + 3] = a;
          }
        } else {
          for (let i = 0; i < N; i++) {
            const code = band[i] as number;
            const [r, g, b, a] = suitabilityToRgba(code);
            const o = i * 4;
            imageData.data[o    ] = r;
            imageData.data[o + 1] = g;
            imageData.data[o + 2] = b;
            imageData.data[o + 3] = a;
          }
        }

        // If the raster is smaller than our canvas (defensive), size canvas to match.
        if (canvas.width !== srcW || canvas.height !== srcH) {
          canvas.width = srcW;
          canvas.height = srcH;
        }
        ctx.putImageData(imageData, 0, 0);

        // ── CC: publish the snapshot for the hover handler. Atomic overwrite;
        // if a second decode is in flight the worst case is a frame of old data.
        rasterStateRef.current = {
          band,
          width: srcW,
          height: srcH,
          originX: origin[0],
          originY: origin[1],
          xRes: resolution[0],
          yRes: resolution[1],
          noData: gdalNoData,
          variable: selection.variable,
          maxYield,
          selection,
        };
        // CC: publish maxYield to the store so Legend can render the ramp label.
        setGaezMaxYield(maxYield);

        // Nudge MapLibre to re-read the canvas pixels.
        const src = map.getSource(OVERLAY_SOURCE_ID) as (maplibregl.CanvasSource & { play?: () => void; pause?: () => void }) | undefined;
        if (src && typeof src.play === 'function' && typeof src.pause === 'function') {
          src.play();
          src.pause();
        } else if (src) {
          // Fallback: re-set coordinates to force a repaint.
          (src as unknown as { setCoordinates: (c: number[][]) => void }).setCoordinates([
            [-180,  90],
            [ 180,  90],
            [ 180, -90],
            [-180, -90],
          ]);
        }
      } catch (err) {
        console.warn('[GAEZ overlay] decode failed:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [map, visible, selection, token, setGaezMaxYield]);

  // ── Sprint CC — hover readout. Reads rasterStateRef (no re-render storm)
  //    and sets tooltip state; rAF-gated so 60Hz mousemove can't saturate the
  //    renderer. Pointer is converted to (px, py) using the exact origin/res
  //    from the decoded image (mirrors GaezRasterService.samplePoint).
  useEffect(() => {
    if (!map || !visible) return;

    const compute = (lngLat: { lng: number; lat: number }, point: { x: number; y: number }) => {
      const s = rasterStateRef.current;
      if (!s) { setTooltip(null); return; }
      const { lng, lat } = lngLat;
      const px = Math.floor((lng - s.originX) / s.xRes);
      const py = Math.floor((lat - s.originY) / s.yRes); // yRes negative → positive py as lat goes south
      if (px < 0 || py < 0 || px >= s.width || py >= s.height) { setTooltip(null); return; }
      const v = s.band[py * s.width + px] as number;
      if (v == null || !Number.isFinite(v)) { setTooltip(null); return; }
      if (s.noData != null && v === s.noData) { setTooltip(null); return; }
      setTooltip(formatTooltip(s, v, point.x, point.y));
    };

    const onMove = (e: maplibregl.MapMouseEvent) => {
      if (rafHandleRef.current != null) return; // coalesce bursts
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
        background: 'rgba(26,22,17,0.95)',
        border: `1px solid ${tooltip.borderColor}`,
        color: mapTokens.label,
        padding: '6px 8px',
        borderRadius: 6,
        fontSize: 11,
        pointerEvents: 'none',
        zIndex: 6,
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}
    >
      {tooltip.text}
    </div>
  ) : null;
}

/**
 * Sprint CC — render the tooltip text + border color from a decoded pixel.
 *
 *   suitability mode → `maize rainfed high · S2 · <yield-if-known> kg/ha`
 *                       (yield is unknown from a suitability-only band; omit)
 *   yield mode       → `maize rainfed high · 5,400 kg/ha`
 */
function formatTooltip(
  s: RasterState,
  v: number,
  x: number,
  y: number,
): TooltipState {
  const { selection, variable, maxYield } = s;
  const label = `${selection.crop} ${selection.waterSupply} ${selection.inputLevel}`;
  if (variable === 'yield') {
    const kgha = Math.round(v).toLocaleString();
    const rgba = yieldToRgba(v, maxYield);
    return {
      x, y,
      text: `${label} · ${kgha} kg/ha`,
      borderColor: rgbaToCss(rgba),
    };
  }
  // suitability mode — v is a class code (1-9). Map to an S1/S2/S3/N/Water label.
  const classLabel = suitabilityClassLabel(v);
  const rgba = suitabilityToRgba(v);
  return {
    x, y,
    text: `${label} · ${classLabel}`,
    borderColor: rgbaToCss(rgba),
  };
}

function suitabilityClassLabel(code: number): string {
  if (!Number.isFinite(code)) return '—';
  if (code >= 1 && code <= 2) return 'S1';
  if (code >= 3 && code <= 4) return 'S2';
  if (code >= 5 && code <= 6) return 'S3';
  if (code >= 7 && code <= 8) return 'N';
  if (code === 9) return 'Water';
  return '—';
}

function rasterUrl(sel: GaezSelection): string {
  // API proxy is served same-origin via the Vite dev proxy.
  // Sprint CC: variable is now selection-driven (not hardcoded 'suitability').
  // TODO(sprint-cd+2): make scenario dynamic once picker lands.
  // Backend accepts scenario as a required path segment per Sprint CD;
  // hardcoded to baseline until GaezSelection grows a scenario field.
  const { crop, waterSupply, inputLevel, variable } = sel;
  return `/api/v1/gaez/raster/baseline_1981_2010/${encodeURIComponent(crop)}/${encodeURIComponent(waterSupply)}/${encodeURIComponent(inputLevel)}/${encodeURIComponent(variable)}`;
}

function getFirstSymbolLayer(map: maplibregl.Map): string | undefined {
  const layers = map.getStyle()?.layers;
  if (!layers) return undefined;
  for (const layer of layers) {
    if (layer.type === 'symbol') return layer.id;
  }
  return undefined;
}

// ── GaezMapControls — floating picker + legend ────────────────────────────

export function GaezMapControls() {
  const visible = useMapStore((s) => s.visibleLayers.has('gaez_suitability'));
  const selection = useMapStore((s) => s.gaezSelection);
  const setSelection = useMapStore((s) => s.setGaezSelection);
  const token = useAuthStore((s) => s.token);
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch catalog once on first enable.
  useEffect(() => {
    if (!visible || catalog) return;
    let cancelled = false;
    fetch('/api/v1/gaez/catalog', token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      .then((r) => r.json() as Promise<CatalogResponse>)
      .then((j) => {
        if (cancelled) return;
        setCatalog(j.data?.entries ?? []);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => { cancelled = true; };
  }, [visible, catalog, token]);

  // Seed default selection once both layer is on and catalog has entries.
  useEffect(() => {
    if (!visible || !catalog || selection) return;
    if (catalog.length === 0) return;
    const preferred = catalog.find(
      (c) => c.crop === 'maize' && c.waterSupply === 'rainfed' && c.inputLevel === 'high',
    );
    const pick = preferred ?? catalog[0];
    if (!pick) return;
    setSelection({
      crop: pick.crop,
      waterSupply: pick.waterSupply as GaezWaterSupply,
      inputLevel: pick.inputLevel as GaezInputLevel,
      variable: 'suitability',
    });
  }, [visible, catalog, selection, setSelection]);

  const { crops, waterOptions, inputOptions } = useMemo(() => {
    const entries = catalog ?? [];
    const crops = Array.from(new Set(entries.map((e) => e.crop))).sort();
    const forCrop = selection ? entries.filter((e) => e.crop === selection.crop) : [];
    const waterOptions = Array.from(new Set(forCrop.map((e) => e.waterSupply))).sort();
    const forCropWater = selection
      ? forCrop.filter((e) => e.waterSupply === selection.waterSupply)
      : [];
    const inputOptions = Array.from(new Set(forCropWater.map((e) => e.inputLevel))).sort();
    return { crops, waterOptions, inputOptions };
  }, [catalog, selection]);

  if (!visible) return null;

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 5,
    background: 'rgba(26, 22, 17, 0.92)',
    color: mapTokens.label,
    border: '1px solid rgba(125, 97, 64, 0.4)',
    borderRadius: 10,
    padding: collapsed ? '6px 10px' : 12,
    backdropFilter: 'blur(10px)',
    minWidth: collapsed ? undefined : 220,
    fontSize: 12,
    pointerEvents: 'auto',
  };

  return (
    <div style={panelStyle}>
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
        GAEZ Suitability {collapsed ? '▸' : '▾'}
      </button>
      {!collapsed && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {error && (
            <div style={{ color: '#c07878', fontSize: 11 }}>Catalog failed: {error}</div>
          )}
          {!catalog && !error && (
            <div style={{ color: semantic.sidebarIcon, fontSize: 11 }}>Loading catalog…</div>
          )}
          {catalog && catalog.length === 0 && (
            <div style={{ color: semantic.sidebarIcon, fontSize: 11 }}>
              GAEZ rasters not ingested on this deployment.
            </div>
          )}
          {catalog && catalog.length > 0 && selection && (
            <>
              <LabeledSelect
                label="Crop"
                value={selection.crop}
                options={crops}
                onChange={(crop) => {
                  const entries = catalog.filter((e) => e.crop === crop);
                  if (entries.length === 0) return;
                  // Prefer keeping current water/input if still valid, else first.
                  const stillValid = entries.find(
                    (e) => e.waterSupply === selection.waterSupply && e.inputLevel === selection.inputLevel,
                  );
                  const pick = stillValid ?? entries[0]!;
                  setSelection({
                    crop: pick.crop,
                    waterSupply: pick.waterSupply as GaezWaterSupply,
                    inputLevel: pick.inputLevel as GaezInputLevel,
                    variable: selection.variable,
                  });
                }}
                format={(v) => v.replace(/_/g, ' ')}
              />
              <LabeledSelect
                label="Water"
                value={selection.waterSupply}
                options={waterOptions}
                onChange={(w) => {
                  const entries = catalog.filter(
                    (e) => e.crop === selection.crop && e.waterSupply === w,
                  );
                  const stillValid = entries.find((e) => e.inputLevel === selection.inputLevel);
                  const pick = stillValid ?? entries[0];
                  if (!pick) return;
                  setSelection({
                    crop: pick.crop,
                    waterSupply: pick.waterSupply as GaezWaterSupply,
                    inputLevel: pick.inputLevel as GaezInputLevel,
                    variable: selection.variable,
                  });
                }}
                format={(v) => (v === 'rainfed' ? 'rain-fed' : v)}
              />
              <LabeledSelect
                label="Input"
                value={selection.inputLevel}
                options={inputOptions}
                onChange={(i) => {
                  setSelection({
                    ...selection,
                    inputLevel: i as GaezInputLevel,
                  });
                }}
              />
              {/* Sprint CC — mode toggle (Class / Yield). */}
              <ModeToggle
                value={selection.variable}
                onChange={(v) => setSelection({ ...selection, variable: v })}
              />
            </>
          )}
          <Legend variable={selection?.variable ?? 'suitability'} />
          <div style={{ fontSize: 10, color: semantic.sidebarIcon, fontStyle: 'italic', marginTop: 4 }}>
            FAO GAEZ v4 · CC BY-NC-SA 3.0 IGO
          </div>
        </div>
      )}
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  options,
  onChange,
  format,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  format?: (v: string) => string;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
      <span style={{ minWidth: 44, color: semantic.sidebarIcon }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
        {options.map((o) => (
          <option key={o} value={o}>
            {format ? format(o) : o}
          </option>
        ))}
      </select>
    </label>
  );
}

// ── Sprint CC — Class / Yield mode toggle. Segmented button pair. ──────────
function ModeToggle({
  value,
  onChange,
}: {
  value: GaezVariable;
  onChange: (v: GaezVariable) => void;
}) {
  const baseBtn: React.CSSProperties = {
    flex: 1,
    background: 'rgba(61, 51, 40, 0.6)',
    color: mapTokens.label,
    border: '1px solid rgba(125, 97, 64, 0.5)',
    padding: '3px 6px',
    fontSize: 12,
    cursor: 'pointer',
  };
  const activeBtn: React.CSSProperties = {
    ...baseBtn,
    background: 'rgba(125, 97, 64, 0.55)',
    borderColor: 'rgba(200, 170, 120, 0.7)',
  };
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
      <span style={{ minWidth: 44, color: semantic.sidebarIcon }}>Mode</span>
      <div style={{ flex: 1, display: 'flex', borderRadius: 4, overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => onChange('suitability')}
          style={{ ...(value === 'suitability' ? activeBtn : baseBtn), borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none' }}
        >
          Class
        </button>
        <button
          type="button"
          onClick={() => onChange('yield')}
          style={{ ...(value === 'yield' ? activeBtn : baseBtn), borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
        >
          Yield
        </button>
      </div>
    </label>
  );
}

// ── Legend — discrete swatches for suitability, gradient strip for yield. ──
function Legend({ variable }: { variable: GaezVariable }) {
  // Sprint CC — pulled from the store (set by GaezOverlay's decode effect).
  const maxYield = useMapStore((s) => s.gaezMaxYield);

  if (variable === 'yield') {
    return (
      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          style={{
            height: 12,
            borderRadius: 3,
            background: YIELD_GRADIENT_CSS,
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: semantic.sidebarIcon }}>
          <span>0</span>
          <span>~{maxYield.toLocaleString()} kg/ha</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {SUITABILITY_SWATCHES.map((s) => (
        <div key={s.code} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
          <span
            style={{
              width: 14,
              height: 10,
              background: rgbaToCss(s.rgba),
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 2,
              flexShrink: 0,
            }}
          />
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

