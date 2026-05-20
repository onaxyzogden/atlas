/**
 * beneficialFunctionCatalog — static, cited mapping from PLANT_CATALOG
 * `ecologicalFunction` tags and DesignKind structural elements to the
 * beneficial-organism categories they support (sub-project B5).
 *
 * Coarse heuristic — explicitly NOT a vet/ecology lab signal. Every entry
 * cites a verifiable extension/conservation-NGO source so the steward can
 * audit the claim. Coverage is bounded by what already exists:
 *   - Plant tags are the four beneficial-relevant `EcologicalFunction`
 *     values in `plantCatalog.ts` (pollinator, insectary, wildlife_food,
 *     n_fixer).
 *   - Structure kinds are the three habitat-relevant element kinds in
 *     `elementCatalog.ts` (hedgerow, pond, shrub). Beetle-bank, insectary-
 *     strip, bird-box, and bat-box do not yet exist as DesignKind values
 *     and are intentionally omitted, not stubbed — the catalog grows
 *     organically (B4 precedent).
 *
 * "Beneficial-organism support" here is an ecological-function signal
 * only. Never a financial or yield-as-return notion.
 */

import { PLANT_CATALOG } from '../../data/plantCatalog.js';

export type BeneficialCategory =
  | 'pollinator'           // bees, lepidoptera
  | 'predatory_insectary'  // predatory wasps, lacewings, syrphid flies
  | 'wildlife_food'        // birds, small mammals
  | 'soil_biota_partner'   // rhizobia symbiosis (n-fixers)
  | 'avian_shelter'        // bird nesting + cover
  | 'amphibian_predator'   // dragonflies, frogs (pond-dependent)
  | 'small_bird_nesting';  // shrub-dependent passerines

export type BeneficialPlantTag =
  | 'pollinator'
  | 'insectary'
  | 'wildlife_food'
  | 'n_fixer';

export type BeneficialStructureKind = 'hedgerow' | 'pond' | 'shrub';

export interface PlantFunctionEntry {
  /** plantCatalog ecologicalFunction tag. */
  tag: BeneficialPlantTag;
  categories: BeneficialCategory[];
  rationale: string;
  citation: string;
}

export interface StructureFunctionEntry {
  /** elementCatalog kind. */
  kind: BeneficialStructureKind;
  categories: BeneficialCategory[];
  rationale: string;
  citation: string;
}

export const BENEFICIAL_PLANT_FUNCTIONS: PlantFunctionEntry[] = [
  {
    tag: 'pollinator',
    categories: ['pollinator'],
    rationale:
      'Nectar- and pollen-rich blooms feed native bees and lepidoptera; the foundation guild for fruit-set and seed-bank persistence.',
    citation:
      'Xerces Society — Farming for Bees: Guidelines for Providing Native Bee Habitat on Farms (2nd ed.)',
  },
  {
    tag: 'insectary',
    categories: ['predatory_insectary', 'pollinator'],
    rationale:
      'Umbel/composite flowering plants host adult parasitoid wasps, syrphid flies, and lacewings whose larvae prey on crop pests; a primary biological pest-control lever.',
    citation:
      'UC Statewide IPM Program — Natural Enemies Handbook (UC ANR Publication 3386)',
  },
  {
    tag: 'wildlife_food',
    categories: ['wildlife_food', 'avian_shelter'],
    rationale:
      'Mast and soft-fruit producers feed seed- and frugivore birds and small mammals; tied to overwintering forage availability.',
    citation:
      'Cornell Lab of Ornithology — Birds in Forested Landscapes (Project FeederWatch habitat guidance)',
  },
  {
    tag: 'n_fixer',
    categories: ['soil_biota_partner'],
    rationale:
      'Rhizobial symbiosis fixes atmospheric nitrogen via root nodules; supports the soil bacterial guild and downstream mycorrhizal networks.',
    citation:
      'USDA NRCS Plant Materials Technical Note — Nitrogen Fixation by Legumes (TN-PM-15)',
  },
];

export const BENEFICIAL_STRUCTURE_FUNCTIONS: StructureFunctionEntry[] = [
  {
    kind: 'hedgerow',
    categories: ['avian_shelter', 'predatory_insectary', 'pollinator'],
    rationale:
      'Linear woody plantings serve as bird-nesting corridors, beneficial-insect overwintering refugia, and pollinator highways between forage patches.',
    citation:
      'Xerces Society — Hedgerow Planting for Pollinators (Conservation Practice Standard 422 supplement)',
  },
  {
    kind: 'pond',
    categories: ['amphibian_predator', 'wildlife_food'],
    rationale:
      'Open water hosts dragonfly and frog populations that consume mosquito and pest-fly larvae; a year-round drinking source for birds and small mammals.',
    citation:
      'Cornell Lab of Ornithology — All About Birdscaping: Water Features',
  },
  {
    kind: 'shrub',
    categories: ['small_bird_nesting', 'pollinator'],
    rationale:
      'Mid-storey shrub structure provides nesting sites for passerines (cardinals, catbirds, towhees) and an additional flowering layer for pollinators.',
    citation:
      'Audubon Society — Plants for Birds: Shrub Layer Habitat Guidance',
  },
];

const PLANT_TAG_INDEX = new Map<string, PlantFunctionEntry>(
  BENEFICIAL_PLANT_FUNCTIONS.map((e) => [e.tag, e]),
);

const STRUCTURE_KIND_INDEX = new Map<string, StructureFunctionEntry>(
  BENEFICIAL_STRUCTURE_FUNCTIONS.map((e) => [e.kind, e]),
);

/**
 * Aggregate the beneficial categories supported by a plantCatalog
 * species id, by mapping each of its `ecologicalFunction[]` tags through
 * `BENEFICIAL_PLANT_FUNCTIONS`. Returns deduplicated categories; empty
 * array if the species is unknown or carries no beneficial tags.
 */
export function beneficialCategoriesForPlant(
  speciesId: string,
): BeneficialCategory[] {
  const plant = PLANT_CATALOG.find((p) => p.id === speciesId);
  if (!plant) return [];
  const tags = plant.ecologicalFunction ?? [];
  const out = new Set<BeneficialCategory>();
  for (const tag of tags) {
    const entry = PLANT_TAG_INDEX.get(tag);
    if (entry) for (const c of entry.categories) out.add(c);
  }
  return Array.from(out);
}

/**
 * Return the beneficial categories carried by a DesignElement kind.
 * Empty array for kinds without a habitat-function entry.
 */
export function beneficialCategoriesForStructure(
  kind: string,
): BeneficialCategory[] {
  const entry = STRUCTURE_KIND_INDEX.get(kind);
  return entry ? [...entry.categories] : [];
}
