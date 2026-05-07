/**
 * Plant-systems site-match scoring helpers.
 *
 * Scholar verdict (Permaculture Scholar NotebookLM, 2026-05-07): plant
 * design must respond to macro-site analysis (water flow, sectors, zones)
 * — not operate as an isolated database. Quote: "Tree placement will
 * follow the patterns of water flow and access and will be part of the
 * long-term major infrastructure of our design sites."
 *
 * v1 of that integration: a coarse hardiness-zone-band match per
 * project country. This is an honest stub. Future iterations will
 * read live raster data from `siteDataStore` (precip, slope, aspect,
 * solar exposure) to refine the score.
 */

import type { PlantSpecies } from '../../../../data/plantDatabase.js';

/** Approximate USDA hardiness zone band typical for a country's
 *  agriculturally-active range. Conservative centre-of-mass values used
 *  to derive a rough overlap fraction. New jurisdictions append. */
const COUNTRY_ZONE_BANDS: Record<string, [number, number]> = {
  US: [3, 11],
  CA: [2, 8],
  GB: [7, 9],
  IE: [7, 9],
  FR: [6, 10],
  ES: [7, 11],
  DE: [5, 8],
  AU: [8, 12],
  NZ: [7, 11],
  MX: [8, 12],
};

/** Returns 0..1 fraction representing how well a species' hardiness
 *  range overlaps a country's typical agricultural zone band. */
export function hardinessOverlap(
  species: Pick<PlantSpecies, 'hardinessZones'>,
  country: string,
): number {
  const band = COUNTRY_ZONE_BANDS[country] ?? [4, 10];
  const [siteMin, siteMax] = band;
  const [spMin, spMax] = species.hardinessZones;
  const lo = Math.max(siteMin, spMin);
  const hi = Math.min(siteMax, spMax);
  if (hi <= lo) return 0;
  const overlap = hi - lo;
  const spRange = Math.max(1, spMax - spMin);
  return Math.min(1, overlap / spRange);
}

export interface SiteMatchScore {
  /** 0..100 % match to site context. */
  score: number;
  /** Short explanation of which factor drove the score. */
  rationale: string;
}

/** Produce a site-match score for a species. v1 reads only country →
 *  hardiness-band overlap. Future versions will fold in slope/aspect/
 *  precip from `siteDataStore.layers`. */
export function scoreSiteMatch(
  species: PlantSpecies,
  country: string,
): SiteMatchScore {
  const overlap = hardinessOverlap(species, country);
  const score = Math.round(overlap * 100);
  let rationale: string;
  if (overlap >= 0.6) rationale = 'Hardiness range covers most of the site band.';
  else if (overlap >= 0.3) rationale = 'Partial hardiness fit — verify microclimate.';
  else if (overlap > 0)    rationale = 'Marginal — site is at the edge of this species’ range.';
  else                     rationale = 'Outside typical hardiness band for the site.';
  return { score, rationale };
}
