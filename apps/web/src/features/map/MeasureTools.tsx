/**
 * MeasureTools — distance and area measurement on the map using Turf.js.
 *
 * Activated from the map toolbar. Displays result in an overlay.
 * Uses MapboxDraw in simple_select / draw_line_string / draw_polygon modes.
 */

import { useState, useCallback } from 'react';
import * as turf from '@turf/turf';
import { useMapStore } from '../../store/mapStore.js';

type MeasureMode = 'none' | 'distance' | 'area';

interface MeasureToolsProps {
  draw: MapboxDraw | null;
  map: mapboxgl.Map | null;
}

export default function MeasureTools({ draw, map }: MeasureToolsProps) {
  const [mode, setMode] = useState<MeasureMode>('none');
  const [result, setResult] = useState<string | null>(null);
  const { isMeasuring, setMeasuring } = useMapStore();

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
        return;
      }

      setMode(m);
      setMeasuring(true);

      if (m === 'distance') {
        draw.changeMode('draw_line_string');
      } else if (m === 'area') {
        draw.changeMode('draw_polygon');
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
    [draw, map, mode, setMeasuring],
  );

  const clearMeasure = useCallback(() => {
    draw?.deleteAll();
    draw?.changeMode('simple_select');
    setMode('none');
    setResult(null);
    setMeasuring(false);
  }, [draw, setMeasuring]);

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
            color: '#f2ede3',
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
            color: '#9a8a74',
            fontSize: 11,
          }}
        >
          {mode === 'distance' ? 'Click points to measure distance. Double-click to finish.' : 'Click points to draw area. Double-click to finish.'}
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
        background: active ? '#7d6140' : 'transparent',
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
