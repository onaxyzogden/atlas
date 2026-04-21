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
