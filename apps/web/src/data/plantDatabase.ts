/**
 * Starter plant database for PLAN-stage Module 4 (Plant Systems & Polyculture).
 *
 * v1: hand-curated ~40 species drawn from temperate-permaculture canon
 * (PFAF, Edible Forest Gardens). Deliberately broad across the seven
 * canopy layers and across ecological functions so the Guild Builder UI
 * has enough variety to compose a meaningful polyculture.
 *
 * Data semantics:
 *   - hardinessZones: USDA min/max (e.g. [4, 8]).
 *   - matureHeightM / matureWidthM: typical mature canopy at maturity.
 *   - rootDepthM: typical max root depth, metres.
 *   - All sizes are conservative estimates — real growth varies wildly
 *     by site. Use for relative planning, not absolute sizing.
 *
 * Stable identifiers (`pl-*`) are referenced by `siteAnnotationsStore.guilds`
 * + `siteAnnotationsStore.species`. Do not renumber. New entries append.
 */

export type LightNeeds = 'full' | 'partial' | 'shade';
export type WaterNeeds = 'low' | 'med' | 'high';
export type RootPattern = 'fibrous' | 'tap' | 'rhizome';
export type EcologicalFunction =
  | 'n_fixer'
  | 'dynamic_accumulator'
  | 'insectary'
  | 'pollinator'
  | 'wildlife_food'
  | 'edible_yield'
  | 'timber'
  | 'fodder'
  | 'medicinal';

/** Seven-layer forest-garden assignment (matches `canopyLayerData.ts`). */
export type CanopyLayer =
  | 'canopy'
  | 'sub_canopy'
  | 'shrub'
  | 'herbaceous'
  | 'ground_cover'
  | 'vine'
  | 'root';

export interface PlantSpecies {
  id: string;
  latinName: string;
  commonName: string;
  layer: CanopyLayer;
  matureHeightM: number;
  matureWidthM: number;
  hardinessZones: [number, number];
  lightNeeds: LightNeeds;
  waterNeeds: WaterNeeds;
  rootDepthM: number;
  rootPattern: RootPattern;
  ecologicalFunction: EcologicalFunction[];
}

export const PLANT_DATABASE: PlantSpecies[] = [
  // ── Canopy ────────────────────────────────────────────────────────────────
  { id: 'pl-001', latinName: 'Juglans nigra', commonName: 'Black walnut', layer: 'canopy', matureHeightM: 30, matureWidthM: 18, hardinessZones: [4, 9], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 4, rootPattern: 'tap', ecologicalFunction: ['edible_yield', 'timber', 'wildlife_food'] },
  { id: 'pl-002', latinName: 'Castanea dentata', commonName: 'American chestnut', layer: 'canopy', matureHeightM: 25, matureWidthM: 15, hardinessZones: [4, 8], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 3, rootPattern: 'tap', ecologicalFunction: ['edible_yield', 'timber', 'wildlife_food'] },
  { id: 'pl-003', latinName: 'Quercus alba', commonName: 'White oak', layer: 'canopy', matureHeightM: 25, matureWidthM: 20, hardinessZones: [3, 9], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 5, rootPattern: 'tap', ecologicalFunction: ['timber', 'wildlife_food'] },
  { id: 'pl-004', latinName: 'Robinia pseudoacacia', commonName: 'Black locust', layer: 'canopy', matureHeightM: 20, matureWidthM: 12, hardinessZones: [3, 8], lightNeeds: 'full', waterNeeds: 'low', rootDepthM: 3, rootPattern: 'tap', ecologicalFunction: ['n_fixer', 'timber', 'pollinator'] },
  { id: 'pl-005', latinName: 'Carya illinoinensis', commonName: 'Pecan', layer: 'canopy', matureHeightM: 25, matureWidthM: 18, hardinessZones: [5, 9], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 4, rootPattern: 'tap', ecologicalFunction: ['edible_yield', 'timber'] },

  // ── Sub-canopy ────────────────────────────────────────────────────────────
  { id: 'pl-101', latinName: 'Malus domestica', commonName: 'Apple', layer: 'sub_canopy', matureHeightM: 6, matureWidthM: 5, hardinessZones: [3, 8], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 2, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'pollinator'] },
  { id: 'pl-102', latinName: 'Pyrus communis', commonName: 'European pear', layer: 'sub_canopy', matureHeightM: 8, matureWidthM: 5, hardinessZones: [4, 8], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 2, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'pollinator'] },
  { id: 'pl-103', latinName: 'Prunus avium', commonName: 'Sweet cherry', layer: 'sub_canopy', matureHeightM: 10, matureWidthM: 6, hardinessZones: [4, 7], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 2, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'pollinator', 'wildlife_food'] },
  { id: 'pl-104', latinName: 'Asimina triloba', commonName: 'Pawpaw', layer: 'sub_canopy', matureHeightM: 8, matureWidthM: 5, hardinessZones: [5, 8], lightNeeds: 'partial', waterNeeds: 'med', rootDepthM: 1.5, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'wildlife_food'] },
  { id: 'pl-105', latinName: 'Diospyros virginiana', commonName: 'American persimmon', layer: 'sub_canopy', matureHeightM: 12, matureWidthM: 6, hardinessZones: [4, 9], lightNeeds: 'full', waterNeeds: 'low', rootDepthM: 3, rootPattern: 'tap', ecologicalFunction: ['edible_yield', 'wildlife_food'] },
  { id: 'pl-106', latinName: 'Morus alba', commonName: 'White mulberry', layer: 'sub_canopy', matureHeightM: 10, matureWidthM: 8, hardinessZones: [4, 8], lightNeeds: 'full', waterNeeds: 'low', rootDepthM: 2, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'wildlife_food', 'fodder'] },
  { id: 'pl-107', latinName: 'Alnus glutinosa', commonName: 'Black alder', layer: 'sub_canopy', matureHeightM: 15, matureWidthM: 8, hardinessZones: [3, 7], lightNeeds: 'full', waterNeeds: 'high', rootDepthM: 3, rootPattern: 'fibrous', ecologicalFunction: ['n_fixer', 'timber'] },
  { id: 'pl-108', latinName: 'Elaeagnus angustifolia', commonName: 'Russian olive', layer: 'sub_canopy', matureHeightM: 7, matureWidthM: 6, hardinessZones: [3, 7], lightNeeds: 'full', waterNeeds: 'low', rootDepthM: 2, rootPattern: 'fibrous', ecologicalFunction: ['n_fixer', 'wildlife_food'] },

  // ── Shrub ─────────────────────────────────────────────────────────────────
  { id: 'pl-201', latinName: 'Vaccinium corymbosum', commonName: 'Highbush blueberry', layer: 'shrub', matureHeightM: 2, matureWidthM: 1.5, hardinessZones: [3, 7], lightNeeds: 'partial', waterNeeds: 'high', rootDepthM: 0.5, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'wildlife_food', 'pollinator'] },
  { id: 'pl-202', latinName: 'Ribes nigrum', commonName: 'Black currant', layer: 'shrub', matureHeightM: 1.5, matureWidthM: 1.5, hardinessZones: [3, 7], lightNeeds: 'partial', waterNeeds: 'med', rootDepthM: 0.6, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'pollinator'] },
  { id: 'pl-203', latinName: 'Sambucus nigra', commonName: 'Elderberry', layer: 'shrub', matureHeightM: 4, matureWidthM: 3, hardinessZones: [3, 8], lightNeeds: 'partial', waterNeeds: 'high', rootDepthM: 1, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'medicinal', 'wildlife_food', 'pollinator'] },
  { id: 'pl-204', latinName: 'Aronia melanocarpa', commonName: 'Black chokeberry', layer: 'shrub', matureHeightM: 2, matureWidthM: 1.5, hardinessZones: [3, 8], lightNeeds: 'partial', waterNeeds: 'med', rootDepthM: 0.6, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'wildlife_food', 'medicinal'] },
  { id: 'pl-205', latinName: 'Hippophae rhamnoides', commonName: 'Sea buckthorn', layer: 'shrub', matureHeightM: 4, matureWidthM: 3, hardinessZones: [3, 7], lightNeeds: 'full', waterNeeds: 'low', rootDepthM: 2, rootPattern: 'fibrous', ecologicalFunction: ['n_fixer', 'edible_yield', 'wildlife_food'] },
  { id: 'pl-206', latinName: 'Caragana arborescens', commonName: 'Siberian pea shrub', layer: 'shrub', matureHeightM: 4, matureWidthM: 3, hardinessZones: [2, 7], lightNeeds: 'full', waterNeeds: 'low', rootDepthM: 2, rootPattern: 'tap', ecologicalFunction: ['n_fixer', 'fodder', 'pollinator'] },
  { id: 'pl-207', latinName: 'Corylus avellana', commonName: 'Hazelnut', layer: 'shrub', matureHeightM: 5, matureWidthM: 4, hardinessZones: [4, 8], lightNeeds: 'partial', waterNeeds: 'med', rootDepthM: 1.5, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'wildlife_food'] },

  // ── Herbaceous ────────────────────────────────────────────────────────────
  { id: 'pl-301', latinName: 'Symphytum × uplandicum', commonName: 'Russian comfrey (Bocking-14)', layer: 'herbaceous', matureHeightM: 1.2, matureWidthM: 1, hardinessZones: [3, 9], lightNeeds: 'partial', waterNeeds: 'med', rootDepthM: 2.5, rootPattern: 'tap', ecologicalFunction: ['dynamic_accumulator', 'fodder', 'pollinator', 'medicinal'] },
  { id: 'pl-302', latinName: 'Allium tuberosum', commonName: 'Garlic chive', layer: 'herbaceous', matureHeightM: 0.4, matureWidthM: 0.3, hardinessZones: [4, 9], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 0.3, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'pollinator', 'insectary'] },
  { id: 'pl-303', latinName: 'Achillea millefolium', commonName: 'Yarrow', layer: 'herbaceous', matureHeightM: 0.6, matureWidthM: 0.5, hardinessZones: [3, 9], lightNeeds: 'full', waterNeeds: 'low', rootDepthM: 0.5, rootPattern: 'rhizome', ecologicalFunction: ['dynamic_accumulator', 'insectary', 'pollinator', 'medicinal'] },
  { id: 'pl-304', latinName: 'Echinacea purpurea', commonName: 'Purple coneflower', layer: 'herbaceous', matureHeightM: 1, matureWidthM: 0.5, hardinessZones: [3, 8], lightNeeds: 'full', waterNeeds: 'low', rootDepthM: 0.5, rootPattern: 'tap', ecologicalFunction: ['pollinator', 'medicinal'] },
  { id: 'pl-305', latinName: 'Borago officinalis', commonName: 'Borage', layer: 'herbaceous', matureHeightM: 0.8, matureWidthM: 0.5, hardinessZones: [4, 10], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 0.6, rootPattern: 'tap', ecologicalFunction: ['pollinator', 'dynamic_accumulator', 'insectary'] },
  { id: 'pl-306', latinName: 'Asparagus officinalis', commonName: 'Asparagus', layer: 'herbaceous', matureHeightM: 1.5, matureWidthM: 0.6, hardinessZones: [3, 8], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 1, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield'] },

  // ── Ground cover ──────────────────────────────────────────────────────────
  { id: 'pl-401', latinName: 'Trifolium repens', commonName: 'White clover', layer: 'ground_cover', matureHeightM: 0.2, matureWidthM: 0.5, hardinessZones: [3, 10], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 0.4, rootPattern: 'fibrous', ecologicalFunction: ['n_fixer', 'pollinator', 'fodder'] },
  { id: 'pl-402', latinName: 'Fragaria × ananassa', commonName: 'Strawberry', layer: 'ground_cover', matureHeightM: 0.2, matureWidthM: 0.4, hardinessZones: [4, 9], lightNeeds: 'partial', waterNeeds: 'med', rootDepthM: 0.3, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'pollinator'] },
  { id: 'pl-403', latinName: 'Thymus serpyllum', commonName: 'Creeping thyme', layer: 'ground_cover', matureHeightM: 0.1, matureWidthM: 0.5, hardinessZones: [4, 9], lightNeeds: 'full', waterNeeds: 'low', rootDepthM: 0.2, rootPattern: 'fibrous', ecologicalFunction: ['pollinator', 'edible_yield', 'medicinal'] },
  { id: 'pl-404', latinName: 'Ajuga reptans', commonName: 'Bugleweed', layer: 'ground_cover', matureHeightM: 0.15, matureWidthM: 0.5, hardinessZones: [3, 9], lightNeeds: 'shade', waterNeeds: 'med', rootDepthM: 0.2, rootPattern: 'rhizome', ecologicalFunction: ['pollinator'] },

  // ── Vine ──────────────────────────────────────────────────────────────────
  { id: 'pl-501', latinName: 'Vitis labrusca', commonName: 'Concord grape', layer: 'vine', matureHeightM: 8, matureWidthM: 4, hardinessZones: [4, 8], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 2, rootPattern: 'tap', ecologicalFunction: ['edible_yield', 'wildlife_food'] },
  { id: 'pl-502', latinName: 'Actinidia arguta', commonName: 'Hardy kiwi', layer: 'vine', matureHeightM: 6, matureWidthM: 3, hardinessZones: [4, 8], lightNeeds: 'partial', waterNeeds: 'med', rootDepthM: 1.5, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield'] },
  { id: 'pl-503', latinName: 'Apios americana', commonName: 'Groundnut', layer: 'vine', matureHeightM: 3, matureWidthM: 1, hardinessZones: [3, 8], lightNeeds: 'partial', waterNeeds: 'high', rootDepthM: 0.6, rootPattern: 'tap', ecologicalFunction: ['n_fixer', 'edible_yield'] },

  // ── Root ──────────────────────────────────────────────────────────────────
  { id: 'pl-601', latinName: 'Helianthus tuberosus', commonName: 'Jerusalem artichoke', layer: 'root', matureHeightM: 2.5, matureWidthM: 0.6, hardinessZones: [3, 9], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 0.8, rootPattern: 'rhizome', ecologicalFunction: ['edible_yield', 'pollinator'] },
  { id: 'pl-602', latinName: 'Allium sativum', commonName: 'Garlic', layer: 'root', matureHeightM: 0.6, matureWidthM: 0.2, hardinessZones: [3, 9], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 0.3, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'medicinal'] },
  { id: 'pl-603', latinName: 'Stachys affinis', commonName: 'Chinese artichoke (crosne)', layer: 'root', matureHeightM: 0.5, matureWidthM: 0.4, hardinessZones: [5, 9], lightNeeds: 'partial', waterNeeds: 'med', rootDepthM: 0.4, rootPattern: 'rhizome', ecologicalFunction: ['edible_yield'] },
  { id: 'pl-604', latinName: 'Daucus carota', commonName: 'Carrot', layer: 'root', matureHeightM: 0.4, matureWidthM: 0.2, hardinessZones: [3, 10], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 0.3, rootPattern: 'tap', ecologicalFunction: ['edible_yield', 'pollinator'] },
];

export function findSpecies(id: string): PlantSpecies | undefined {
  return PLANT_DATABASE.find((p) => p.id === id);
}
