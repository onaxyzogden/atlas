/**
 * useWindClimatology — fetch ERA5 wind frequencies for an anchor via the API.
 *
 * The fetch goes through `/api/v1/climate-analysis/wind-rose` (server-side
 * Open-Meteo proxy); the browser no longer talks to archive-api.open-meteo.com
 * directly. The server returns binned 8-bin frequencies, so the client just
 * caches and renders.
 *
 * Behavior:
 *   1. Quantize the anchor to ~0.1° to keep the cache hit-rate high.
 *   2. Read localStorage; on hit, return the cached frequencies (status 'live').
 *   3. On miss, fire one API call. While in flight, return
 *      `frequencies: undefined` and `status: 'loading'`.
 *   4. On success, cache + return live frequencies.
 *   5. On failure (502/network), return `status: 'fallback'`.
 *
 * Aborts the in-flight request on unmount or anchor-quantum change.
 */

import { useEffect, useState } from "react";
import { api } from "../../lib/apiClient.js";
import {
  anchorCacheKey,
  quantizeAnchor,
} from "../../lib/wind-climatology/quantizeAnchor.js";
import { getCached, setCached, type WindFrequencies } from "../../lib/wind-climatology/cache.js";

export type WindClimatologyStatus = "loading" | "live" | "fallback";

export interface UseWindClimatologyResult {
  frequencies: WindFrequencies | undefined;
  source: string | undefined;
  status: WindClimatologyStatus;
}

export function useWindClimatology(
  anchor: readonly [number, number],
): UseWindClimatologyResult {
  const [qLng, qLat] = quantizeAnchor(anchor);
  const key = anchorCacheKey(anchor);

  const [state, setState] = useState<UseWindClimatologyResult>(() => {
    const cached = getCached(key);
    if (cached) {
      return { frequencies: cached.frequencies, source: cached.source, status: "live" };
    }
    return { frequencies: undefined, source: undefined, status: "loading" };
  });

  useEffect(() => {
    const cached = getCached(key);
    if (cached) {
      setState({ frequencies: cached.frequencies, source: cached.source, status: "live" });
      return;
    }

    const controller = new AbortController();
    setState({ frequencies: undefined, source: undefined, status: "loading" });

    (async () => {
      const result = await api.climateAnalysis.windRose(qLat, qLng, controller.signal);
      if (controller.signal.aborted) return;
      if (result) {
        setCached(key, result.frequencies, result.source);
        setState({
          frequencies: result.frequencies,
          source: result.source,
          status: "live",
        });
      } else {
        setState({ frequencies: undefined, source: undefined, status: "fallback" });
      }
    })().catch(() => {
      if (controller.signal.aborted) return;
      setState({ frequencies: undefined, source: undefined, status: "fallback" });
    });

    return () => controller.abort();
    // qLng/qLat are derived from `anchor`; only re-fire when the quantized
    // anchor changes, NOT on every sub-quantum drag of the homestead.
  }, [qLng, qLat, key]);

  return state;
}
