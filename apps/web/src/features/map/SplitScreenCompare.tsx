import { useEffect, useRef, useState } from 'react';
import { maplibregl, MAP_STYLES, hasMapToken, maptilerTransformRequest } from '../../lib/maplibre.js';
import { useMapStore, type MapStyle } from '../../store/mapStore.js';
import { semantic } from '../../lib/tokens.js';
import { map as mapTokens } from '../../lib/tokens.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';

const STYLES: { id: MapStyle; label: string }[] = [
  { id: 'satellite',   label: 'Satellite' },
  { id: 'terrain',     label: 'Terrain' },
  { id: 'topographic', label: 'Topographic' },
  { id: 'street',      label: 'Street' },
  { id: 'hybrid',      label: 'Hybrid' },
];

interface SplitScreenCompareProps {
  primaryMap: maplibregl.Map | null;
  boundaryGeojson?: GeoJSON.FeatureCollection | null | undefined;
  /**
   * Read-only snapshot of the current draw features on the primary map.
   * Rendered as a mirror on the compare pane so measurement lines/polygons
   * drawn on the left are visible on the right.
   */
  mirrorFeatures?: GeoJSON.FeatureCollection | null | undefined;
}

/**
 * Â§2 split-screen compare. Mounts a second maplibre map inside a resizable
 * right pane and syncs its camera with the primary map via `move` events.
 * The compare pane is read-only: no draw, no edit, no layers except boundary
 * + an optional mirror of the primary map's drawn features.
 */
export default function SplitScreenCompare({ primaryMap, boundaryGeojson, mirrorFeatures }: SplitScreenCompareProps) {
  const active = useMapStore((s) => s.splitScreenActive);
  const rightStyle = useMapStore((s) => s.splitScreenStyle);
  const setRightStyle = useMapStore((s) => s.setSplitScreenStyle);

  const containerRef = useRef<HTMLDivElement>(null);
  const rightMapRef = useRef<maplibregl.Map | null>(null);
  const [splitPct, setSplitPct] = useState(50);
  const [ready, setReady] = useState(false);

  // Init the right map once when split activates.
  useEffect(() => {
    if (!active || !primaryMap || !containerRef.current) return;
    if (!hasMapToken) return;
    if (rightMapRef.current) return;

    const center = primaryMap.getCenter();
    const zoom = primaryMap.getZoom();

    const right = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES[rightStyle] ?? MAP_STYLES['satellite']!,
      center: [center.lng, center.lat],
      zoom,
      pitch: primaryMap.getPitch(),
      bearing: primaryMap.getBearing(),
      transformRequest: maptilerTransformRequest,
    });
    rightMapRef.current = right;

    right.once('load', () => setReady(true));

    // â”€â”€ Move sync â€” primary â†’ right only, rAF-throttled so fast pans stay
    // smooth instead of firing a jumpTo per 'move' tick. Right pane is
    // read-only.
    let pending = 0;
    const onPrimaryMove = () => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        right.jumpTo({
          center: primaryMap.getCenter(),
          zoom: primaryMap.getZoom(),
          pitch: primaryMap.getPitch(),
          bearing: primaryMap.getBearing(),
        });
      });
    };
    primaryMap.on('move', onPrimaryMove);

    return () => {
      if (pending) cancelAnimationFrame(pending);
      primaryMap.off('move', onPrimaryMove);
      right.remove();
      rightMapRef.current = null;
      setReady(false);
    };
  }, [active, primaryMap, rightStyle]);

  // Swap the right pane's style when the picker changes.
  useEffect(() => {
    const right = rightMapRef.current;
    if (!right || !ready) return;
    right.setStyle(MAP_STYLES[rightStyle] ?? MAP_STYLES['satellite']!);
  }, [rightStyle, ready]);

  // Render boundary + mirrored draw features on the right pane.
  useEffect(() => {
    const right = rightMapRef.current;
    if (!right || !ready) return;

    const paint = () => {
      if (!right.isStyleLoaded()) return;

      if (boundaryGeojson) {
        if (!right.getSource('split-boundary')) {
          right.addSource('split-boundary', { type: 'geojson', data: boundaryGeojson });
          right.addLayer({
            id: 'split-boundary-fill',
            type: 'fill',
            source: 'split-boundary',
            paint: { 'fill-color': mapTokens.boundary, 'fill-opacity': 0.12 },
          });
          right.addLayer({
            id: 'split-boundary-line',
            type: 'line',
            source: 'split-boundary',
            paint: { 'line-color': mapTokens.boundary, 'line-width': 2.5 },
          });
        } else {
          (right.getSource('split-boundary') as maplibregl.GeoJSONSource).setData(boundaryGeojson);
        }
      }

      if (mirrorFeatures) {
        const src = right.getSource('split-mirror') as maplibregl.GeoJSONSource | undefined;
        if (src) {
          src.setData(mirrorFeatures);
        } else {
          right.addSource('split-mirror', { type: 'geojson', data: mirrorFeatures });
          right.addLayer({
            id: 'split-mirror-line',
            type: 'line',
            source: 'split-mirror',
            paint: { 'line-color': '#ffd27f', 'line-width': 2, 'line-dasharray': [1.5, 1] },
            filter: ['any', ['==', ['geometry-type'], 'LineString'], ['==', ['geometry-type'], 'Polygon']],
          });
          right.addLayer({
            id: 'split-mirror-fill',
            type: 'fill',
            source: 'split-mirror',
            paint: { 'fill-color': '#ffd27f', 'fill-opacity': 0.15 },
            filter: ['==', ['geometry-type'], 'Polygon'],
          });
          right.addLayer({
            id: 'split-mirror-point',
            type: 'circle',
            source: 'split-mirror',
            paint: { 'circle-radius': 5, 'circle-color': '#ffd27f', 'circle-stroke-width': 1.5, 'circle-stroke-color': '#1a1a1a' },
            filter: ['==', ['geometry-type'], 'Point'],
          });
        }
      }
    };
    paint();
    right.on('style.load', paint);
    return () => {
      right.off('style.load', paint);
    };
  }, [ready, boundaryGeojson, mirrorFeatures]);

  // Resize handle drag.
  const draggingRef = useRef(false);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const pct = Math.min(85, Math.max(15, (e.clientX / window.innerWidth) * 100));
      setSplitPct(pct);
      primaryMap?.resize();
      rightMapRef.current?.resize();
    };
    const onUp = () => { draggingRef.current = false; document.body.style.cursor = ''; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [primaryMap]);

  // Resize primary map when the split pane collapses/opens.
  useEffect(() => {
    primaryMap?.resize();
    rightMapRef.current?.resize();
  }, [active, splitPct, primaryMap]);

  if (!active) return null;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: `${100 - splitPct}%`,
          borderLeft: '2px solid rgba(196,180,154,0.4)',
          zIndex: 3,
          pointerEvents: 'auto',
        }}
      >
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            gap: 4,
            background: 'var(--color-chrome-bg-translucent)',
            borderRadius: 8,
            padding: '4px 6px',
            backdropFilter: 'blur(8px)',
          }}
        >
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setRightStyle(s.id)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                background: rightStyle === s.id ? semantic.primary : 'transparent',
                color: rightStyle === s.id ? '#fff' : '#c4b49a',
              }}
              aria-pressed={rightStyle === s.id}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Draggable divider */}
      <div
        onMouseDown={() => { draggingRef.current = true; document.body.style.cursor = 'col-resize'; }}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `calc(${splitPct}% - 3px)`,
          width: 6,
          cursor: 'col-resize',
          background: 'rgba(196,180,154,0.35)',
          zIndex: 4,
          pointerEvents: 'auto',
        }}
      />
    </>
  );
}

export function SplitScreenToggle() {
  const active = useMapStore((s) => s.splitScreenActive);
  const setActive = useMapStore((s) => s.setSplitScreenActive);
  return (
    <DelayedTooltip label="Split-screen compare" position="bottom">
      <button
        onClick={() => setActive(!active)}
        aria-pressed={active}
        className={active ? 'signifier-shimmer' : undefined}
        style={{
          padding: '6px 10px',
          borderRadius: 6,
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 500,
          background: active ? semantic.primary : 'var(--color-chrome-bg-translucent)',
          color: active ? '#fff' : '#c4b49a',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'auto',
        }}
      >
        {active ? 'Split · on' : 'Split'}
      </button>
    </DelayedTooltip>
  );
}
