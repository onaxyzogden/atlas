import { useEffect, useRef, useState } from 'react';
import { Satellite, Mountain, MountainSnow, Map as MapIcon, Layers, type LucideIcon } from 'lucide-react';
import { maplibregl, MAP_STYLES, hasMapToken, maptilerTransformRequest } from '../../lib/maplibre.js';
import { useMapStore, type MapStyle } from '../../store/mapStore.js';
import { semantic, mapZIndex } from '../../lib/tokens.js';
import { map as mapTokens } from '../../lib/tokens.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';

const STYLES: { id: MapStyle; label: string; icon: LucideIcon }[] = [
  { id: 'satellite',   label: 'Satellite',   icon: Satellite },
  { id: 'terrain',     label: 'Terrain',     icon: Mountain },
  { id: 'topographic', label: 'Topographic', icon: MountainSnow },
  { id: 'street',      label: 'Street',      icon: MapIcon },
  { id: 'hybrid',      label: 'Hybrid',      icon: Layers },
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
      // Right pane is a read-only mirror of the primary map. Disabling
      // every interaction handler is what makes that contract real - the
      // bare comment alone wasn't enough: any wheel/drag on the right
      // pane was silently desyncing the views (chrome audit, 2026-04-25).
      interactive: false,
    });
    // Belt-and-braces: even with `interactive: false`, ensure each handler
    // is off in case a future MapLibre upgrade changes the constructor
    // semantics. These are no-ops if already disabled.
    right.dragPan.disable();
    right.scrollZoom.disable();
    right.boxZoom.disable();
    right.dragRotate.disable();
    right.keyboard.disable();
    right.doubleClickZoom.disable();
    right.touchZoomRotate.disable();
    rightMapRef.current = right;

    right.once('load', () => {
      // Snap to primary's CURRENT camera the moment the right pane is
      // ready. Primary may have moved during the brief load window so
      // the constructor-time center is already stale.
      if (rightMapRef.current) {
        rightMapRef.current.jumpTo({
          center: primaryMap.getCenter(),
          zoom: primaryMap.getZoom(),
          pitch: primaryMap.getPitch(),
          bearing: primaryMap.getBearing(),
        });
      }
      setReady(true);
    });

    // â”€â”€ Move sync â€” primary â†’ right only, rAF-throttled so fast pans stay
    // smooth instead of firing a jumpTo per 'move' tick. Right pane is
    // read-only.
    let pending = 0;
    const onPrimaryMove = () => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        const r = rightMapRef.current;
        if (!r) return;
        r.jumpTo({
          center: primaryMap.getCenter(),
          zoom: primaryMap.getZoom(),
          pitch: primaryMap.getPitch(),
          bearing: primaryMap.getBearing(),
        });
      });
    };
    // 'move' fires for pan/zoom/rotate/pitch on current MapLibre, but the
    // dedicated events are also wired up so a future change in 'move'
    // semantics can't silently regress sync.
    primaryMap.on('move', onPrimaryMove);
    primaryMap.on('zoom', onPrimaryMove);
    primaryMap.on('rotate', onPrimaryMove);
    primaryMap.on('pitch', onPrimaryMove);

    return () => {
      if (pending) cancelAnimationFrame(pending);
      primaryMap.off('move', onPrimaryMove);
      primaryMap.off('zoom', onPrimaryMove);
      primaryMap.off('rotate', onPrimaryMove);
      primaryMap.off('pitch', onPrimaryMove);
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

  // Resize handle drag. Both maps render at full viewport width and the
  // right pane is just CSS-clipped, so dragging the divider only updates a
  // clip-path inset — no map.resize() calls required.
  const draggingRef = useRef(false);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const pct = Math.min(85, Math.max(15, (e.clientX / window.innerWidth) * 100));
      setSplitPct(pct);
    };
    const onUp = () => {
      draggingRef.current = false;
      document.body.style.cursor = '';
      // Restore text/element selection once drag ends.
      document.body.style.userSelect = '';
      (document.body.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  if (!active) return null;

  return (
    <>
      {/*
        Right-pane map clipper. Renders at FULL viewport width and is
        CSS-clipped to the right portion. With both maps sharing identical
        canvas geometry AND identical camera state, every world coordinate
        lands at the same screen-x in both panes — true compare-slider
        alignment, not just same-center-different-width offset
        (chrome audit, 2026-04-25).

        pointerEvents: 'none' lets clicks/wheel pass straight through to the
        primary map underneath. The right pane is read-only (interactive:
        false on the map itself), so it has no need to receive events.
      */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: `inset(0 0 0 ${splitPct}%)`,
          WebkitClipPath: `inset(0 0 0 ${splitPct}%)`,
          zIndex: mapZIndex.splitPane,
          pointerEvents: 'none',
        }}
      >
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/*
        Right-pane basemap picker. Positioned outside the clipper so it can
        receive pointer events and isn't subject to the clip-path. Anchored
        just inside the visible right portion (splitPct% + 12px gutter).
      */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: `calc(${splitPct}% + 12px)`,
          maxWidth: `calc(${100 - splitPct}% - 24px)`,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          gap: 2,
          background: 'var(--color-chrome-bg-translucent)',
          borderRadius: 8,
          padding: '3px 4px',
          backdropFilter: 'blur(8px)',
          zIndex: mapZIndex.dropdown,
          pointerEvents: 'auto',
        }}
      >
        {STYLES.map((s) => {
          const Icon = s.icon;
          const active = rightStyle === s.id;
          return (
            <DelayedTooltip key={s.id} label={s.label} position="bottom">
              <button
                onClick={() => setRightStyle(s.id)}
                aria-pressed={active}
                aria-label={s.label}
                style={{
                  width: 28,
                  height: 28,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  borderRadius: 6,
                  border: active
                    ? '1px solid rgba(224, 181, 109, 0.55)'
                    : '1px solid transparent',
                  cursor: 'pointer',
                  background: active ? 'rgba(224, 181, 109, 0.22)' : 'transparent',
                  color: active ? 'var(--color-gold-active, #e0b56d)' : '#c4b49a',
                  transition: 'background 160ms ease, color 160ms ease, border-color 160ms ease',
                }}
              >
                <Icon size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </DelayedTooltip>
          );
        })}
      </div>

      {/* Draggable divider */}
      <div
        onMouseDown={(e) => {
          // Prevent the browser from starting a text selection at mousedown —
          // without this, dragging the divider highlights whatever text or
          // element the pointer crosses (sidebar labels, panel titles, etc.).
          e.preventDefault();
          draggingRef.current = true;
          document.body.style.cursor = 'col-resize';
          // Suppress selection globally during the drag; restored in onUp.
          document.body.style.userSelect = 'none';
          (document.body.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect = 'none';
        }}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `calc(${splitPct}% - 3px)`,
          width: 6,
          cursor: 'col-resize',
          background: 'rgba(196,180,154,0.35)',
          zIndex: mapZIndex.dropdown,
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
