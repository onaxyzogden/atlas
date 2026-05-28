/**
 * GpsTraceCapture — 3-second countdown, then `watchPosition` records a
 * live trace. Mirrors OLOS Act Command Center Spec v1 §5.4.5 (Walk
 * sequence: tap Start, 3-sec countdown, walk the perimeter, stop, save).
 *
 * The trace is persisted as a GeoJSON LineString of `[lng, lat]` points.
 * The schema requires at least two coordinates — if the watch ended
 * before two distinct readings landed, we surface an error and the proof
 * item is not attached (the steward will have to walk again).
 */

import { useEffect, useRef, useState } from 'react';
import { CircleStop, Play, Route, RotateCcw } from 'lucide-react';
import type {
  FieldActionProofItem,
  ProofSchemaSlot,
} from '@ogden/shared';
import { useFieldActionStore } from '../../../../store/fieldActionStore.js';
import { baseProofItem } from './proofItemBuilder.js';
import css from './ProofCapture.module.css';

interface Props {
  projectId: string;
  actionId: string;
  slot: ProofSchemaSlot;
  existing: FieldActionProofItem | undefined;
}

type Phase = 'idle' | 'countdown' | 'recording';

export default function GpsTraceCapture({
  projectId,
  actionId,
  slot,
  existing,
}: Props) {
  const attach = useFieldActionStore((s) => s.attachProofItem);
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(3);
  const [points, setPoints] = useState<Array<[number, number]>>([]);
  const [error, setError] = useState<string | null>(null);
  const startTsRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup any in-flight watch when the component unmounts.
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  const beginWatch = () => {
    setPhase('recording');
    startTsRef.current = Date.now();
    setPoints([]);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not available on this device.');
      setPhase('idle');
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPoints((prev) => {
          const last = prev[prev.length - 1];
          // Suppress identical consecutive fixes — the schema doesn't
          // forbid them but they add no information.
          if (last && last[0] === lng && last[1] === lat) return prev;
          return [...prev, [lng, lat]];
        });
      },
      (err) => {
        setError(err.message || 'Could not read location.');
      },
      { enableHighAccuracy: true, maximumAge: 1000 },
    );
  };

  const start = () => {
    setError(null);
    setPhase('countdown');
    setCountdown(3);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          beginWatch();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const stop = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (points.length < 2) {
      setError('Need at least two GPS fixes — walk a few more steps.');
      setPhase('idle');
      return;
    }
    const lastPoint = points[points.length - 1];
    if (!lastPoint) {
      setPhase('idle');
      return;
    }
    const start = startTsRef.current ?? Date.now();
    const durationSeconds = Math.round((Date.now() - start) / 1000);
    const item: FieldActionProofItem = {
      ...baseProofItem({
        proofType: 'gps_trace',
        slotId: slot.id,
        id: existing?.id,
        captureGeotag: {
          latitude: lastPoint[1],
          longitude: lastPoint[0],
        },
      }),
      traceGeometry: {
        type: 'LineString',
        coordinates: points,
      },
      traceDurationSeconds: durationSeconds,
    };
    attach(projectId, actionId, item);
    setPhase('idle');
  };

  return (
    <div className={css.captureBody}>
      <div className={css.captureRow}>
        {phase === 'idle' && (
          <button
            type="button"
            className={css.captureBtn}
            onClick={start}
            data-testid={`proof-trace-start-${slot.id}`}
          >
            {existing ? (
              <>
                <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
                Walk again
              </>
            ) : (
              <>
                <Play size={14} strokeWidth={2} aria-hidden="true" />
                Start walk
              </>
            )}
          </button>
        )}
        {phase === 'countdown' && (
          <span
            className={css.countdown}
            data-testid={`proof-trace-countdown-${slot.id}`}
          >
            {countdown}
          </span>
        )}
        {phase === 'recording' && (
          <>
            <span className={css.traceLive}>
              <span className={css.traceLiveDot} aria-hidden="true" />
              Recording — {points.length} fix{points.length === 1 ? '' : 'es'}
            </span>
            <button
              type="button"
              className={`${css.captureBtn} ${css.captureBtnDanger}`}
              onClick={stop}
              data-testid={`proof-trace-stop-${slot.id}`}
            >
              <CircleStop size={14} strokeWidth={2} aria-hidden="true" />
              Stop &amp; save
            </button>
          </>
        )}
      </div>
      {existing?.traceGeometry && phase === 'idle' && (
        <span className={css.geotag}>
          <Route size={12} strokeWidth={2} aria-hidden="true" />{' '}
          {existing.traceGeometry.coordinates.length} fixes
          {existing.traceDurationSeconds !== undefined &&
            ` | ${existing.traceDurationSeconds}s walk`}
        </span>
      )}
      {error && <span className={css.errorRow}>{error}</span>}
    </div>
  );
}
