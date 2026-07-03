// relationships/seededRecipes/silvopasture.ts
//
// Per-objective seeded recipes for the SILVOPASTURE type — the objective ids that
// have a bespoke recipe in constants/recipe/catalogues/silvopasture.ts. A PRIMARY
// map (silvopasture is the project's primary type) and a SECONDARY map (layered
// onto a host). Objectives absent here resolve to a universal kind/domain recipe —
// graceful, exactly like a not-yet-encoded protocol objective. Mirrors
// relationships/seededProtocols/silvopasture.ts.

import type { SeededRecipeMap } from './types.js';

export const SILVOPASTURE_SEEDED_RECIPES: SeededRecipeMap = {
  'silv-s4-paddock-layout': 'silv-recipe-paddock-layout',
  'silv-s4-stock-water-strategy': 'silv-recipe-stock-water-strategy',
  'silv-s4-tree-integration': 'silv-recipe-tree-integration',
  'silv-s5-fencing': 'silv-recipe-fencing',
  'silv-s5-tree-planting': 'silv-recipe-tree-planting',
  'silv-s6-pasture-monitoring': 'silv-recipe-pasture-monitoring',
  'silv-s7-pasture-spelling': 'silv-recipe-pasture-spelling',
};

export const SILVOPASTURE_SECONDARY_SEEDED_RECIPES: SeededRecipeMap = {
  'silv-sec-s4-grazing-design': 'silv-recipe-sec-grazing-design',
  'silv-sec-s5-tree-establishment': 'silv-recipe-sec-tree-establishment',
  'silv-sec-s6-pasture-tree-monitoring': 'silv-recipe-sec-pasture-tree-monitoring',
};
