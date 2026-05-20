/**
 * B5.1 — Static cited cover-crop / living-mulch catalog.
 *
 * External mapping that augments (never mutates) `PLANT_CATALOG`. Every
 * entry's `speciesId` resolves in `PLANT_CATALOG`; species not yet in the
 * plant catalog are omitted, not stubbed (B4/B5 precedent — the catalog
 * grows organically as PLANT_CATALOG expands).
 *
 * Citations: SARE *Managing Cover Crops Profitably (3rd ed.)*, Rodale
 * *Cover Crops & Living Mulches*, USDA NRCS Plant Materials Technical
 * Notes, UC SAREP cover-crop database, Xerces Society.
 *
 * Covenant: no riba / gharar / CSRA / salam / investor / financing /
 * cost-of-capital — "coverage %" is strictly soil-vitality (months of
 * living roots), never a financial or yield-as-return notion.
 */

import { CATALOG_BY_ID } from '../../data/plantCatalog.js';

export type CoverCropRole =
  | 'green_manure'   // killed in place, biomass tilled/crimped for N
  | 'living_mulch'   // perennial understory, never fully terminated
  | 'winter_cover'   // late-fall sown, terminated early spring
  | 'scavenger'      // pulls excess soil N (brassicas, rye)
  | 'smother'        // dense canopy suppresses weeds
  | 'biofumigant';   // brassica glucosinolates suppress soil pests

export type CoverCropSeason = 'spring' | 'summer' | 'fall' | 'winter';

export interface CoverCropEntry {
  /** PLANT_CATALOG species id this catalog row applies to. */
  speciesId: string;
  roles: CoverCropRole[];
  /** Seasons during which this crop has *living roots in the ground*. */
  livingRootSeasons: CoverCropSeason[];
  /**
   * Typical planting month window (Northern hemisphere, temperate default).
   * Stewards override on the per-CropArea `CropCoverWindow`.
   */
  plantingMonthWindow: [number, number];
  rationale: string;
  citation: string;
}

export const COVER_CROP_CATALOG: readonly CoverCropEntry[] = Object.freeze([
  {
    speciesId: 'clover',
    roles: ['living_mulch', 'green_manure'],
    livingRootSeasons: ['spring', 'summer', 'fall'],
    plantingMonthWindow: [3, 9],
    rationale:
      'White clover (Trifolium repens) fixes 75–150 kg N/ha/yr via Rhizobium nodulation; tolerates low mowing and orchard understory shade, persisting 3+ years as living mulch.',
    citation:
      'SARE, Managing Cover Crops Profitably (3rd ed.), Ch. 8 (Clovers); USDA NRCS Plant Guide — Trifolium repens.',
  },
  {
    speciesId: 'comfrey',
    roles: ['living_mulch'],
    livingRootSeasons: ['spring', 'summer', 'fall', 'winter'],
    plantingMonthWindow: [4, 6],
    rationale:
      'Symphytum officinale taproot mines K, Ca, and P from the B-horizon (2.5 m); chop-and-drop biomass functions as a year-round living mulch in orchard understories from zone 3 upward.',
    citation:
      'Rodale Institute, Cover Crops & Living Mulches (2018); Permaculture Research Institute, Comfrey as a Permaculture Plant (2015).',
  },
  {
    speciesId: 'borage',
    roles: ['smother', 'green_manure'],
    livingRootSeasons: ['spring', 'summer'],
    plantingMonthWindow: [4, 7],
    rationale:
      'Borago officinalis germinates in 7–14 days and forms a dense smother canopy within 6 weeks; succulent biomass tills in cleanly as green manure, and the flowers are a top-tier nectar source for honeybees and bumblebees.',
    citation:
      'UC SAREP Cover Crop Database — Borago officinalis; Xerces Society, Farming with Native Beneficial Insects (2014).',
  },
  {
    speciesId: 'yarrow',
    roles: ['living_mulch'],
    livingRootSeasons: ['spring', 'summer', 'fall', 'winter'],
    plantingMonthWindow: [4, 6],
    rationale:
      'Achillea millefolium spreads by rhizome to form drought-tolerant perennial living mulch; the dynamic-accumulator habit returns Ca, K, P, and Cu to surface litter while persistent root mass holds soil year-round.',
    citation:
      'USDA NRCS Plant Guide — Achillea millefolium; Rodale Institute, Cover Crops & Living Mulches (2018).',
  },
  {
    speciesId: 'creeping_thyme',
    roles: ['living_mulch'],
    livingRootSeasons: ['spring', 'summer', 'fall', 'winter'],
    plantingMonthWindow: [4, 6],
    rationale:
      'Thymus serpyllum forms a 5–10 cm evergreen mat that smothers weeds and persists through mild winters (zones 4–9); fibrous root mat keeps living roots in the ground year-round in temperate orchards.',
    citation:
      'USDA NRCS Plant Materials Technical Note — Low-Growing Groundcovers (2010); Rodale, Cover Crops & Living Mulches (2018).',
  },
  {
    speciesId: 'bugleweed',
    roles: ['living_mulch'],
    livingRootSeasons: ['spring', 'summer', 'fall', 'winter'],
    plantingMonthWindow: [4, 6],
    rationale:
      'Ajuga reptans spreads by stolon to form a 10–15 cm shade-tolerant evergreen mat; ideal living mulch beneath established orchard canopy where most cover-crops fail for lack of light.',
    citation:
      'Rodale Institute, Cover Crops & Living Mulches (2018), Ch. 6 (Shade-tolerant ground covers).',
  },
]);

export function coverCropEntryFor(speciesId: string): CoverCropEntry | undefined {
  return COVER_CROP_CATALOG.find((e) => e.speciesId === speciesId);
}

/**
 * Expand a 1..12 month window (possibly wrapping the year boundary) into the
 * list of months covered. `endMonth < startMonth` → wraps: e.g. {10, 3} →
 * [10, 11, 12, 1, 2, 3]. Returns the empty array for invalid input.
 */
export function livingRootMonthsFor(window: {
  startMonth: number;
  endMonth: number;
}): number[] {
  const { startMonth, endMonth } = window;
  if (
    !Number.isFinite(startMonth) ||
    !Number.isFinite(endMonth) ||
    startMonth < 1 || startMonth > 12 ||
    endMonth < 1 || endMonth > 12
  ) {
    return [];
  }
  const months: number[] = [];
  let m = startMonth;
  // walk forward, wrapping at 12→1, until we step past endMonth
  // (max 12 iterations protects against pathological input)
  for (let i = 0; i < 12; i++) {
    months.push(m);
    if (m === endMonth) return months;
    m = m === 12 ? 1 : m + 1;
  }
  return months;
}

// Build-time integrity check: every speciesId resolves in PLANT_CATALOG.
// (Re-validated by the colocated test, but a runtime guard during dev
// catches catalog drift the moment a stale entry sneaks in.)
for (const entry of COVER_CROP_CATALOG) {
  if (!CATALOG_BY_ID[entry.speciesId]) {
    // eslint-disable-next-line no-console
    console.warn(
      `[coverCropCatalog] speciesId "${entry.speciesId}" not in PLANT_CATALOG`,
    );
  }
}
