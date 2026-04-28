/**
 * binHourlyToFrequencies — fold an hourly wind sample into 8 compass directions.
 *
 * Each compass direction owns a 45° bin centered on its bearing:
 *   N  covers 337.5°–22.5°  (wraps zero)
 *   NE covers 22.5°–67.5°
 *   E  covers 67.5°–112.5°
 *   ... etc.
 *
 * Calm hours (`speedMs < CALM_THRESHOLD_MS`) are filtered out — direction at
 * sub-half-meter winds is meteorologically meaningless and would skew the
 * rose toward whichever direction the still-air sensor happens to drift to.
 *
 * Returns a frequency map summing to ≈ 1. If every sample is a calm or the
 * input is empty, every bin returns 0 and the caller is responsible for
 * falling back to a default climatology.
 */

import type { CompassCode } from "../sectors/wind.js";

export interface HourlySample {
  /** Wind direction in degrees (meteorological convention: from-direction, 0=N). */
  dirDeg: number;
  /** Wind speed at 10 m, m/s. */
  speedMs: number;
}

const CALM_THRESHOLD_MS = 0.5;

const ORDER: readonly CompassCode[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function normalizeBearing(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Map a 0–360° bearing to one of the eight 45°-wide compass bins. */
export function bearingToCompass(deg: number): CompassCode {
  const norm = normalizeBearing(deg);
  // Shift so that N's bin (centered on 0°) becomes [0, 45) instead of [-22.5, 22.5).
  const shifted = (norm + 22.5) % 360;
  const idx = Math.floor(shifted / 45) % 8;
  return ORDER[idx]!;
}

export function binHourlyToFrequencies(
  samples: readonly HourlySample[],
): Record<CompassCode, number> {
  const counts: Record<CompassCode, number> = {
    N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0,
  };
  let total = 0;

  for (const s of samples) {
    if (!Number.isFinite(s.dirDeg) || !Number.isFinite(s.speedMs)) continue;
    if (s.speedMs < CALM_THRESHOLD_MS) continue;
    const bin = bearingToCompass(s.dirDeg);
    counts[bin] += 1;
    total += 1;
  }

  if (total === 0) {
    return counts;
  }

  const out: Record<CompassCode, number> = {
    N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0,
  };
  for (const code of ORDER) {
    out[code] = counts[code] / total;
  }
  return out;
}
