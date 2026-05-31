/**
 * ProtocolMapMarkers — places a single amber pulsing dot at the project
 * centroid when one or more standing protocols are in 'triggered' status.
 *
 * Renders null (no DOM output beyond the MapLibre HTML marker).
 * Pattern: mirrors ActTierMapMarkers — useEffect + Marker ref, teardown on
 * unmount.
 */

import { useEffect, useRef } from 'react';
import { maplibregl } from '../../../lib/maplibre.js';

interface Props {
  map: maplibregl.Map;
  centroid: [number, number];
  triggeredCount: number;
}

const STYLE_ID = 'ogden-protocol-pulse';

function ensurePulseStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes ogden-protocol-pulse {
      0%, 100% { transform: scale(1);    opacity: 0.9; }
      50%       { transform: scale(1.5); opacity: 0.45; }
    }
    .ogden-protocol-marker {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #c4a265;
      border: 2px solid rgba(255, 255, 255, 0.85);
      box-shadow: 0 1px 5px rgba(0, 0, 0, 0.5);
      animation: ogden-protocol-pulse 1.8s ease-in-out infinite;
      cursor: default;
    }
  `;
  document.head.appendChild(style);
}

export default function ProtocolMapMarkers({ map, centroid, triggeredCount }: Props) {
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (triggeredCount > 0) {
      ensurePulseStyle();
      markerRef.current?.remove();
      const el = document.createElement('div');
      el.className = 'ogden-protocol-marker';
      markerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(centroid)
        .addTo(map);
    } else {
      markerRef.current?.remove();
      markerRef.current = null;
    }
  }, [map, centroid, triggeredCount]);

  useEffect(() => {
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, []);

  return null;
}
