/**
 * useForecast — fetch the Open-Meteo 7-day forecast for a project's parcel
 * centroid via the API.
 *
 * The fetch goes through `/api/v1/climate-analysis/forecast` (server-side
 * Open-Meteo proxy with a 1 h Redis cache). Forecast data is regenerated
 * upstream every hour, so we do not cache in localStorage — the server's
 * Redis layer is authoritative and the React state covers in-session reuse.
 *
 * Behavior:
 *   1. Resolve the project's parcel-boundary centroid via `turf.centroid`.
 *   2. Quantize lat/lng to 4 decimals (~11 m) so sub-meter parcel edits
 *      don't trigger refetches.
 *   3. Fire one API call per (projectId, qLat, qLng) tuple. While in flight
 *      the hook returns `data: null, status: 'loading'`.
 *   4. On success → `status: 'live'`; on null/error → `status: 'fallback'`.
 *   5. When the project has no parcel boundary → `status: 'no-parcel'`.
 *
 * Aborts the in-flight request on unmount or quantum change.
 */

import { useEffect, useMemo, useState } from 'react';
import * as turf from '@turf/turf';
import { api } from '../apiClient.js';
import { useProjectStore } from '../../store/projectStore.js';
import type { WeatherForecastResponse } from './types.js';

export type ForecastStatus = 'loading' | 'live' | 'fallback' | 'no-parcel';

export interface UseForecastResult {
  data: WeatherForecastResponse | null;
  status: ForecastStatus;
  /** Quantized centroid actually queried; null when no parcel was available. */
  coordinates: { lat: number; lng: number } | null;
}

const NO_PARCEL: UseForecastResult = {
  data: null,
  status: 'no-parcel',
  coordinates: null,
};

const LOADING: UseForecastResult = {
  data: null,
  status: 'loading',
  coordinates: null,
};

function deriveCentroid(
  boundary: GeoJSON.FeatureCollection | null | undefined,
): { lat: number; lng: number } | null {
  if (!boundary) return null;
  try {
    const c = turf.centroid(boundary).geometry.coordinates;
    if (!Array.isArray(c) || typeof c[0] !== 'number' || typeof c[1] !== 'number') {
      return null;
    }
    return { lat: c[1], lng: c[0] };
  } catch {
    return null;
  }
}

function quantize(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function useForecast(projectId: string): UseForecastResult {
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));

  const centroid = useMemo(
    () => deriveCentroid(project?.parcelBoundaryGeojson ?? null),
    [project?.parcelBoundaryGeojson],
  );

  const qLat = centroid ? quantize(centroid.lat) : null;
  const qLng = centroid ? quantize(centroid.lng) : null;

  const [state, setState] = useState<UseForecastResult>(() => {
    if (qLat == null || qLng == null) return NO_PARCEL;
    return LOADING;
  });

  useEffect(() => {
    if (qLat == null || qLng == null) {
      setState(NO_PARCEL);
      return;
    }

    const controller = new AbortController();
    setState({ data: null, status: 'loading', coordinates: { lat: qLat, lng: qLng } });

    (async () => {
      const result = await api.climateAnalysis.forecast(qLat, qLng, controller.signal);
      if (controller.signal.aborted) return;
      if (result) {
        setState({
          data: result,
          status: 'live',
          coordinates: { lat: qLat, lng: qLng },
        });
      } else {
        setState({
          data: null,
          status: 'fallback',
          coordinates: { lat: qLat, lng: qLng },
        });
      }
    })().catch(() => {
      if (controller.signal.aborted) return;
      setState({
        data: null,
        status: 'fallback',
        coordinates: { lat: qLat, lng: qLng },
      });
    });

    return () => controller.abort();
  }, [qLat, qLng]);

  return state;
}
