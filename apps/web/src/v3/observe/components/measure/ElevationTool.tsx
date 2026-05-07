import { useEffect, useRef, useState } from 'react';
import type { Map as MaplibreMap, MapMouseEvent, Marker } from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { maplibregl } from '../../../../lib/maplibre.js';
import { api } from '../../../../lib/apiClient.js';
import type { ElevationProfileResponse } from '@ogden/shared';
import { useMapToolStore } from './useMapToolStore.js';
import Sparkline from './sparkline.js';
import css from '../MapToolbar.module.css';

interface Props {
  map: MaplibreMap;
  projectId?: string;
}

type Mode = 'point' | 'path';

export default function ElevationTool({ map, projectId }: Props) {
  const activeTool = useMapToolStore((s) => s.activeTool);
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  const mode: Mode = activeTool === 'elevation-path' ? 'path' : 'point';
  const drawRef = useRef<MapboxDraw | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [pointResult, setPointResult] = useState<{
    elevationM: number | null;
    sourceApi: string;
  } | null>(null);
  const [profile, setProfile] = useState<ElevationProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Point-mode click handler
  useEffect(() => {
    if (mode !== 'point') return;
    if (!projectId) return;
    const onClick = async (e: MapMouseEvent) => {
      markerRef.current?.remove();
      const m = new maplibregl.Marker({ color: '#c4a265' })
        .setLngLat(e.lngLat)
        .addTo(map);
      markerRef.current = m;
      setLoading(true);
      setError(null);
      setPointResult(null);
      try {
        const { data } = await api.elevation.point({
          projectId,
          lng: e.lngLat.lng,
          lat: e.lngLat.lat,
        });
        setPointResult(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    map.on('click', onClick);
    map.getCanvas().style.cursor = 'crosshair';
    return () => {
      map.off('click', onClick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, mode, projectId]);

  // Path-mode draw lifecycle
  useEffect(() => {
    if (mode !== 'path') return;
    if (!projectId) return;
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
    });
    map.addControl(draw);
    draw.changeMode('draw_line_string');
    drawRef.current = draw;

    const onCreate = async () => {
      const all = draw.getAll();
      const feat = all.features[0];
      if (!feat || feat.geometry.type !== 'LineString') return;
      const coords = (feat.geometry as GeoJSON.LineString)
        .coordinates as [number, number][];
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.elevation.profile({
          projectId,
          geometry: { type: 'LineString', coordinates: coords },
          sampleCount: 64,
        });
        setProfile(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    map.on('draw.create', onCreate);

    return () => {
      map.off('draw.create', onCreate);
      try {
        map.removeControl(draw);
      } catch {
        /* map already disposed */
      }
      drawRef.current = null;
    };
  }, [map, mode, projectId]);

  // Cleanup marker on unmount
  useEffect(() => {
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, []);

  const switchMode = (next: Mode) => {
    setPointResult(null);
    setProfile(null);
    setError(null);
    markerRef.current?.remove();
    markerRef.current = null;
    setActiveTool(next === 'path' ? 'elevation-path' : 'elevation-point');
  };

  return (
    <div className={css.popover} role="dialog" aria-label="Elevation">
      <span className={css.popoverTitle}>Elevation</span>
      <div className={css.subModeRow}>
        <button
          type="button"
          className={css.subModeBtn}
          data-active={mode === 'point'}
          onClick={() => switchMode('point')}
        >
          Point
        </button>
        <button
          type="button"
          className={css.subModeBtn}
          data-active={mode === 'path'}
          onClick={() => switchMode('path')}
        >
          Path
        </button>
      </div>

      {!projectId && (
        <span className={css.hint}>
          Open a project to sample elevation.
        </span>
      )}

      {projectId && mode === 'point' && (
        <div className={css.readout}>
          {loading && <span className={css.hint}>Sampling…</span>}
          {error && <span className={css.hint}>Error: {error}</span>}
          {!loading && !error && !pointResult && (
            <span className={css.hint}>
              Click anywhere on the map to sample elevation.
            </span>
          )}
          {pointResult && pointResult.elevationM === null && (
            <span className={css.hint}>No elevation data at this point.</span>
          )}
          {pointResult && pointResult.elevationM !== null && (
            <>
              <span className={css.readoutLabel}>Elevation</span>
              <span className={css.readoutValue}>
                {pointResult.elevationM.toFixed(1)} m (
                {(pointResult.elevationM * 3.28084).toFixed(0)} ft)
              </span>
              <span className={css.hint}>{pointResult.sourceApi}</span>
            </>
          )}
        </div>
      )}

      {projectId && mode === 'path' && (
        <div className={css.readout}>
          {loading && <span className={css.hint}>Sampling profile…</span>}
          {error && <span className={css.hint}>Error: {error}</span>}
          {!loading && !error && !profile && (
            <span className={css.hint}>
              Draw a line on the map. Double-click to finish.
            </span>
          )}
          {profile && profile.minM !== null && profile.maxM !== null && (
            <>
              <Sparkline
                values={profile.samples
                  .map((s) => s.elevationM)
                  .filter((v): v is number => v !== null)}
              />
              <span className={css.readoutLabel}>Range</span>
              <span className={css.readoutValue}>
                {profile.minM.toFixed(0)}–{profile.maxM.toFixed(0)} m (Δ
                {(profile.maxM - profile.minM).toFixed(0)} m)
              </span>
              <span className={css.readoutLabel}>Length</span>
              <span className={css.readoutValue}>
                {(profile.totalDistanceM / 1000).toFixed(2)} km
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
