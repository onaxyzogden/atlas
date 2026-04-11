/**
 * Canopy layer definitions — 7-layer food forest structure.
 * Static reference data for food forest visualization.
 */

export interface CanopyLayer {
  layer: 'canopy' | 'sub_canopy' | 'shrub' | 'ground_cover' | 'root' | 'vine' | 'fungi';
  label: string;
  heightRange: string;
  color: string;
  exampleSpecies: string[];
}

export const FOOD_FOREST_LAYERS: CanopyLayer[] = [
  {
    layer: 'canopy',
    label: 'Canopy',
    heightRange: '10\u201320m',
    color: '#15803D',
    exampleSpecies: ['Black Walnut', 'Pecan', 'Hybrid Chestnut', 'Persimmon'],
  },
  {
    layer: 'sub_canopy',
    label: 'Sub-Canopy',
    heightRange: '4\u201310m',
    color: '#22c55e',
    exampleSpecies: ['Apple', 'Pear', 'Cherry', 'Pawpaw'],
  },
  {
    layer: 'shrub',
    label: 'Shrub',
    heightRange: '1\u20134m',
    color: '#4ade80',
    exampleSpecies: ['Elderberry', 'Blueberry', 'Currant', 'Gooseberry', 'Hazelnut'],
  },
  {
    layer: 'ground_cover',
    label: 'Ground Cover',
    heightRange: '0\u20131m',
    color: '#86efac',
    exampleSpecies: ['Strawberry', 'Clover', 'Comfrey', 'Mint'],
  },
  {
    layer: 'root',
    label: 'Root',
    heightRange: 'Below ground',
    color: '#a16207',
    exampleSpecies: ['Garlic', 'Potato', 'Jerusalem Artichoke', 'Horseradish'],
  },
  {
    layer: 'vine',
    label: 'Vine',
    heightRange: 'Climbing',
    color: '#65a30d',
    exampleSpecies: ['Grape', 'Hardy Kiwi', 'Hops', 'Passionflower'],
  },
  {
    layer: 'fungi',
    label: 'Fungi',
    heightRange: 'Soil/Deadwood',
    color: '#78716c',
    exampleSpecies: ['Shiitake', 'Oyster Mushroom', 'Wine Cap', 'Mycorrhizal networks'],
  },
];
