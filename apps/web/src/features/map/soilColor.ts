/**
 * Per-property color ramps for the SoilGrids map overlay.
 *
 * Each entry in SOIL_RAMPS maps a raw raster value (already scaled to display
 * units by SoilOverlay) to an RGBA tuple. Ramps mirror the GAEZ convention:
 * alpha ≈ 140/255 (~0.55) so the basemap stays legible beneath.
 *
 * Palette hues chosen so the overlays read as distinct even when the user
 * flips between them rapidly: earth browns for bedrock depth, diverging red-
 * blue for pH, darkening browns for organic carbon, ochre for clay, warm tan
 * for sand.
 */

import { rgbaToCss } from './gaezColor.js';

export type RgbaTuple = [number, number, number, number];

export type SoilRampId =
  | 'sequential_earth'
  | 'diverging_ph'
  | 'sequential_carbon'
  | 'sequential_clay'
  | 'sequential_sand';

export interface SoilRamp {
  /** Convert a raw raster value (in display units) to RGBA. */
  valueToRgba: (value: number) => RgbaTuple;
  /** Legend swatches for the picker panel. */
  swatches: Array<{ label: string; rgba: RgbaTuple }>;
}

const ALPHA = 140;
const TRANSPARENT: RgbaTuple = [0, 0, 0, 0];

// ── Interpolation helpers ──────────────────────────────────────────────────

type Stop = [number, [number, number, number]];

function interp(stops: Stop[], value: number, min: number, max: number): RgbaTuple {
  if (!Number.isFinite(value)) return TRANSPARENT;
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1] = stops[i]!;
    if (t <= t1) {
      const [t0, c0] = stops[i - 1]!;
      const u = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * u),
        Math.round(c0[1] + (c1[1] - c0[1]) * u),
        Math.round(c0[2] + (c1[2] - c0[2]) * u),
        ALPHA,
      ];
    }
  }
  const last = stops[stops.length - 1]![1];
  return [last[0], last[1], last[2], ALPHA];
}

function stopsToSwatches(stops: Stop[], labels: string[]): Array<{ label: string; rgba: RgbaTuple }> {
  return stops.map((s, i) => ({
    label: labels[i] ?? '',
    rgba: [s[1][0], s[1][1], s[1][2], ALPHA] as RgbaTuple,
  }));
}

// ── Ramps ──────────────────────────────────────────────────────────────────

// Bedrock depth (cm): pale sand → warm brown → deep green at depth.
const BEDROCK_STOPS: Stop[] = [
  [0.00, [230, 210, 180]],
  [0.25, [190, 150, 100]],
  [0.50, [140, 110,  70]],
  [0.75, [ 90, 120,  70]],
  [1.00, [ 45,  90,  55]],
];

// pH (diverging): red (acid) → neutral cream → blue (alkaline), pivot at 7.0.
const PH_STOPS: Stop[] = [
  [0.00, [155,  58,  42]],  // acidic red
  [0.30, [200, 130,  80]],
  [0.50, [235, 225, 200]],  // neutral
  [0.70, [120, 160, 190]],
  [1.00, [ 60, 120, 200]],  // alkaline blue
];

// Organic carbon (g/kg): sand → rich dark brown.
const OC_STOPS: Stop[] = [
  [0.00, [235, 220, 185]],
  [0.30, [180, 140,  90]],
  [0.60, [110,  75,  45]],
  [1.00, [ 60,  40,  25]],
];

// Clay (%): pale → ochre → deep terracotta.
const CLAY_STOPS: Stop[] = [
  [0.00, [245, 235, 210]],
  [0.40, [210, 170, 100]],
  [0.75, [175, 110,  60]],
  [1.00, [120,  65,  40]],
];

// Sand (%): cream → warm tan → golden.
const SAND_STOPS: Stop[] = [
  [0.00, [250, 240, 210]],
  [0.40, [230, 200, 140]],
  [0.75, [210, 170,  90]],
  [1.00, [175, 130,  55]],
];

function makeRamp(stops: Stop[], min: number, max: number, labels: string[]): SoilRamp {
  return {
    valueToRgba: (v: number) => {
      if (!Number.isFinite(v)) return TRANSPARENT;
      return interp(stops, v, min, max);
    },
    swatches: stopsToSwatches(stops, labels),
  };
}

export const SOIL_RAMPS: Record<SoilRampId, (range: [number, number]) => SoilRamp> = {
  sequential_earth: ([min, max]) =>
    makeRamp(BEDROCK_STOPS, min, max, [
      `${min} cm`,
      '',
      `${Math.round((min + max) / 2)} cm`,
      '',
      `${max}+ cm`,
    ]),
  diverging_ph: ([min, max]) =>
    makeRamp(PH_STOPS, min, max, [
      `${min.toFixed(1)}`,
      '',
      `7.0`,
      '',
      `${max.toFixed(1)}`,
    ]),
  sequential_carbon: ([min, max]) =>
    makeRamp(OC_STOPS, min, max, [
      `${min} g/kg`,
      '',
      '',
      `${max}+ g/kg`,
    ]),
  sequential_clay: ([min, max]) =>
    makeRamp(CLAY_STOPS, min, max, [
      `${min}%`,
      '',
      '',
      `${max}%`,
    ]),
  sequential_sand: ([min, max]) =>
    makeRamp(SAND_STOPS, min, max, [
      `${min}%`,
      '',
      '',
      `${max}%`,
    ]),
};

/** CSS gradient string for a linear strip legend. */
export function rampGradientCss(ramp: SoilRamp): string {
  const stops = ramp.swatches
    .map((s, i, arr) => {
      const pct = arr.length === 1 ? 0 : (i / (arr.length - 1)) * 100;
      return `${rgbaToCss(s.rgba)} ${pct.toFixed(1)}%`;
    })
    .join(', ');
  return `linear-gradient(to right, ${stops})`;
}
