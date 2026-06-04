// ObserveMap.tsx -- read-only MapLibre basemap for the Observe lens.
//
// Replaces PseudoMap when the live bundle resolves real geometry (see
// buildObserveMap in lensData/liveBundle.ts). Draws the parcel boundary as a
// GeoJSON layer and overlays observation pins re-projected on every map move,
// reusing the shared ObservationPin markup so the pin look/interactions match
// PseudoMap exactly. Read-only: no draw, rotation disabled (true-north).

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  maplibregl,
  MAP_STYLES,
  ESRI_WORLD_IMAGERY_STYLE,
  hasMapToken,
} from '../../../lib/maplibre.js';
import { C, F } from './tokens.js';
import { ObservationPin } from './components.js';
import { useLensData } from './lensData/LensDataContext.js';
import type { BBox, LensDisplay, MockObservation, ObserveMapMarker } from './types.js';

export interface ObserveMapProps {
  boundary: GeoJSON.FeatureCollection | null;
  bbox: BBox;
  markers: ObserveMapMarker[];
  activeLens: string;
  onObsClick: (obs: MockObservation) => void;
  selectedObs: MockObservation | null;
  demoGeometry: boolean;
}

export default function ObserveMap({
  boundary,
  bbox,
  markers,
  activeLens,
  onObsClick,
  selectedObs,
  demoGeometry,
}: ObserveMapProps) {
  const { lenses: LENSES } = useLensData();
  const lensById: Record<string, LensDisplay> = Object.fromEntries(LENSES.map((l) => [l.id, l]));

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<ObserveMapMarker[]>(markers);
  const boundaryRef = useRef<GeoJSON.FeatureCollection | null>(boundary);
  markersRef.current = markers;
  boundaryRef.current = boundary;

  const [ready, setReady] = useState(false);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Re-project every marker's [lng,lat] to screen px. Reads refs so the map
  // event listeners never capture a stale marker list.
  const reposition = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const next: Record<string, { x: number; y: number }> = {};
    for (const m of markersRef.current) {
      const p = map.project([m.lng, m.lat]);
      next[m.id] = { x: p.x, y: p.y };
    }
    setPositions(next);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = new maplibregl.Map({
      container,
      style: hasMapToken ? MAP_STYLES.hybrid : ESRI_WORLD_IMAGERY_STYLE,
      bounds: bbox,
      fitBoundsOptions: { padding: 48 },
      attributionControl: { compact: true },
      dragRotate: false,
    });
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      const b = boundaryRef.current;
      if (b) {
        map.addSource('parcel', { type: 'geojson', data: b });
        map.addLayer({
          id: 'parcel-fill',
          type: 'fill',
          source: 'parcel',
          paint: { 'fill-color': '#5AAF72', 'fill-opacity': 0.1 },
        });
        map.addLayer({
          id: 'parcel-line',
          type: 'line',
          source: 'parcel',
          paint: { 'line-color': '#7BBF8C', 'line-width': 1.5, 'line-opacity': 0.85 },
        });
      }
      setReady(true);
      reposition();
    });
    map.on('move', reposition);
    map.on('resize', reposition);

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // bbox/boundary are captured once at mount; the bundle rebuilds (new
    // component instance) if the project changes, so a deps array of
    // [reposition] is correct and intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reposition]);

  // Re-project when the marker set changes after the map is ready.
  useEffect(() => {
    if (ready) reposition();
  }, [markers, ready, reposition]);

  const sel = selectedObs && positions[selectedObs.id] ? positions[selectedObs.id] : null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0D1209', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="sglow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {ready &&
          markers.map((m) => {
            const pos = positions[m.id];
            if (!pos) return null;
            const lens = lensById[m.lens];
            const isActive = !activeLens || activeLens === 'all' || m.lens === activeLens;
            const isSelected = selectedObs?.id === m.id;
            return (
              <ObservationPin
                key={m.id}
                px={pos.x}
                py={pos.y}
                obs={m}
                mapColor={lens?.mapColor}
                isActive={isActive}
                isSelected={isSelected}
                onClick={onObsClick}
              />
            );
          })}
      </svg>

      {selectedObs && sel && (
        <div
          style={{
            position: 'absolute',
            left: sel.x + 14,
            top: sel.y - 20,
            background: C.bg3,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 8,
            padding: '8px 12px',
            maxWidth: 200,
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ fontSize: 13, color: C.textPrimary, fontWeight: 600, fontFamily: F.sans }}>{selectedObs.label}</div>
          <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 3, fontFamily: F.mono }}>
            {selectedObs.type} - {selectedObs.age} ago
          </div>
        </div>
      )}

      {demoGeometry && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            background: C.bg3 + 'EE',
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            color: C.textSecondary,
            fontFamily: F.mono,
            letterSpacing: '0.08em',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          SAMPLE LOCATION DATA
        </div>
      )}
    </div>
  );
}
