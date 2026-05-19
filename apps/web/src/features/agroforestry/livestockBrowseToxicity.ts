/**
 * livestockBrowseToxicity — static catalog of livestock browse-toxicity
 * cases for plants present in `PLANT_CATALOG` (Sub-project B4).
 *
 * Coarse heuristic — explicitly NOT vet-grade. Every entry cites a
 * verifiable extension/veterinary source so the steward can audit the
 * claim before acting. Coverage is bounded by which species exist in
 * `plantCatalog.ts`; toxic plants not yet in the catalog (Nerium,
 * Taxus, Rhododendron, Cestrum, etc.) are intentionally omitted, not
 * stubbed — the catalog grows organically.
 *
 * "Toxicity" here is browse/forage toxicity only. Never a financial or
 * yield-as-return notion.
 */

import type { GuildMember } from '../../store/polycultureStore.js';
import type { LivestockSpecies } from '../../store/livestockStore.js';

export type ToxicityTier = 'avoid' | 'caution';

export interface BrowseToxicityEntry {
  /** plantCatalog.ts id. */
  speciesId: string;
  /** Livestock species the entry applies to (subset of LivestockSpecies). */
  affects: LivestockSpecies[];
  tier: ToxicityTier;
  /** Short clinical note — what compound, what effect. */
  rationale: string;
  /** Verifiable external source string. */
  citation: string;
}

export const LIVESTOCK_BROWSE_TOXICITY: BrowseToxicityEntry[] = [
  {
    speciesId: 'black_walnut',
    affects: ['horses'],
    tier: 'avoid',
    rationale:
      'Juglone in bark, roots, and shavings causes laminitis in horses within 24h of bedding contact.',
    citation:
      'Cornell University CALS, Plants Poisonous to Livestock — Juglans nigra',
  },
  {
    speciesId: 'cherry',
    affects: ['cattle', 'sheep', 'goats', 'horses'],
    tier: 'avoid',
    rationale:
      'Wilted Prunus leaves release cyanogenic glycosides (prunasin); acute hydrogen-cyanide poisoning in ruminants and horses.',
    citation:
      'Merck Veterinary Manual — Cyanide Poisoning (Prunus spp.)',
  },
  {
    speciesId: 'peach',
    affects: ['cattle', 'sheep', 'goats', 'horses'],
    tier: 'avoid',
    rationale:
      'Same Prunus wilted-leaf cyanogenic-glycoside pathway as cherry; storm-downed branches are the typical exposure.',
    citation:
      'Merck Veterinary Manual — Cyanide Poisoning (Prunus spp.)',
  },
  {
    speciesId: 'pecan',
    affects: ['horses'],
    tier: 'caution',
    rationale:
      'Carya juglone is lower than Juglans but the same pathway; avoid pecan shavings or heavy leaf litter near horse paddocks.',
    citation:
      'ASPCA Animal Poison Control — Toxic and Non-Toxic Plant List (Carya illinoinensis)',
  },
  {
    speciesId: 'black_locust',
    affects: ['horses', 'cattle'],
    tier: 'avoid',
    rationale:
      'Robin and phasin lectins in bark, leaves, and seeds cause GI and cardiac toxicity; horses are especially sensitive.',
    citation:
      'Cornell University CALS, Plants Poisonous to Livestock — Robinia pseudoacacia',
  },
  {
    speciesId: 'elderberry',
    affects: ['cattle', 'sheep', 'goats', 'horses'],
    tier: 'caution',
    rationale:
      'Raw leaves, stems, bark, and unripe berries contain cyanogenic glycosides; cooked ripe berries are safe but browse is not.',
    citation:
      'USDA Forest Service Plant Guide — Sambucus nigra',
  },
  {
    speciesId: 'comfrey',
    affects: ['horses'],
    tier: 'caution',
    rationale:
      'Pyrrolizidine alkaloids accumulate as hepatotoxins; horses are most sensitive on chronic exposure.',
    citation:
      'Merck Veterinary Manual — Pyrrolizidine Alkaloids (Symphytum spp.)',
  },
  {
    speciesId: 'borage',
    affects: ['horses', 'cattle', 'sheep', 'goats'],
    tier: 'caution',
    rationale:
      'Pyrrolizidine alkaloids in foliage cause cumulative hepatic damage on chronic ingestion.',
    citation:
      'Merck Veterinary Manual — Pyrrolizidine Alkaloids (Boraginaceae)',
  },
  {
    speciesId: 'garlic',
    affects: ['horses', 'cattle', 'sheep', 'goats'],
    tier: 'caution',
    rationale:
      'Allium n-propyl disulfide induces oxidative damage to red blood cells (Heinz-body hemolytic anemia) at sustained intake.',
    citation:
      'ASPCA Animal Poison Control — Allium spp.',
  },
  {
    speciesId: 'garlic_chive',
    affects: ['horses', 'cattle', 'sheep', 'goats'],
    tier: 'caution',
    rationale:
      'Same Allium-family hemolytic risk as garlic; lower compound mass but volunteers grow densely in ground-cover layers.',
    citation:
      'ASPCA Animal Poison Control — Allium spp.',
  },
  {
    speciesId: 'persimmon',
    affects: ['cattle', 'horses'],
    tier: 'caution',
    rationale:
      'Unripe-fruit tannins coagulate with stomach contents into phytobezoars; well-documented obstruction risk in autumn.',
    citation:
      'Merck Veterinary Manual — Phytobezoar (Diospyros virginiana)',
  },
  {
    speciesId: 'white_oak',
    affects: ['cattle', 'sheep', 'goats'],
    tier: 'caution',
    rationale:
      'Young leaves and green acorns carry hydrolysable tannins (gallotannins) causing renal/GI oak poisoning at heavy mast intake.',
    citation:
      'Merck Veterinary Manual — Oak Poisoning (Quercus spp.)',
  },
];

/**
 * Return toxicity entries that apply to any species in the guild AND any
 * livestock species in the herd. Matches by exact catalog id only.
 */
export function toxicityForGuild(
  members: GuildMember[],
  herd: LivestockSpecies[],
): BrowseToxicityEntry[] {
  if (members.length === 0 || herd.length === 0) return [];
  const memberIds = new Set(members.map((m) => m.speciesId));
  const herdSet = new Set(herd);
  const out: BrowseToxicityEntry[] = [];
  for (const entry of LIVESTOCK_BROWSE_TOXICITY) {
    if (!memberIds.has(entry.speciesId)) continue;
    if (!entry.affects.some((a) => herdSet.has(a))) continue;
    out.push(entry);
  }
  return out;
}
