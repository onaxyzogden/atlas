/**
 * quantizeAnchor — snap a [lng, lat] to a coarse grid for cache keying.
 *
 * Default step is 0.1° (~11 km at the equator, less at higher latitudes).
 * The wind rose at this resolution is dominated by regional climatology, not
 * local terrain — so two homesteads within the same quantum legitimately
 * share a cached rose, and we avoid hammering Open-Meteo every time the
 * homestead marker is dragged a few meters.
 */

export function quantizeAnchor(
  anchor: readonly [number, number],
  step: number = 0.1,
): [number, number] {
  if (!(step > 0)) {
    throw new Error(`quantizeAnchor: step must be positive, got ${step}`);
  }
  const [lng, lat] = anchor;
  const qLng = Math.round(lng / step) * step;
  const qLat = Math.round(lat / step) * step;
  // Round to a reasonable number of decimals to avoid float-noise like 44.50000000000001.
  const decimals = Math.max(0, Math.ceil(-Math.log10(step)) + 1);
  const factor = 10 ** decimals;
  return [Math.round(qLng * factor) / factor, Math.round(qLat * factor) / factor];
}

/** Stable cache-key string for a quantized anchor. */
export function anchorCacheKey(anchor: readonly [number, number], step: number = 0.1): string {
  const [lng, lat] = quantizeAnchor(anchor, step);
  return `${lng.toFixed(2)}:${lat.toFixed(2)}`;
}
