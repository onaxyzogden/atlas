/**
 * Sprint CB — map-side FAO GAEZ v4 suitability overlay.
 *
 * Two responsibilities, co-located because they share state (gaezSelection):
 *
 *   1. <GaezOverlay map={map} />
 *        When `visibleLayers` contains `gaez_suitability`, decodes the currently-
 *        selected (crop, waterSupply, inputLevel) suitability COG via geotiff.js
 *        into a full-world offscreen canvas (4320×2160) and mounts it as a
 *        MapLibre `canvas` source + `raster` layer. On selection change,
 *        re-decodes and nudges MapLibre to re-read the canvas via the standard
 *        play()/pause() trick. On toggle-off or unmount, tears down the layer
 *        + source.
 *
 *   2. <GaezMapControls />
 *        Floating top-right panel: three dropdowns (crop / water / input) +
 *        color legend. Fetches `/api/v1/gaez/catalog` once on first enable,
 *        seeds a canonical default (`maize / rainfed / high`), and pushes
 *        selection changes into `useMapStore`.
 *
 * Design notes:
 *  - Canvas-source re-upload: MapLibre reads a `type:'canvas'` source once on
 *    add when `animate:false`. Call `src.play(); src.pause()` after changing
 *    pixels to force a re-read.
 *  - Z-order: we pass `beforeId` pointing at the first `symbol` layer (labels)
 *    so the overlay sits below symbols but above the base style. Parcel fills
 *    happen to be added later than this component, so they always render on
 *    top as long as they're added after us.
 *  - Decode cost: 4320×2160 Uint8/Int16 → ~50–80ms on a modern laptop. Fine
 *    for main-thread MVP; defer Web Worker offload until profiled.
 */

import type maplibregl from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fromUrl } from 'geotiff';
import { useMapStore, type GaezInputLevel, type GaezSelection, type GaezWaterSupply } from '../../store/mapStore.js';
import { suitabilityToRgba, SUITABILITY_SWATCHES, rgbaToCss } from './gaezColor.js';
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

// ── GaezOverlay — the canvas-source + decode lifecycle ─────────────────────

interface GaezOverlayProps {
  map: maplibregl.Map | null;
}

export function GaezOverlay({ map }: GaezOverlayProps) {
  const visible = useMapStore((s) => s.visibleLayers.has('gaez_suitability'));
  const selection = useMapStore((s) => s.gaezSelection);

  // Offscreen canvas (created once, reused across selection changes).
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  if (!canvasRef.current && typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = WORLD_WIDTH;
    c.height = WORLD_HEIGHT;
    canvasRef.current = c;
  }

  // ── Add/remove the MapLibre source+layer based on visibility. ────────────
  useEffect(() => {
    if (!map) return;
    if (!visible) {
      if (map.getLayer(OVERLAY_LAYER_ID)) map.removeLayer(OVERLAY_LAYER_ID);
      if (map.getSource(OVERLAY_SOURCE_ID)) map.removeSource(OVERLAY_SOURCE_ID);
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
        const tiff = await fromUrl(url);
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

        const imageData = ctx.createImageData(srcW, srcH);
        const N = srcW * srcH;
        for (let i = 0; i < N; i++) {
          const code = band[i] as number;
          const [r, g, b, a] = suitabilityToRgba(code);
          const o = i * 4;
          imageData.data[o    ] = r;
          imageData.data[o + 1] = g;
          imageData.data[o + 2] = b;
          imageData.data[o + 3] = a;
        }

        // If the raster is smaller than our canvas (defensive), size canvas to match.
        if (canvas.width !== srcW || canvas.height !== srcH) {
          canvas.width = srcW;
          canvas.height = srcH;
        }
        ctx.putImageData(imageData, 0, 0);

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
  }, [map, visible, selection]);

  return null;
}

function rasterUrl(sel: GaezSelection): string {
  // API proxy is served same-origin via the Vite dev proxy.
  return `/api/v1/gaez/raster/${encodeURIComponent(sel.crop)}/${encodeURIComponent(sel.waterSupply)}/${encodeURIComponent(sel.inputLevel)}/suitability`;
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
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch catalog once on first enable.
  useEffect(() => {
    if (!visible || catalog) return;
    let cancelled = false;
    fetch('/api/v1/gaez/catalog')
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
  }, [visible, catalog]);

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
            </>
          )}
          <Legend />
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

function Legend() {
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
