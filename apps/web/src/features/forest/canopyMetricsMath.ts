/**
 * canopyMetricsMath — pure, tested formula module for the Plan-stage
 * Canopy & Succession card.
 *
 * Adopted from the prior OGDEN Land Operating System "Canopy
 * Simulator" mockup, but with its hardcoded numbers replaced by
 * transparent functions grounded in the live PLANT_CATALOG record.
 * Every output here is a *design-time planning estimate*, not a
 * field-calibrated growth/yield model — labelled as such in the UI.
 *
 * SCOPE NOTE (Permaculture Scholar verdict, 2026-05-07):
 * Shannon-diversity readouts and bloom calendars were explicitly
 * struck as "ecological theatre for working stewards" — see
 * wiki/decisions/2026-05-07-atlas-plan-plants-scholar-build-fresh.md.
 * This module therefore exposes a plain *species-richness count* per
 * layer (a working count of niches filled), NOT a Shannon index, and
 * carries no bloom-calendar logic.
 *
 * The light/maturity model (`maturityFactor`, `LAYER_ROWS`,
 * `lightByLayer`) is extracted verbatim from CanopySuccessionCard so
 * the card can import it without any change to existing output.
 */

import type { CanopyLayer, PlantCatalogEntry } from '../../data/plantCatalog.js';
import { findSpecies } from '../../data/plantCatalog.js';

// ── Light / maturity model (extracted verbatim — no behaviour change) ────────

/** Years to reach the linear maturity ceiling. */
export const CANOPY_MATURITY_YEARS = 25;

/** Linear maturity factor over 25 years (clamped to 1). */
export function maturityFactor(year: number): number {
  return Math.min(1, year / CANOPY_MATURITY_YEARS);
}

/** Six vertical bands per the Scholar ask (adds Root zone below
 *  OGDEN's surface-only set). `root_zone` is a display-only band — no
 *  catalog species carries that layer key; below-ground species use
 *  the catalog `root` layer. */
export const LAYER_ROWS: Array<{
  layer: CanopyLayer | 'root_zone';
  label: string;
  heightLabel: string;
  /** Vertical band start/end on a 0..100 cross-section (top = sky). */
  yStart: number;
  yEnd: number;
}> = [
  { layer: 'canopy',       label: 'Tall canopy', heightLabel: '12–25 m', yStart: 0,  yEnd: 25 },
  { layer: 'sub_canopy',   label: 'Sub-canopy',  heightLabel: '6–12 m',  yStart: 25, yEnd: 45 },
  { layer: 'shrub',        label: 'Shrub',       heightLabel: '1–6 m',   yStart: 45, yEnd: 65 },
  { layer: 'herbaceous',   label: 'Herbaceous',  heightLabel: '0.3–1 m', yStart: 65, yEnd: 78 },
  { layer: 'ground_cover', label: 'Groundcover', heightLabel: '0–0.3 m', yStart: 78, yEnd: 85 },
  { layer: 'root_zone',    label: 'Root zone',   heightLabel: '0–2 m below', yStart: 85, yEnd: 100 },
];

/** Light reaching each layer: starts at 100% above canopy and is
 *  attenuated by the cumulative cover fraction of every layer above
 *  it. Cover fraction per layer = clamp01(speciesCount × maturity / 4). */
export function lightByLayer(
  layerCounts: Record<string, number>,
  year: number,
): Record<string, number> {
  const m = maturityFactor(year);
  let remaining = 1;
  const out: Record<string, number> = {};
  for (const row of LAYER_ROWS) {
    out[row.layer] = remaining;
    const count = layerCounts[row.layer] ?? 0;
    const cover = Math.min(1, (count * m) / 4);
    remaining = Math.max(0, remaining * (1 - cover));
  }
  return out;
}

// ── Derived metrics (new — grounded in the catalog, no mock numbers) ─────────

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

/** The seven canonical food-forest niches (richness denominator). */
export const FOOD_FOREST_NICHES: CanopyLayer[] = [
  'canopy', 'sub_canopy', 'shrub', 'herbaceous', 'ground_cover', 'vine', 'root',
];

/** Every distinct ecological function the catalog can express
 *  (functional-spread denominator). */
const ECOLOGICAL_FUNCTIONS = [
  'n_fixer', 'dynamic_accumulator', 'insectary', 'pollinator',
  'wildlife_food', 'edible_yield', 'timber', 'fodder', 'medicinal',
] as const;

/** Sensible per-layer fallback heights (m) for biomass proxy when a
 *  catalog entry omits `matureHeightM`. Midpoints of the layer bands. */
const LAYER_FALLBACK_HEIGHT_M: Record<string, number> = {
  canopy: 18, sub_canopy: 9, shrub: 3, herbaceous: 0.6,
  ground_cover: 0.2, vine: 4, root: 0.4,
};

/** Resolve a list of catalog entries from picked species ids,
 *  dropping ids the catalog can't resolve. */
export function speciesFromIds(speciesIds: string[]): PlantCatalogEntry[] {
  const out: PlantCatalogEntry[] = [];
  for (const id of speciesIds) {
    const sp = findSpecies(id);
    if (sp) out.push(sp);
  }
  return out;
}

/** Count of species assigned to each catalog layer. */
export function layerCountsFromSpecies(
  species: PlantCatalogEntry[],
): Record<string, number> {
  const c: Record<string, number> = {};
  for (const sp of species) {
    if (!sp.layer) continue;
    c[sp.layer] = (c[sp.layer] ?? 0) + 1;
  }
  return c;
}

/**
 * Plain species-richness count per niche (NOT a diversity index —
 * see Scholar verdict note above). Returns one entry per filled
 * niche plus the count of niches occupied out of seven.
 */
export function speciesRichnessByLayer(species: PlantCatalogEntry[]): {
  byLayer: Record<string, number>;
  nichesFilled: number;
  nicheCount: number;
} {
  const byLayer = layerCountsFromSpecies(species);
  const nichesFilled = FOOD_FOREST_NICHES.filter((n) => (byLayer[n] ?? 0) > 0).length;
  return { byLayer, nichesFilled, nicheCount: FOOD_FOREST_NICHES.length };
}

/** Mature-canopy volume proxy for one species at a given maturity:
 *  height × spread² × maturity. Used only for *relative* biomass and
 *  productivity shares — never reported as an absolute mass. */
function biomassProxy(sp: PlantCatalogEntry, m: number): number {
  const h = sp.matureHeightM ?? LAYER_FALLBACK_HEIGHT_M[sp.layer ?? 'shrub'] ?? 1;
  const w = sp.canopySpreadM ?? sp.matureWidthM ?? 1;
  return h * w * w * m;
}

/** Yield weighting: species carrying productive functions contribute
 *  more to the productivity signal than purely structural/support
 *  species. Weights are documented design choices, not measured. */
const YIELD_FUNCTION_WEIGHT: Record<string, number> = {
  edible_yield: 1.0, fodder: 0.6, timber: 0.6, medicinal: 0.4,
};
function yieldWeight(sp: PlantCatalogEntry): number {
  const fns = sp.ecologicalFunction ?? [];
  let w = 0.3; // baseline structural contribution
  for (const fn of fns) w += YIELD_FUNCTION_WEIGHT[fn] ?? 0;
  return w;
}

/**
 * Biomass distribution by layer as a share of total (sums to ~100).
 * Uses the volume proxy scaled by maturity. Empty input → {}.
 */
export function biomassDistribution(
  species: PlantCatalogEntry[],
  year: number,
): Record<string, number> {
  const m = maturityFactor(year);
  const raw: Record<string, number> = {};
  let total = 0;
  for (const sp of species) {
    if (!sp.layer) continue;
    const b = biomassProxy(sp, m);
    raw[sp.layer] = (raw[sp.layer] ?? 0) + b;
    total += b;
  }
  if (total <= 0) return {};
  const out: Record<string, number> = {};
  for (const [layer, v] of Object.entries(raw)) out[layer] = round1((v / total) * 100);
  return out;
}

/**
 * Relative productivity per layer, normalised so the most productive
 * layer = 1.0. Productivity proxy = yield-weighted biomass. Empty
 * input → {}.
 */
export function productivityByLayer(
  species: PlantCatalogEntry[],
  year: number,
): Record<string, number> {
  const m = maturityFactor(year);
  const raw: Record<string, number> = {};
  for (const sp of species) {
    if (!sp.layer) continue;
    raw[sp.layer] = (raw[sp.layer] ?? 0) + biomassProxy(sp, m) * yieldWeight(sp);
  }
  const max = Math.max(0, ...Object.values(raw));
  if (max <= 0) return {};
  const out: Record<string, number> = {};
  for (const [layer, v] of Object.entries(raw)) out[layer] = round1(v / max);
  return out;
}

/**
 * Canopy closure % — fraction of incident light intercepted before it
 * reaches the forest floor (the `ground_cover` band). 0 when no
 * canopy is present, rising with species count and maturity.
 */
export function canopyClosurePct(
  layerCounts: Record<string, number>,
  year: number,
): number {
  const light = lightByLayer(layerCounts, year);
  const floor = light['ground_cover'] ?? 1;
  return Math.round(clamp01(1 - floor) * 100);
}

/** Understory light % reaching the forest floor (`ground_cover` band). */
export function understoryLightPct(
  layerCounts: Record<string, number>,
  year: number,
): number {
  const light = lightByLayer(layerCounts, year);
  return Math.round(clamp01(light['ground_cover'] ?? 1) * 100);
}

/** Peak sun-hours used for the shade-hours heuristic. */
export const PEAK_SUN_HOURS = 12;

/**
 * Estimated daily shaded hours on the forest floor ≈ closure fraction
 * × peak sun-hours. A coarse planning heuristic, not a solar model.
 */
export function shadeHoursEstimate(
  layerCounts: Record<string, number>,
  year: number,
): number {
  return round1((canopyClosurePct(layerCounts, year) / 100) * PEAK_SUN_HOURS);
}

/** Count of distinct ecological functions expressed across the set. */
export function distinctFunctionCount(species: PlantCatalogEntry[]): number {
  const seen = new Set<string>();
  for (const sp of species) for (const fn of sp.ecologicalFunction ?? []) seen.add(fn);
  return seen.size;
}

/**
 * Productivity index (0–100) — a single planning-aid scalar blending
 * three normalised, documented signals:
 *   • niche fill     (filled layers / 7)          weight 0.40
 *   • functional spread (distinct functions / 9)  weight 0.30
 *   • maturity        (years / 25, capped)         weight 0.30
 * NOT a yield prediction; a structural-completeness proxy.
 */
export function productivityIndex(species: PlantCatalogEntry[], year: number): number {
  if (species.length === 0) return 0;
  const { nichesFilled, nicheCount } = speciesRichnessByLayer(species);
  const nicheFill = nicheCount > 0 ? nichesFilled / nicheCount : 0;
  const functionalSpread = distinctFunctionCount(species) / ECOLOGICAL_FUNCTIONS.length;
  const maturity = maturityFactor(year);
  const idx = 0.4 * nicheFill + 0.3 * clamp01(functionalSpread) + 0.3 * maturity;
  return Math.round(clamp01(idx) * 100);
}

export interface CanopyMetrics {
  year: number;
  maturity: number;
  layerCounts: Record<string, number>;
  light: Record<string, number>;
  closurePct: number;
  understoryLightPct: number;
  shadeHours: number;
  productivityIndex: number;
  nichesFilled: number;
  nicheCount: number;
  distinctFunctions: number;
  biomassByLayer: Record<string, number>;
  productivityByLayer: Record<string, number>;
}

/** One-shot aggregator for the card. Accepts resolved catalog
 *  entries plus the active succession year. */
export function canopyMetrics(species: PlantCatalogEntry[], year: number): CanopyMetrics {
  const layerCounts = layerCountsFromSpecies(species);
  const { nichesFilled, nicheCount } = speciesRichnessByLayer(species);
  return {
    year,
    maturity: maturityFactor(year),
    layerCounts,
    light: lightByLayer(layerCounts, year),
    closurePct: canopyClosurePct(layerCounts, year),
    understoryLightPct: understoryLightPct(layerCounts, year),
    shadeHours: shadeHoursEstimate(layerCounts, year),
    productivityIndex: productivityIndex(species, year),
    nichesFilled,
    nicheCount,
    distinctFunctions: distinctFunctionCount(species),
    biomassByLayer: biomassDistribution(species, year),
    productivityByLayer: productivityByLayer(species, year),
  };
}
