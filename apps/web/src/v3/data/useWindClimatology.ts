/**
 * useWindClimatology — fetch Open-Meteo ERA5 wind frequencies for an anchor.
 *
 * Behavior:
 *   1. Quantize the anchor to ~0.1° to keep the cache hit-rate high.
 *   2. Read localStorage; on hit, return the cached frequencies (status 'live').
 *   3. On miss, fire one Open-Meteo fetch. While in flight, return
 *      `frequencies: undefined` and `status: 'loading'`.
 *   4. On success, cache + return live frequencies.
 *   5. On failure, return `status: 'fallback'` so the caller falls back
 *      to `DEFAULT_FREQUENCIES` (no override passed to computeWindSectors).
 *
 * Aborts the in-flight request on unmount or anchor-quantum change.
 */

import { useEffect, useState } from "react";
import {
  fetchOpenMeteoWind,
  OPEN_METEO_SOURCE_LABEL,
} from "../../lib/wind-climatology/fetchOpenMeteoWind.js";
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
      const result = await fetchOpenMeteoWind(qLat, qLng, { signal: controller.signal });
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

export { OPEN_METEO_SOURCE_LABEL };
