/**
 * Wind sectors — eight-direction prevailing wind rose for a site anchor.
 *
 * v3.4 ships a pedagogical climatology only — no Open-Meteo / ERA5 fetch yet.
 * Default frequencies represent Eastern Ontario (W/NW dominant), normalized
 * to sum ≈ 1 across the eight cardinal/inter-cardinal directions.
 *
 * Each wedge spans 45° centered on its compass direction; `reachMeters` is
 * scaled to the relative frequency so the longest petal corresponds to the
 * most-prevalent direction. Output reuses `SiteSectors` with `kind: "wind-prevailing"`.
 */

import type { SectorWedge, SiteSectors } from "./types.js";

export type CompassCode = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

interface Direction {
  code: CompassCode;
  centerBearingDeg: number;
}

const DIRECTIONS: readonly Direction[] = [
  { code: "N",  centerBearingDeg:   0 },
  { code: "NE", centerBearingDeg:  45 },
  { code: "E",  centerBearingDeg:  90 },
  { code: "SE", centerBearingDeg: 135 },
  { code: "S",  centerBearingDeg: 180 },
  { code: "SW", centerBearingDeg: 225 },
  { code: "W",  centerBearingDeg: 270 },
  { code: "NW", centerBearingDeg: 315 },
];

/**
 * Eastern-Ontario climatology — westerlies dominant, slight NW skew.
 * Pedagogical defaults; sum ≈ 1.
 */
export const DEFAULT_FREQUENCIES: Readonly<Record<CompassCode, number>> = {
  N:  0.06,
  NE: 0.05,
  E:  0.05,
  SE: 0.07,
  S:  0.10,
  SW: 0.18,
  W:  0.27,
  NW: 0.22,
};

const HALF_WEDGE_DEG = 22.5;
const DEFAULT_MAX_REACH_METERS = 600;
const COLOR = "#5b7a8a";

export interface ComputeWindSectorsOptions {
  /** Override the default frequency table. Non-finite or negative entries fall back. */
  frequencies?: Partial<Record<CompassCode, number>>;
  /** Outermost petal radius (the most-prevalent direction). Default 600m. */
  maxReachMeters?: number;
  /** Provenance label stamped onto sources[]. Defaults to the pedagogical mock. */
  sourceLabel?: string;
}

function isValidFrequency(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

function resolveFrequencies(
  overrides: Partial<Record<CompassCode, number>> | undefined,
): Record<CompassCode, number> {
  const out = { ...DEFAULT_FREQUENCIES } as Record<CompassCode, number>;
  if (!overrides) return out;
  for (const dir of DIRECTIONS) {
    const v = overrides[dir.code];
    if (isValidFrequency(v)) out[dir.code] = v;
  }
  return out;
}

function normalizeBearing(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function computeWindSectors(
  anchor: [number, number],
  opts: ComputeWindSectorsOptions = {},
): SiteSectors {
  const maxReach = opts.maxReachMeters ?? DEFAULT_MAX_REACH_METERS;
  const freqs = resolveFrequencies(opts.frequencies);
  const peak = Math.max(...DIRECTIONS.map((d) => freqs[d.code]));
  const safePeak = peak > 0 ? peak : 1;

  const wedges: SectorWedge[] = DIRECTIONS.map((dir) => {
    const f = freqs[dir.code];
    const reach = maxReach * (f / safePeak);
    return {
      id: `wind-${dir.code.toLowerCase()}`,
      kind: "wind-prevailing",
      label: `${dir.code} ${(f * 100).toFixed(0)}%`,
      startBearingDeg: normalizeBearing(dir.centerBearingDeg - HALF_WEDGE_DEG),
      endBearingDeg: normalizeBearing(dir.centerBearingDeg + HALF_WEDGE_DEG),
      reachMeters: reach,
      color: COLOR,
      meta: {
        direction: dir.code,
        centerBearingDeg: dir.centerBearingDeg,
        frequency: f,
      },
    };
  });

  const provenance = opts.sourceLabel
    ?? "Eastern Ontario pedagogical climatology — W/NW prevailing (mock)";

  return {
    centroid: anchor,
    generatedAt: new Date().toISOString(),
    wedges,
    sources: [{ kind: "wind", provenance }],
  };
}
