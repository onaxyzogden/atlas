/**
 * Sprint CB — suitability-class → RGBA color map for the map-side GAEZ overlay.
 *
 * FAO GAEZ v4 Theme 4 suitability legend:
 *   1 = Very high (S1)   2 = High (S1)
 *   3 = Good (S2)        4 = Medium (S2)
 *   5 = Moderate (S3)    6 = Marginal (S3)
 *   7 = Not suitable (N) 8 = Not suitable (N)
 *   9 = Water / off-cropland sentinel
 *
 * Palette mirrors `confidence.high/medium/low` in tokens.ts so that the
 * map-side overlay and the Site Intelligence panel badges read as one system.
 * S3 sits between medium and low (amber-orange). Alpha ≈ 140/255 (~0.55) to
 * keep the base map legible beneath.
 */

// RGBA tuples pre-resolved against tokens.ts `confidence.*` hex codes.
const S1: [number, number, number, number] = [0x2d, 0x7a, 0x4f, 140]; // #2d7a4f — confidence.high
const S2: [number, number, number, number] = [0x8a, 0x6d, 0x1e, 140]; // #8a6d1e — confidence.medium
const S3: [number, number, number, number] = [0xb4, 0x50, 0x1e, 140]; // amber-orange — bridge
const N:  [number, number, number, number] = [0x9b, 0x3a, 0x2a, 140]; // #9b3a2a — confidence.low
const WATER: [number, number, number, number] = [0x3c, 0x78, 0xc8, 140]; // desaturated blue
const TRANSPARENT: [number, number, number, number] = [0, 0, 0, 0];

export function suitabilityToRgba(code: number): [number, number, number, number] {
  if (!Number.isFinite(code) || code <= 0) return TRANSPARENT; // NoData / off-raster
  if (code >= 1 && code <= 2) return S1;
  if (code >= 3 && code <= 4) return S2;
  if (code >= 5 && code <= 6) return S3;
  if (code >= 7 && code <= 8) return N;
  if (code === 9) return WATER;
  return TRANSPARENT;
}

export const SUITABILITY_SWATCHES = [
  { code: 1, label: 'S1 — Very high',  rgba: S1 },
  { code: 3, label: 'S2 — High',       rgba: S2 },
  { code: 5, label: 'S3 — Medium',     rgba: S3 },
  { code: 7, label: 'N — Not suitable', rgba: N  },
  { code: 9, label: 'Water',           rgba: WATER },
] as const;

export function rgbaToCss([r, g, b, a]: readonly [number, number, number, number]): string {
  return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}

// ── Sprint CC: continuous yield-gradient colormap ──────────────────────────
//
// Viridis-ish 5-stop ramp; linear interp between stops. Used by the map-side
// GAEZ overlay when `gaezSelection.variable === 'yield'`. Matches the paired
// `/raster/.../yield` COG scale (kg/ha), clamped to a per-tile 99th-percentile
// max derived at decode time (avoids hard-coded per-crop calibration).

const YIELD_STOPS: Array<[number, [number, number, number]]> = [
  [0.00, [ 68,   1,  84]],  // deep purple
  [0.25, [ 59,  82, 139]],  // blue
  [0.50, [ 33, 144, 141]],  // teal
  [0.75, [ 94, 201,  98]],  // green
  [1.00, [253, 231,  37]],  // yellow
];

/**
 * Continuous yield → RGBA. Values outside [0, maxYield] are clamped; negative
 * values or NaN return transparent (off-raster / FAO in-band sentinel `-1`).
 * Alpha matches the suitability colormap (~0.55) so mode-flipping keeps the
 * same overall transparency feel.
 */
export function yieldToRgba(
  value: number,
  maxYield: number,
): [number, number, number, number] {
  if (!Number.isFinite(value) || value < 0 || maxYield <= 0) return [0, 0, 0, 0];
  const t = Math.max(0, Math.min(1, value / maxYield));
  for (let i = 1; i < YIELD_STOPS.length; i++) {
    const [t1, c1] = YIELD_STOPS[i]!;
    if (t <= t1) {
      const [t0, c0] = YIELD_STOPS[i - 1]!;
      const u = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * u),
        Math.round(c0[1] + (c1[1] - c0[1]) * u),
        Math.round(c0[2] + (c1[2] - c0[2]) * u),
        140,
      ];
    }
  }
  const last = YIELD_STOPS[YIELD_STOPS.length - 1]![1];
  return [last[0], last[1], last[2], 140];
}

/** CSS gradient string matching YIELD_STOPS — for the legend strip. */
export const YIELD_GRADIENT_CSS =
  'linear-gradient(to right, rgb(68,1,84), rgb(59,82,139), rgb(33,144,141), rgb(94,201,98), rgb(253,231,37))';
