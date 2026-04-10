/**
 * GPSTracker — shows live GPS location on the map as a pulsing blue dot.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { maplibregl } from '../../lib/maplibre.js';

interface GPSTrackerProps {
  map: maplibregl.Map | null;
  isMapReady: boolean;
}

export default function GPSTracker({ map, isMapReady }: GPSTrackerProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (!map || !isMapReady || !navigator.geolocation) return;

    setIsTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        setAccuracy(acc);

        if (!markerRef.current) {
          // Create pulsing blue dot
          const el = document.createElement('div');
          el.className = 'gps-dot';
          el.style.cssText = `
            width: 16px; height: 16px;
            background: #4A90D9;
            border: 3px solid #fff;
            border-radius: 50%;
            box-shadow: 0 0 0 0 rgba(74, 144, 217, 0.4);
            animation: gpsPulse 2s infinite;
          `;

          // Add animation
          if (!document.getElementById('gps-pulse-style')) {
            const style = document.createElement('style');
            style.id = 'gps-pulse-style';
            style.textContent = `
              @keyframes gpsPulse {
                0% { box-shadow: 0 0 0 0 rgba(74, 144, 217, 0.4); }
                70% { box-shadow: 0 0 0 12px rgba(74, 144, 217, 0); }
                100% { box-shadow: 0 0 0 0 rgba(74, 144, 217, 0); }
              }
            `;
            document.head.appendChild(style);
          }

          markerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([longitude, latitude])
            .addTo(map);
        } else {
          markerRef.current.setLngLat([longitude, latitude]);
        }
      },
      () => { /* error — silently continue */ },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  }, [map, isMapReady]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    markerRef.current?.remove();
    markerRef.current = null;
    setIsTracking(false);
    setAccuracy(null);
  }, []);

  const flyToLocation = useCallback(() => {
    if (!map || !markerRef.current) return;
    const lngLat = markerRef.current.getLngLat();
    map.flyTo({ center: [lngLat.lng, lngLat.lat], zoom: 17, duration: 1200 });
  }, [map]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      markerRef.current?.remove();
    };
  }, []);

  if (!navigator.geolocation) return null;

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <button
        onClick={isTracking ? stopTracking : startTracking}
        style={{
          padding: '6px 10px',
          fontSize: 11,
          fontWeight: 500,
          border: isTracking ? '1px solid rgba(74,144,217,0.3)' : '1px solid var(--color-panel-card-border)',
          borderRadius: 6,
          background: isTracking ? 'rgba(74,144,217,0.1)' : 'transparent',
          color: isTracking ? '#4A90D9' : 'var(--color-panel-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: isTracking ? '#4A90D9' : 'var(--color-panel-subtle)',
          animation: isTracking ? 'gpsPulse 2s infinite' : 'none',
        }} />
        {isTracking ? 'GPS On' : 'GPS'}
      </button>

      {isTracking && markerRef.current && (
        <button
          onClick={flyToLocation}
          style={{
            padding: '6px 8px',
            fontSize: 11,
            border: '1px solid var(--color-panel-card-border)',
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--color-panel-muted)',
            cursor: 'pointer',
          }}
          title="Fly to my location"
        >
          {'\u{1F4CD}'}
        </button>
      )}

      {accuracy !== null && (
        <span style={{ fontSize: 9, color: 'var(--color-panel-muted)' }}>
          {'\u00B1'}{Math.round(accuracy)}m
        </span>
      )}
    </div>
  );
}
