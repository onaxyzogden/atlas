/**
 * MeasureTools — distance and area measurement on the map using Turf.js.
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
import { map as mapTokens, semantic } from '../../lib/tokens.js';

type MeasureMode = 'none' | 'distance' | 'area' | 'elevation';

interface MeasureToolsProps {
  draw: MapboxDraw | null;
  map: maplibregl.Map | null;
  projectId: string;
}

export default function MeasureTools({ draw, map, projectId }: MeasureToolsProps) {
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
      // Entering a different mode — clear any stale elevation pin.
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
            setResult(`${areaM2.toFixed(0)} m²`);
          }
        }
      };

      // Remove old listener, add new
      map.off('draw.create', handleCreate);
      map.on('draw.create', handleCreate);
    },
    [draw, map, mode, setMeasuring, clearElevMarker],
  );

  // Elevation click handler — when mode is 'elevation', single click on the
  // map samples the point and displays the elevation.
  useEffect(() => {
    if (!map || mode !== 'elevation') return;
    const onClick = async (e: maplibregl.MapMouseEvent) => {
      setResult('Sampling…');
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
          background: 'rgba(26, 22, 17, 0.85)',
          borderRadius: 8,
          padding: '4px 6px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <ToolButton
          active={mode === 'distance'}
          label="Distance"
          icon="📏"
          onClick={() => startMeasure('distance')}
        />
        <ToolButton
          active={mode === 'area'}
          label="Area"
          icon="⬡"
          onClick={() => startMeasure('area')}
        />
        <ToolButton
          active={mode === 'elevation'}
          label="Elevation"
          icon="▲"
          onClick={() => startMeasure('elevation')}
        />
        {mode !== 'none' && (
          <ToolButton active={false} label="Clear" icon="✕" onClick={clearMeasure} />
        )}
      </div>

      {/* Result display */}
      {result && (
        <div
          style={{
            background: 'rgba(26, 22, 17, 0.92)',
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
            background: 'rgba(26, 22, 17, 0.75)',
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
