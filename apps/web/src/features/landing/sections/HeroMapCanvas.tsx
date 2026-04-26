import { useEffect, useRef, useState } from 'react';
import { maplibregl, MAP_STYLES, hasMapToken, maptilerTransformRequest } from '../../../lib/maplibre.js';

interface HeroMapCanvasProps {
  /** [lng, lat] center for the sample parcel. */
  center?: [number, number];
  zoom?: number;
  pitch?: number;
}

/**
 * Lightweight, non-interactive MapLibre instance for the landing hero.
 * Lazy-mounts once in view so it doesn't block first paint.
 */
export default function HeroMapCanvas({
  center = [-111.6625, 41.7355], // Cache Valley, UT — sample parcel
  zoom = 13.5,
  pitch = 30,
}: HeroMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);

  // Lazy-mount when hero scrolls into view
  useEffect(() => {
    if (!containerRef.current || visible) return;
    const el = containerRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: '100px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  // Initialize map once visible
  useEffect(() => {
    if (!visible || !containerRef.current || mapRef.current) return;
    if (!hasMapToken) {
      setFailed(true);
      return;
    }

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLES['satellite'] ?? MAP_STYLES['terrain']!,
        center,
        zoom,
        pitch,
        bearing: -12,
        interactive: false,
        attributionControl: false,
        transformRequest: maptilerTransformRequest,
      });
      map.on('error', () => setFailed(true));
      mapRef.current = map;
    } catch {
      setFailed(true);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [visible, center, zoom, pitch]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'linear-gradient(135deg, var(--color-earth-700, #3a2f24), var(--color-sage-800, #2a3a2a))',
        backgroundSize: 'cover',
      }}
      data-failed={failed ? 'true' : 'false'}
    />
  );
}
