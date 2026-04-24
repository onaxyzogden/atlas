/**
 * MeasureTools â€” distance and area measurement on the map using Turf.js.
 *
 * Activated from the map toolbar. Displays result in an overlay.
 * Uses MapboxDraw in simple_select / draw_line_string / draw_polygon modes.
 */

import type maplibregl from 'maplibre-gl';
import { maplibregl as maplibreDefault } from '../../lib/maplibre.js';
import { useState, useCallback, useEffect, useRef } from 'react';
import * as turf from '@turf/turf';
import { useMapStore } from '../../store/mapStore.js';
import { api } from '../../lib/apiClient.js';
import { map as mapTokens, mapZIndex, semantic } from '../../lib/tokens.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';

type MeasureMode = 'none' | 'distance' | 'area' | 'elevation';

interface MeasureToolsProps {
  draw: MapboxDraw | null;
  map: maplibregl.Map | null;
  projectId: string;
  /** When true, renders a single 40 px icon trigger that expands into the
   *  3-sub-button popover to the right. Intended for the left tool spine. */
  compact?: boolean;
}

export default function MeasureTools({ draw, map, projectId, compact = false }: MeasureToolsProps) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<MeasureMode>('none');
  const [result, setResult] = useState<string | null>(null);
  const { isMeasuring, setMeasuring } = useMapStore();
  const elevMarkerRef = useRef<maplibregl.Marker | null>(null);

  const clearElevMarker = useCallback(() => {
    elevMarkerRef.current?.remove();
    elevMarkerRef.current = null;
  }, []);

  const startMeasure = useCallback(
    (m: MeasureMode) => {
      if (!draw || !map) return;

      // Clear previous
      draw.deleteAll();
      setResult(null);

      if (m === mode) {
        // Toggle off
        setMode('none');
        setMeasuring(false);
        draw.changeMode('simple_select');
        map.getCanvas().style.cursor = '';
        clearElevMarker();
        return;
      }
      // Entering a different mode â€” clear any stale elevation pin.
      clearElevMarker();

      setMode(m);
      setMeasuring(true);

      if (m === 'distance') {
        draw.changeMode('draw_line_string');
      } else if (m === 'area') {
        draw.changeMode('draw_polygon');
      } else if (m === 'elevation') {
        draw.changeMode('simple_select');
        map.getCanvas().style.cursor = 'crosshair';
      }

      // Listen for draw completion
      const handleCreate = () => {
        const all = draw.getAll();
        if (all.features.length === 0) return;

        const feature = all.features[0]!;
        if (m === 'distance' && feature.geometry.type === 'LineString') {
          const length = turf.length(feature as GeoJSON.Feature<GeoJSON.LineString>, { units: 'meters' });
          if (length > 1000) {
            setResult(`${(length / 1000).toFixed(2)} km`);
          } else {
            setResult(`${length.toFixed(1)} m`);
          }
        } else if (m === 'area' && feature.geometry.type === 'Polygon') {
          const areaM2 = turf.area(feature as GeoJSON.Feature<GeoJSON.Polygon>);
          if (areaM2 > 10000) {
            setResult(`${(areaM2 / 10000).toFixed(2)} ha (${(areaM2 / 4046.86).toFixed(2)} ac)`);
          } else {
            setResult(`${areaM2.toFixed(0)} mÂ²`);
          }
        }
      };

      // Remove old listener, add new
      map.off('draw.create', handleCreate);
      map.on('draw.create', handleCreate);
    },
    [draw, map, mode, setMeasuring, clearElevMarker],
  );

  // Elevation click handler â€” when mode is 'elevation', single click on the
  // map samples the point and displays the elevation.
  useEffect(() => {
    if (!map || mode !== 'elevation') return;
    const onClick = async (e: maplibregl.MapMouseEvent) => {
      setResult('Samplingâ€¦');
      // Drop a persistent marker at the click so the user can see what was
      // sampled; replaces any previous elevation pin.
      clearElevMarker();
      const marker = new maplibreDefault.Marker({ color: semantic.primary })
        .setLngLat(e.lngLat)
        .addTo(map);
      elevMarkerRef.current = marker;
      try {
        const { data } = await api.elevation.point({ projectId, lng: e.lngLat.lng, lat: e.lngLat.lat });
        if (data.elevationM === null) {
          setResult('No elevation data at this point');
          marker.setPopup(new maplibreDefault.Popup({ offset: 18 }).setText('No data')).togglePopup();
        } else {
          const ft = data.elevationM * 3.28084;
          const text = `${data.elevationM.toFixed(1)} m  (${ft.toFixed(0)} ft)`;
          setResult(text);
          marker.setPopup(new maplibreDefault.Popup({ offset: 18 }).setText(text)).togglePopup();
        }
      } catch (err) {
        setResult(`Elevation lookup failed: ${(err as Error).message}`);
      }
    };
    map.on('click', onClick);
    return () => { map.off('click', onClick); };
  }, [map, mode, projectId, clearElevMarker]);

  // Clean up the pin if the component unmounts.
  useEffect(() => clearElevMarker, [clearElevMarker]);

  const clearMeasure = useCallback(() => {
    draw?.deleteAll();
    draw?.changeMode('simple_select');
    clearElevMarker();
    if (map) map.getCanvas().style.cursor = '';
    setMode('none');
    setResult(null);
    setMeasuring(false);
  }, [draw, map, setMeasuring, clearElevMarker]);

  const modeButtons = (
    <>
      <ToolButton
        active={mode === 'distance'}
        label="Distance"
        icon="ðŸ“"
        onClick={() => startMeasure('distance')}
      />
      <ToolButton
        active={mode === 'area'}
        label="Area"
        icon="â¬¡"
        onClick={() => startMeasure('area')}
      />
      <ToolButton
        active={mode === 'elevation'}
        label="Elevation"
        icon="â–²"
        onClick={() => startMeasure('elevation')}
      />
      {mode !== 'none' && (
        <ToolButton active={false} label="Clear" icon="âœ•" onClick={clearMeasure} />
      )}
    </>
  );

  if (compact) {
    return (
      <div style={{ position: 'relative', pointerEvents: 'auto' }}>
        <DelayedTooltip label="Measure distance, area, or elevation" position="right">
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-pressed={mode !== 'none'}
          aria-expanded={expanded}
          className={`spine-btn${mode !== 'none' ? ' signifier-shimmer' : ''}`}
          data-active={mode !== 'none'}
          aria-label="Measure tools"
        >
          {/* Lucide Ruler */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21.3 15.3 8.7 2.7a1 1 0 0 0-1.4 0L2.7 7.3a1 1 0 0 0 0 1.4l12.6 12.6a1 1 0 0 0 1.4 0l4.6-4.6a1 1 0 0 0 0-1.4Z"/>
            <path d="m7 11 1.5 1.5"/><path d="m10 8 1.5 1.5"/><path d="m13 11 1.5 1.5"/><path d="m16 8 1.5 1.5"/>
          </svg>
        </button>
        </DelayedTooltip>
        {expanded && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 'calc(100% + 8px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              pointerEvents: 'auto',
              zIndex: mapZIndex.dropdown,
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 4,
                background: 'var(--color-chrome-bg-translucent)',
                borderRadius: 8,
                padding: '4px 6px',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(196,180,154,0.25)',
              }}
            >
              {modeButtons}
            </div>
            {result && (
              <div
                style={{
                  background: 'var(--color-chrome-bg-translucent)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  backdropFilter: 'blur(8px)',
                  color: mapTokens.label,
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.02em',
                  border: '1px solid rgba(196,180,154,0.25)',
                }}
              >
                {result}
              </div>
            )}
            {mode !== 'none' && !result && (
              <div
                style={{
                  background: 'var(--color-chrome-bg-translucent)',
                  borderRadius: 8,
                  padding: '6px 10px',
                  color: semantic.sidebarIcon,
                  fontSize: 11,
                  border: '1px solid rgba(196,180,154,0.25)',
                }}
              >
                {mode === 'distance'
                  ? 'Click points to measure distance. Double-click to finish.'
                  : mode === 'area'
                  ? 'Click points to draw area. Double-click to finish.'
                  : 'Click anywhere on the map to sample elevation.'}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        pointerEvents: 'auto',
        flexShrink: 0,
      }}
    >
      {/* Toolbar buttons */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          background: 'var(--color-chrome-bg-translucent)',
          borderRadius: 8,
          padding: '4px 6px',
          backdropFilter: 'blur(8px)',
        }}
      >
        {modeButtons}
      </div>

      {/* Result display */}
      {result && (
        <div
          style={{
            background: 'var(--color-chrome-bg-translucent)',
            borderRadius: 8,
            padding: '8px 12px',
            backdropFilter: 'blur(8px)',
            color: mapTokens.label,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.02em',
          }}
        >
          {result}
        </div>
      )}

      {mode !== 'none' && !result && (
        <div
          style={{
            background: 'var(--color-chrome-bg-translucent)',
            borderRadius: 8,
            padding: '6px 10px',
            color: semantic.sidebarIcon,
            fontSize: 11,
          }}
        >
          {mode === 'distance'
            ? 'Click points to measure distance. Double-click to finish.'
            : mode === 'area'
            ? 'Click points to draw area. Double-click to finish.'
            : 'Click anywhere on the map to sample elevation.'}
        </div>
      )}
    </div>
  );
}

function ToolButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        padding: '5px 10px',
        borderRadius: 6,
        border: 'none',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 500,
        background: active ? semantic.primary : 'transparent',
        color: active ? '#fff' : '#c4b49a',
        transition: 'background 200ms ease',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <span style={{ fontSize: 13 }}>{icon}</span>
      {label}
    </button>
  );
}
