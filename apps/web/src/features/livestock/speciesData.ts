/**
 * Species data catalogs for livestock and crops.
 */

import type { LivestockSpecies } from '../../store/livestockStore.js';
import type { CropAreaType } from '../../store/cropStore.js';
import { crop } from '../../lib/tokens';

export interface LivestockSpeciesInfo {
  label: string;
  icon: string;
  typicalStocking: number; // head per hectare
  minPaddockHa: number;
  recoveryDays: number; // typical rotation recovery
  fencingNote: string;
  waterNote: string;
  shelterNote: string;
}

export const LIVESTOCK_SPECIES: Record<LivestockSpecies, LivestockSpeciesInfo> = {
  sheep: {
    label: 'Sheep', icon: '\u{1F411}',
    typicalStocking: 12, minPaddockHa: 0.1, recoveryDays: 30,
    fencingNote: 'Woven wire or 5-strand electric',
    waterNote: '5-8 L/head/day',
    shelterNote: 'Run-in shelter for lambing; shade for summer',
  },
  cattle: {
    label: 'Cattle', icon: '\u{1F404}',
    typicalStocking: 2, minPaddockHa: 0.5, recoveryDays: 45,
    fencingNote: 'High-tensile electric (2-3 strand) or post-rail',
    waterNote: '40-80 L/head/day',
    shelterNote: 'Shade trees or run-in shelter',
  },
  goats: {
    label: 'Goats', icon: '\u{1F410}',
    typicalStocking: 10, minPaddockHa: 0.1, recoveryDays: 30,
    fencingNote: 'Woven wire essential — goats escape everything else',
    waterNote: '4-8 L/head/day',
    shelterNote: 'Enclosed shelter — goats hate rain',
  },
  poultry: {
    label: 'Poultry', icon: '\u{1F414}',
    typicalStocking: 250, minPaddockHa: 0.05, recoveryDays: 14,
    fencingNote: 'Electronet portable fencing',
    waterNote: '0.5 L/bird/day',
    shelterNote: 'Mobile coop or chicken tractor',
  },
  pigs: {
    label: 'Pigs', icon: '\u{1F416}',
    typicalStocking: 15, minPaddockHa: 0.1, recoveryDays: 60,
    fencingNote: 'Strong electric — pigs are powerful',
    waterNote: '10-15 L/head/day',
    shelterNote: 'A-frame shelters or deep-bed housing',
  },
  horses: {
    label: 'Horses', icon: '\u{1F40E}',
    typicalStocking: 2, minPaddockHa: 0.5, recoveryDays: 21,
    fencingNote: 'Post-rail or electric tape (high visibility)',
    waterNote: '30-50 L/head/day',
    shelterNote: 'Three-sided run-in shelter minimum',
  },
  ducks_geese: {
    label: 'Ducks & Geese', icon: '\u{1F986}',
    typicalStocking: 100, minPaddockHa: 0.05, recoveryDays: 14,
    fencingNote: 'Low electronet or poultry netting',
    waterNote: '1 L/bird/day + swimming water',
    shelterNote: 'Simple night shelter, predator-proof',
  },
  rabbits: {
    label: 'Rabbits', icon: '\u{1F407}',
    typicalStocking: 50, minPaddockHa: 0.02, recoveryDays: 7,
    fencingNote: 'Rabbit tractor or secure wire enclosure',
    waterNote: '0.5 L/head/day',
    shelterNote: 'Hutch or tractor with shade',
  },
  bees: {
    label: 'Bees', icon: '\u{1F41D}',
    typicalStocking: 4, minPaddockHa: 0.01, recoveryDays: 0,
    fencingNote: 'Electric bear fence if in bear country',
    waterNote: 'Water source within 200m',
    shelterNote: 'Hives face south-east, wind-protected',
  },
};

export interface CropTypeInfo {
  label: string;
  icon: string;
  color: string;
  defaultSpacingM: number | null;
  waterDemand: 'low' | 'medium' | 'high';
  description: string;
}

export const CROP_TYPES: Record<CropAreaType, CropTypeInfo> = {
  orchard: {
    label: 'Orchard', icon: '\u{1F34E}', color: crop.orchard,
    defaultSpacingM: 5, waterDemand: 'medium',
    description: 'Fruit or nut trees in organized rows',
  },
  row_crop: {
    label: 'Row Crop', icon: '\u{1F33E}', color: crop.row_crop,
    defaultSpacingM: 0.75, waterDemand: 'medium',
    description: 'Annual vegetable or grain production',
  },
  garden_bed: {
    label: 'Garden Bed', icon: '\u{1F33B}', color: crop.garden_bed,
    defaultSpacingM: null, waterDemand: 'high',
    description: 'Intensive raised or in-ground beds',
  },
  food_forest: {
    label: 'Food Forest', icon: '\u{1F332}', color: crop.food_forest,
    defaultSpacingM: 4, waterDemand: 'low',
    description: 'Multi-layer perennial polyculture',
  },
  windbreak: {
    label: 'Windbreak', icon: '\u{1F343}', color: crop.windbreak,
    defaultSpacingM: 3, waterDemand: 'low',
    description: 'Wind protection tree/shrub row',
  },
  shelterbelt: {
    label: 'Shelterbelt', icon: '\u{1F333}', color: crop.shelterbelt,
    defaultSpacingM: 2.5, waterDemand: 'low',
    description: 'Multi-row wind and habitat corridor',
  },
  silvopasture: {
    label: 'Silvopasture', icon: '\u{1F334}', color: crop.silvopasture,
    defaultSpacingM: 8, waterDemand: 'medium',
    description: 'Trees integrated with livestock grazing',
  },
  nursery: {
    label: 'Nursery', icon: '\u{1F331}', color: crop.nursery,
    defaultSpacingM: 1, waterDemand: 'high',
    description: 'Plant propagation and growing area',
  },
  market_garden: {
    label: 'Market Garden', icon: '\u{1F955}', color: crop.market_garden,
    defaultSpacingM: 0.45, waterDemand: 'high',
    description: 'Intensive vegetable production for sale',
  },
  pollinator_strip: {
    label: 'Pollinator Strip', icon: '\u{1F33A}', color: crop.pollinator_strip,
    defaultSpacingM: null, waterDemand: 'low',
    description: 'Native wildflower and pollinator habitat',
  },
};
