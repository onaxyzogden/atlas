/**
 * WizardGpsWalkTool — mobile "walk the boundary" capture.
 *
 * Surfaced only when the host UA is mobile-like (see `isMobileLike` in
 * WizardSiteMap). Uses `navigator.geolocation.watchPosition` with high
 * accuracy to accumulate points as the steward walks the parcel; tap
 * "Close boundary" to ring back to the first point and emit a Polygon.
 *
 * Failure paths:
 *   - permission denied → toast + onCancel (so the user falls back to
 *     Draw polygon without being stuck)
 *   - GPS unavailable → same path
 *   - <3 points captured → block close; show inline hint
 *
 * Captured points are written to a local source on the map so the
 * steward sees the in-progress ring while walking.
 */

import { useEffect, useRef, useState } from 'react';
import type {
  Map as MaplibreMap,
  GeoJSONSource,
} from 'maplibre-gl';
import { Footprints, Square, X } from 'lucide-react';
import { toast } from '../../components/Toast.js';
import styles from './WizardGpsWalkTool.module.css';

const LINE_SOURCE = 'wizard-walk-line';
const LINE_LAYER = 'wizard-walk-line-stroke';
const POINTS_SOURCE = 'wizard-walk-points';
const POINTS_LAYER = 'wizard-walk-points-circle';

interface WizardGpsWalkToolProps {
  map: MaplibreMap;
  onComplete: (polygon: GeoJSON.Polygon) => void;
  onCancel: () => void;
}

export default function WizardGpsWalkTool({
  map,
  onComplete,
  onCancel,
}: WizardGpsWalkToolProps) {
  const [walking, setWalking] = useState(false);
  const [count, setCount] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const pointsRef = useRef<Array<[number, number]>>([]);

  useEffect(() => {
    if (!map.getSource(LINE_SOURCE)) {
      map.addSource(LINE_SOURCE, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
      });
    }
    if (!map.getLayer(LINE_LAYER)) {
      map.addLayer({
        id: LINE_LAYER,
        type: 'line',
        source: LINE_SOURCE,
        paint: { 'line-color': '#c4a265', 'line-width': 3 },
      });
    }
    if (!map.getSource(POINTS_SOURCE)) {
      map.addSource(POINTS_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }
    if (!map.getLayer(POINTS_LAYER)) {
      map.addLayer({
        id: POINTS_LAYER,
        type: 'circle',
        source: POINTS_SOURCE,
        paint: {
          'circle-radius': 5,
          'circle-color': '#c4a265',
          'circle-stroke-color': '#0e1413',
          'circle-stroke-width': 1.5,
        },
      });
    }
    return () => {
      for (const layerId of [LINE_LAYER, POINTS_LAYER]) {
        try {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
        } catch {
          /* style gone */
        }
      }
      for (const sourceId of [LINE_SOURCE, POINTS_SOURCE]) {
        try {
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        } catch {
          /* gone */
        }
      }
    };
  }, [map]);

  const writePreview = () => {
    const lineSrc = map.getSource(LINE_SOURCE) as GeoJSONSource | undefined;
    const ptsSrc = map.getSource(POINTS_SOURCE) as GeoJSONSource | undefined;
    if (lineSrc) {
      lineSrc.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: pointsRef.current },
      });
    }
    if (ptsSrc) {
      ptsSrc.setData({
        type: 'FeatureCollection',
        features: pointsRef.current.map((c) => ({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: c },
        })),
      });
    }
  };

  const stopWatch = () => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const handleStart = () => {
    if (!('geolocation' in navigator)) {
      toast.error('GPS not available on this device');
      onCancel();
      return;
    }
    pointsRef.current = [];
    setCount(0);
    setWalking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        pointsRef.current = [...pointsRef.current, next];
        setCount(pointsRef.current.length);
        writePreview();
        map.easeTo({ center: next, duration: 350 });
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied'
            : 'Unable to read GPS';
        toast.error(msg);
        stopWatch();
        setWalking(false);
        onCancel();
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 30000 },
    );
  };

  const handleClose = () => {
    stopWatch();
    setWalking(false);
    const pts = pointsRef.current;
    if (pts.length < 3) {
      toast.error('Need at least 3 points before closing the boundary');
      return;
    }
    const first = pts[0]!;
    const last = pts[pts.length - 1]!;
    const ring: Array<[number, number]> =
      first[0] === last[0] && first[1] === last[1] ? [...pts] : [...pts, first];
    onComplete({ type: 'Polygon', coordinates: [ring] });
  };

  const handleCancel = () => {
    stopWatch();
    pointsRef.current = [];
    setCount(0);
    writePreview();
    setWalking(false);
    onCancel();
  };

  // Tear down watch on unmount as a safety net.
  useEffect(() => stopWatch, []);

  return (
    <div className={styles.panel} role="dialog" aria-label="Walk the boundary">
      <button
        type="button"
        className={styles.closeBtn}
        onClick={handleCancel}
        aria-label="Cancel walk"
      >
        <X size={16} aria-hidden />
      </button>
      <Footprints size={28} className={styles.icon} aria-hidden />
      <h2 className={styles.title}>Walk the boundary</h2>
      <p className={styles.help}>
        Tap Start, walk the perimeter, then tap Close boundary.
      </p>
      {walking && <p className={styles.count}>{count} point{count === 1 ? '' : 's'} captured</p>}
      <div className={styles.actions}>
        {!walking ? (
          <button type="button" className={styles.startBtn} onClick={handleStart}>
            <Footprints size={14} aria-hidden /> Start walk
          </button>
        ) : (
          <button type="button" className={styles.startBtn} onClick={handleClose}>
            <Square size={14} aria-hidden /> Close boundary
          </button>
        )}
      </div>
    </div>
  );
}
