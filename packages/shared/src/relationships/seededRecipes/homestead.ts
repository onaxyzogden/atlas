// relationships/seededRecipes/homestead.ts
//
// Per-objective seeded recipes for the HOMESTEAD type — the objective ids that
// have a bespoke recipe in constants/recipe/catalogues/homestead.ts. Homestead
// runs as a PRIMARY type in the encoded slice, so this is a primary map only.
// The two financial objectives (hms-s7-budget-input-reduction,
// hms-s7-provision-phasing) are deliberately absent: they resolve to the
// universal economics-capacity domain recipe, keeping every capital touch off the
// authored layer. Mirrors relationships/seededProtocols/homestead.ts.

import type { SeededRecipeMap } from './types.js';

export const HOMESTEAD_SEEDED_RECIPES: SeededRecipeMap = {
  'hms-s3-water-quality': 'hms-recipe-water-quality',
  'hms-s4-food-production-strategy': 'hms-recipe-food-production-strategy',
  'hms-s4-fertility-strategy': 'hms-recipe-fertility-strategy',
  'hms-s5-food-zones-layout': 'hms-recipe-food-zones-layout',
  'hms-s5-animal-husbandry': 'hms-recipe-animal-husbandry',
  'hms-s5-energy-shelter-systems': 'hms-recipe-energy-shelter-systems',
};
