/**
 * WalkRouteRecorder — GPS path tracing with annotations.
 */

import { useState, useRef, useCallback } from 'react';
import { useFieldworkStore, type WalkRoute } from '../../store/fieldworkStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import { error as errorToken, group } from '../../lib/tokens.js';

interface Props {
  project: LocalProject;
  routes: WalkRoute[];
}

export default function WalkRouteRecorder({ project, routes }: Props) {
  const addWalkRoute = useFieldworkStore((s) => s.addWalkRoute);
  const deleteWalkRoute = useFieldworkStore((s) => s.deleteWalkRoute);

  const [isRecording, setIsRecording] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [pointCount, setPointCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const coordsRef = useRef<[number, number][]>([]);
  const timesRef = useRef<string[]>([]);
  const annotationsRef = useRef<{ index: number; text: string }[]>([]);
  const startTimeRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const startRecording = useCallback(() => {
    if (!navigator.geolocation) {
      alert('GPS not available on this device.');
      return;
    }

    coordsRef.current = [];
    timesRef.current = [];
    annotationsRef.current = [];
    startTimeRef.current = Date.now();
    setPointCount(0);
    setElapsed(0);
    setIsRecording(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coord: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        coordsRef.current.push(coord);
        timesRef.current.push(new Date().toISOString());
        setPointCount(coordsRef.current.length);
      },
      (err) => console.warn('[Fieldwork] GPS error:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );

    timerRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const addAnnotation = useCallback(() => {
    const text = prompt('Add annotation at current position:');
    if (text) {
      annotationsRef.current.push({ index: coordsRef.current.length - 1, text });
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (coordsRef.current.length >= 2) {
      // Calculate distance
      let dist = 0;
      for (let i = 1; i < coordsRef.current.length; i++) {
        const [lng1, lat1] = coordsRef.current[i - 1]!;
        const [lng2, lat2] = coordsRef.current[i]!;
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        dist += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }

      const route: WalkRoute = {
        id: crypto.randomUUID(),
        projectId: project.id,
        name: routeName || `Walk ${new Date().toLocaleDateString()}`,
        coordinates: coordsRef.current,
        timestamps: timesRef.current,
        annotations: annotationsRef.current,
        distanceM: Math.round(dist),
        durationMs: Date.now() - startTimeRef.current,
        startedAt: timesRef.current[0] ?? new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      addWalkRoute(route);
    }

    setIsRecording(false);
    setRouteName('');
  }, [project.id, routeName, addWalkRoute]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      {isRecording ? (
        <div style={{
          padding: 16, borderRadius: 10,
          background: 'rgba(196,78,63,0.06)',
          border: '1px solid rgba(196,78,63,0.2)',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: errorToken.DEFAULT }}>
              {'\u25CF'} Recording...
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-panel-text)', fontFamily: 'monospace' }}>
              {formatDuration(elapsed)}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-panel-muted)', marginBottom: 12 }}>
            {pointCount} GPS points captured
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={addAnnotation} style={{
              flex: 1, padding: '8px', fontSize: 11, border: '1px solid rgba(196,162,101,0.2)',
              borderRadius: 6, background: 'transparent', color: group.livestock, cursor: 'pointer',
            }}>
              + Annotation
            </button>
            <button onClick={stopRecording} style={{
              flex: 1, padding: '8px', fontSize: 11, fontWeight: 600, border: 'none',
              borderRadius: 6, background: 'rgba(196,78,63,0.15)', color: errorToken.DEFAULT, cursor: 'pointer',
            }}>
              Stop & Save
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Route name (optional)"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px', fontSize: 12, marginBottom: 8,
              background: 'var(--color-panel-subtle)', border: '1px solid var(--color-panel-card-border)',
              borderRadius: 6, color: 'var(--color-panel-text)', fontFamily: 'inherit', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button onClick={startRecording} style={{
            width: '100%', padding: '10px', fontSize: 12, fontWeight: 600,
            border: 'none', borderRadius: 8,
            background: 'rgba(196,162,101,0.15)', color: group.livestock, cursor: 'pointer',
          }}>
            {'\u{1F6B6}'} Start Walk Recording
          </button>
        </div>
      )}

      {/* Saved routes */}
      {routes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-panel-section)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Saved Routes ({routes.length})
          </div>
          {routes.map((route) => (
            <div key={route.id} style={{
              padding: '10px 12px', borderRadius: 8,
              background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-panel-text)' }}>{route.name}</span>
                <button onClick={() => deleteWalkRoute(route.id)} style={{ background: 'none', border: 'none', color: 'var(--color-panel-muted)', cursor: 'pointer', fontSize: 14 }}>{'\u00D7'}</button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-panel-muted)', marginTop: 2 }}>
                {route.distanceM}m &middot; {route.coordinates.length} pts &middot; {route.annotations.length} annotations
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
