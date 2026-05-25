/**
 * MapCoordinateReadout — fixed bottom-left glass chip showing the live
 * latitude / longitude under the cursor in decimal degrees.
 *
 * Sits just above the native MapLibre ScaleControl so the two cartographic
 * aids group together. Updates on `mousemove` (rAF-coalesced so 60Hz pointer
 * events can't saturate the renderer) and falls back to the map center when
 * the cursor leaves the canvas — keeping it useful on touch / when idle, and
 * tracking the center as the user pans or zooms.
 */

import { useEffect, useRef, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import css from './MapCoordinateReadout.module.css';

interface Props {
  map: maplibregl.Map | null;
}

/** Format a lng/lat pair as fixed-precision decimal degrees. Pure — unit-tested. */
export function formatLngLat(lng: number, lat: number, digits = 5): string {
  return `Lat ${lat.toFixed(digits)}  Lng ${lng.toFixed(digits)}`;
}

export default function MapCoordinateReadout({ map }: Props) {
  const [coords, setCoords] = useState<{ lng: number; lat: number } | null>(null);
  const rafHandleRef = useRef<number | null>(null);
  // Whether the cursor is currently off the map — drives the center fallback.
  const idleRef = useRef(true);

  useEffect(() => {
    if (!map) return;

    const seedFromCenter = () => {
      const c = map.getCenter();
      setCoords({ lng: c.lng, lat: c.lat });
    };
    seedFromCenter();

    const onMove = (e: maplibregl.MapMouseEvent) => {
      idleRef.current = false;
      if (rafHandleRef.current != null) return; // coalesce bursts
      rafHandleRef.current = window.requestAnimationFrame(() => {
        rafHandleRef.current = null;
        setCoords({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      });
    };
    const onOut = () => {
      idleRef.current = true;
      if (rafHandleRef.current != null) {
        window.cancelAnimationFrame(rafHandleRef.current);
        rafHandleRef.current = null;
      }
      seedFromCenter();
    };
    // While the cursor is off the map, keep the chip showing the live center
    // as the user pans/zooms. Ignored when actively hovering.
    const onMoveCenter = () => {
      if (idleRef.current) seedFromCenter();
    };

    map.on('mousemove', onMove);
    map.on('mouseout', onOut);
    map.on('move', onMoveCenter);

    return () => {
      map.off('mousemove', onMove);
      map.off('mouseout', onOut);
      map.off('move', onMoveCenter);
      if (rafHandleRef.current != null) {
        window.cancelAnimationFrame(rafHandleRef.current);
        rafHandleRef.current = null;
      }
    };
  }, [map]);

  if (!coords) return null;

  return (
    <div className={css.chip} role="status" aria-live="off">
      {formatLngLat(coords.lng, coords.lat)}
    </div>
  );
}
