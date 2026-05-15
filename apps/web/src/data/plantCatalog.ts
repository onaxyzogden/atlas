/**
 * Union plant catalog — canonical source of perennial + annual plant
 * data. snake_case ids; legacy `pl-XXX` ids resolve via
 * `plantCatalogAliases.ts`.
 *
 * Consolidated 2026-05-14 from:
 *   - `data/plantDatabase.ts`         (pl-XXX, perennial layering axis)
 *   - `features/planting/plantSpeciesData.ts` (snake_case, site-match axis)
 *
 * Frost-anchored annual phenology (`plantPhenologyData.ts`) stays
 * orthogonal — its shape is unrelated and only one consumer reads it.
 *
 * Entry shape is intentionally flat (no nested `layering` / `growing`
 * blocks): consumers from either legacy catalog can swap the import
 * without rewriting field accesses. Fields are optional when only one
 * source carried them. Both `hardinessZones` (catalog-A naming) and
 * `hardinessRange` (catalog-B naming) are populated when known.
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

export type CanopyLayer =
  | 'canopy'
  | 'sub_canopy'
  | 'shrub'
  | 'herbaceous'
  | 'ground_cover'
  | 'vine'
  | 'root';

export type PlantCategory = 'tree' | 'shrub' | 'vine' | 'ground_cover';
export type FrostSensitivity = 'low' | 'medium' | 'high';
export type WaterDemand = 'low' | 'medium' | 'high';

export interface PlantCatalogEntry {
  id: string;
  latinName: string;
  commonName: string;
  legacyIds?: string[];

  // catalog-A axis (layering / guild / canopy)
  layer?: CanopyLayer;
  matureHeightM?: number;
  matureWidthM?: number;
  hardinessZones?: [number, number];
  lightNeeds?: LightNeeds;
  waterNeeds?: WaterNeeds;
  rootDepthM?: number;
  rootPattern?: RootPattern;
  ecologicalFunction?: EcologicalFunction[];

  // catalog-B axis (site-match / planting)
  category?: PlantCategory;
  hardinessRange?: [number, number];
  drainageSuitability?: string[];
  maxSlopeDeg?: number;
  spacingM?: { inRow: number; betweenRow: number };
  yieldEstimate?: { perTreeKg: number; unit: string } | null;
  frostSensitivity?: FrostSensitivity;
  waterDemand?: WaterDemand;
  companions?: string[];
  incompatible?: string[];
  daysToMaturity?: number;
  canopySpreadM?: number;
}

export const PLANT_CATALOG: PlantCatalogEntry[] = [
  // ── Canopy ────────────────────────────────────────────────────────────────
  {
    id: 'black_walnut', latinName: 'Juglans nigra', commonName: 'Black walnut', legacyIds: ['pl-001'],
    layer: 'canopy', matureHeightM: 30, matureWidthM: 18, hardinessZones: [4, 9], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 4, rootPattern: 'tap', ecologicalFunction: ['edible_yield', 'timber', 'wildlife_food'],
    category: 'tree', hardinessRange: [4, 9], drainageSuitability: ['well drained', 'moderately well drained'], maxSlopeDeg: 15, spacingM: { inRow: 12, betweenRow: 15 }, yieldEstimate: { perTreeKg: 30, unit: 'kg nuts' }, frostSensitivity: 'low', waterDemand: 'medium', companions: ['clover'], incompatible: ['apple', 'blueberry', 'currant'], daysToMaturity: 3650, canopySpreadM: 14,
  },
  {
    id: 'american_chestnut', latinName: 'Castanea dentata', commonName: 'American chestnut', legacyIds: ['pl-002'],
    layer: 'canopy', matureHeightM: 25, matureWidthM: 15, hardinessZones: [4, 8], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 3, rootPattern: 'tap', ecologicalFunction: ['edible_yield', 'timber', 'wildlife_food'],
  },
  {
    id: 'hybrid_chestnut', latinName: 'Castanea dentata × mollissima', commonName: 'Hybrid Chestnut',
    category: 'tree', hardinessRange: [4, 8], hardinessZones: [4, 8], drainageSuitability: ['well drained', 'moderately well drained'], maxSlopeDeg: 20, spacingM: { inRow: 9, betweenRow: 12 }, yieldEstimate: { perTreeKg: 25, unit: 'kg nuts' }, frostSensitivity: 'medium', waterDemand: 'medium', companions: ['comfrey', 'clover', 'elderberry'], incompatible: ['black_walnut'], daysToMaturity: 2190, canopySpreadM: 10,
  },
  {
    id: 'white_oak', latinName: 'Quercus alba', commonName: 'White oak', legacyIds: ['pl-003'],
    layer: 'canopy', matureHeightM: 25, matureWidthM: 20, hardinessZones: [3, 9], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 5, rootPattern: 'tap', ecologicalFunction: ['timber', 'wildlife_food'],
  },
  {
    id: 'black_locust', latinName: 'Robinia pseudoacacia', commonName: 'Black locust', legacyIds: ['pl-004'],
    layer: 'canopy', matureHeightM: 20, matureWidthM: 12, hardinessZones: [3, 8], lightNeeds: 'full', waterNeeds: 'low', rootDepthM: 3, rootPattern: 'tap', ecologicalFunction: ['n_fixer', 'timber', 'pollinator'],
  },
  {
    id: 'pecan', latinName: 'Carya illinoinensis', commonName: 'Pecan', legacyIds: ['pl-005'],
    layer: 'canopy', matureHeightM: 25, matureWidthM: 18, hardinessZones: [5, 9], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 4, rootPattern: 'tap', ecologicalFunction: ['edible_yield', 'timber'],
    category: 'tree', hardinessRange: [5, 9], drainageSuitability: ['well drained', 'moderately well drained'], maxSlopeDeg: 10, spacingM: { inRow: 12, betweenRow: 15 }, yieldEstimate: { perTreeKg: 35, unit: 'kg nuts' }, frostSensitivity: 'medium', waterDemand: 'high', companions: ['clover', 'comfrey'], incompatible: [], daysToMaturity: 2555, canopySpreadM: 12,
  },

  // ── Sub-canopy ────────────────────────────────────────────────────────────
  {
    id: 'apple', latinName: 'Malus domestica', commonName: 'Apple', legacyIds: ['pl-101'],
    layer: 'sub_canopy', matureHeightM: 6, matureWidthM: 5, hardinessZones: [3, 8], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 2, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'pollinator'],
    category: 'tree', hardinessRange: [3, 8], drainageSuitability: ['well drained', 'moderately well drained'], maxSlopeDeg: 15, spacingM: { inRow: 5, betweenRow: 7 }, yieldEstimate: { perTreeKg: 70, unit: 'kg fruit' }, frostSensitivity: 'medium', waterDemand: 'medium', companions: ['comfrey', 'clover', 'currant', 'elderberry'], incompatible: ['black_walnut'], daysToMaturity: 1460, canopySpreadM: 6,
  },
  {
    id: 'pear', latinName: 'Pyrus communis', commonName: 'European pear', legacyIds: ['pl-102'],
    layer: 'sub_canopy', matureHeightM: 8, matureWidthM: 5, hardinessZones: [4, 8], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 2, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'pollinator'],
    category: 'tree', hardinessRange: [4, 8], drainageSuitability: ['well drained', 'moderately well drained'], maxSlopeDeg: 15, spacingM: { inRow: 5, betweenRow: 7 }, yieldEstimate: { perTreeKg: 55, unit: 'kg fruit' }, frostSensitivity: 'medium', waterDemand: 'medium', companions: ['comfrey', 'clover', 'grape'], incompatible: ['black_walnut'], daysToMaturity: 1460, canopySpreadM: 6,
  },
  {
    id: 'cherry', latinName: 'Prunus avium', commonName: 'Sweet cherry', legacyIds: ['pl-103'],
    layer: 'sub_canopy', matureHeightM: 10, matureWidthM: 6, hardinessZones: [4, 7], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 2, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'pollinator', 'wildlife_food'],
    category: 'tree', hardinessRange: [5, 8], drainageSuitability: ['well drained'], maxSlopeDeg: 15, spacingM: { inRow: 6, betweenRow: 8 }, yieldEstimate: { perTreeKg: 30, unit: 'kg fruit' }, frostSensitivity: 'high', waterDemand: 'medium', companions: ['comfrey', 'clover'], incompatible: ['black_walnut'], daysToMaturity: 1825, canopySpreadM: 7,
  },
  {
    id: 'pawpaw', latinName: 'Asimina triloba', commonName: 'Pawpaw', legacyIds: ['pl-104'],
    layer: 'sub_canopy', matureHeightM: 8, matureWidthM: 5, hardinessZones: [5, 8], lightNeeds: 'partial', waterNeeds: 'med', rootDepthM: 1.5, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'wildlife_food'],
    category: 'tree', hardinessRange: [5, 9], drainageSuitability: ['well drained', 'moderately well drained'], maxSlopeDeg: 15, spacingM: { inRow: 4, betweenRow: 5 }, yieldEstimate: { perTreeKg: 12, unit: 'kg fruit' }, frostSensitivity: 'medium', waterDemand: 'medium', companions: ['comfrey', 'elderberry'], incompatible: [], daysToMaturity: 2190, canopySpreadM: 5,
  },
  {
    id: 'persimmon', latinName: 'Diospyros virginiana', commonName: 'American persimmon', legacyIds: ['pl-105'],
    layer: 'sub_canopy', matureHeightM: 12, matureWidthM: 6, hardinessZones: [4, 9], lightNeeds: 'full', waterNeeds: 'low', rootDepthM: 3, rootPattern: 'tap', ecologicalFunction: ['edible_yield', 'wildlife_food'],
    category: 'tree', hardinessRange: [4, 9], drainageSuitability: ['well drained', 'moderately well drained', 'somewhat poorly drained'], maxSlopeDeg: 20, spacingM: { inRow: 6, betweenRow: 8 }, yieldEstimate: { perTreeKg: 35, unit: 'kg fruit' }, frostSensitivity: 'low', waterDemand: 'low', companions: ['comfrey', 'clover', 'elderberry'], incompatible: [], daysToMaturity: 2190, canopySpreadM: 8,
  },
  {
    id: 'white_mulberry', latinName: 'Morus alba', commonName: 'White mulberry', legacyIds: ['pl-106'],
    layer: 'sub_canopy', matureHeightM: 10, matureWidthM: 8, hardinessZones: [4, 8], lightNeeds: 'full', waterNeeds: 'low', rootDepthM: 2, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'wildlife_food', 'fodder'],
  },
  {
    id: 'black_alder', latinName: 'Alnus glutinosa', commonName: 'Black alder', legacyIds: ['pl-107'],
    layer: 'sub_canopy', matureHeightM: 15, matureWidthM: 8, hardinessZones: [3, 7], lightNeeds: 'full', waterNeeds: 'high', rootDepthM: 3, rootPattern: 'fibrous', ecologicalFunction: ['n_fixer', 'timber'],
  },
  {
    id: 'russian_olive', latinName: 'Elaeagnus angustifolia', commonName: 'Russian olive', legacyIds: ['pl-108'],
    layer: 'sub_canopy', matureHeightM: 7, matureWidthM: 6, hardinessZones: [3, 7], lightNeeds: 'full', waterNeeds: 'low', rootDepthM: 2, rootPattern: 'fibrous', ecologicalFunction: ['n_fixer', 'wildlife_food'],
  },
  {
    id: 'peach', latinName: 'Prunus persica', commonName: 'Peach',
    category: 'tree', hardinessRange: [5, 9], hardinessZones: [5, 9], drainageSuitability: ['well drained'], maxSlopeDeg: 12, spacingM: { inRow: 5, betweenRow: 6 }, yieldEstimate: { perTreeKg: 45, unit: 'kg fruit' }, frostSensitivity: 'high', waterDemand: 'medium', companions: ['comfrey', 'strawberry', 'clover'], incompatible: ['black_walnut'], daysToMaturity: 1095, canopySpreadM: 5,
  },

  // ── Shrub ─────────────────────────────────────────────────────────────────
  {
    id: 'blueberry', latinName: 'Vaccinium corymbosum', commonName: 'Highbush blueberry', legacyIds: ['pl-201'],
    layer: 'shrub', matureHeightM: 2, matureWidthM: 1.5, hardinessZones: [3, 7], lightNeeds: 'partial', waterNeeds: 'high', rootDepthM: 0.5, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'wildlife_food', 'pollinator'],
    category: 'shrub', hardinessRange: [3, 7], drainageSuitability: ['well drained', 'moderately well drained'], maxSlopeDeg: 15, spacingM: { inRow: 1.5, betweenRow: 3 }, yieldEstimate: { perTreeKg: 4, unit: 'kg berries' }, frostSensitivity: 'medium', waterDemand: 'high', companions: ['strawberry', 'clover'], incompatible: ['black_walnut'], daysToMaturity: 1095, canopySpreadM: 2,
  },
  {
    id: 'currant', latinName: 'Ribes rubrum / nigrum', commonName: 'Red/Black Currant', legacyIds: ['pl-202'],
    layer: 'shrub', matureHeightM: 1.5, matureWidthM: 1.5, hardinessZones: [3, 7], lightNeeds: 'partial', waterNeeds: 'med', rootDepthM: 0.6, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'pollinator'],
    category: 'shrub', hardinessRange: [3, 7], drainageSuitability: ['well drained', 'moderately well drained', 'somewhat poorly drained'], maxSlopeDeg: 15, spacingM: { inRow: 1.5, betweenRow: 2.5 }, yieldEstimate: { perTreeKg: 3, unit: 'kg berries' }, frostSensitivity: 'low', waterDemand: 'medium', companions: ['hazelnut', 'apple', 'comfrey'], incompatible: ['black_walnut'], daysToMaturity: 730, canopySpreadM: 1.5,
  },
  {
    id: 'elderberry', latinName: 'Sambucus canadensis', commonName: 'Elderberry', legacyIds: ['pl-203'],
    layer: 'shrub', matureHeightM: 4, matureWidthM: 3, hardinessZones: [3, 9], lightNeeds: 'partial', waterNeeds: 'high', rootDepthM: 1, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'medicinal', 'wildlife_food', 'pollinator'],
    category: 'shrub', hardinessRange: [3, 9], drainageSuitability: ['well drained', 'moderately well drained', 'somewhat poorly drained'], maxSlopeDeg: 25, spacingM: { inRow: 2, betweenRow: 3 }, yieldEstimate: { perTreeKg: 6, unit: 'kg berries' }, frostSensitivity: 'low', waterDemand: 'medium', companions: ['hybrid_chestnut', 'apple', 'comfrey', 'clover'], incompatible: [], daysToMaturity: 730, canopySpreadM: 3,
  },
  {
    id: 'chokeberry', latinName: 'Aronia melanocarpa', commonName: 'Black chokeberry', legacyIds: ['pl-204'],
    layer: 'shrub', matureHeightM: 2, matureWidthM: 1.5, hardinessZones: [3, 8], lightNeeds: 'partial', waterNeeds: 'med', rootDepthM: 0.6, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'wildlife_food', 'medicinal'],
  },
  {
    id: 'sea_buckthorn', latinName: 'Hippophae rhamnoides', commonName: 'Sea buckthorn', legacyIds: ['pl-205'],
    layer: 'shrub', matureHeightM: 4, matureWidthM: 3, hardinessZones: [3, 7], lightNeeds: 'full', waterNeeds: 'low', rootDepthM: 2, rootPattern: 'fibrous', ecologicalFunction: ['n_fixer', 'edible_yield', 'wildlife_food'],
  },
  {
    id: 'siberian_pea_shrub', latinName: 'Caragana arborescens', commonName: 'Siberian pea shrub', legacyIds: ['pl-206'],
    layer: 'shrub', matureHeightM: 4, matureWidthM: 3, hardinessZones: [2, 7], lightNeeds: 'full', waterNeeds: 'low', rootDepthM: 2, rootPattern: 'tap', ecologicalFunction: ['n_fixer', 'fodder', 'pollinator'],
  },
  {
    id: 'hazelnut', latinName: 'Corylus americana', commonName: 'Hazelnut', legacyIds: ['pl-207'],
    layer: 'shrub', matureHeightM: 5, matureWidthM: 4, hardinessZones: [3, 9], lightNeeds: 'partial', waterNeeds: 'med', rootDepthM: 1.5, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'wildlife_food'],
    category: 'shrub', hardinessRange: [3, 9], drainageSuitability: ['well drained', 'moderately well drained', 'somewhat poorly drained'], maxSlopeDeg: 20, spacingM: { inRow: 3, betweenRow: 5 }, yieldEstimate: { perTreeKg: 4, unit: 'kg nuts' }, frostSensitivity: 'low', waterDemand: 'medium', companions: ['comfrey', 'clover', 'currant'], incompatible: [], daysToMaturity: 1095, canopySpreadM: 4,
  },
  {
    id: 'gooseberry', latinName: 'Ribes uva-crispa', commonName: 'Gooseberry',
    category: 'shrub', hardinessRange: [3, 8], hardinessZones: [3, 8], drainageSuitability: ['well drained', 'moderately well drained'], maxSlopeDeg: 15, spacingM: { inRow: 1.5, betweenRow: 2.5 }, yieldEstimate: { perTreeKg: 4, unit: 'kg berries' }, frostSensitivity: 'low', waterDemand: 'medium', companions: ['comfrey', 'clover'], incompatible: [], daysToMaturity: 730, canopySpreadM: 1.5,
  },

  // ── Herbaceous ────────────────────────────────────────────────────────────
  {
    id: 'comfrey', latinName: 'Symphytum officinale', commonName: 'Comfrey', legacyIds: ['pl-301'],
    layer: 'herbaceous', matureHeightM: 1.2, matureWidthM: 1, hardinessZones: [3, 9], lightNeeds: 'partial', waterNeeds: 'med', rootDepthM: 2.5, rootPattern: 'tap', ecologicalFunction: ['dynamic_accumulator', 'fodder', 'pollinator', 'medicinal'],
    category: 'ground_cover', hardinessRange: [3, 9], drainageSuitability: ['well drained', 'moderately well drained', 'somewhat poorly drained', 'poorly drained'], maxSlopeDeg: 25, spacingM: { inRow: 0.6, betweenRow: 1 }, yieldEstimate: null, frostSensitivity: 'low', waterDemand: 'low', companions: ['hybrid_chestnut', 'apple', 'pear', 'cherry', 'elderberry', 'hazelnut', 'persimmon', 'pawpaw', 'grape', 'gooseberry'], incompatible: [], daysToMaturity: 180, canopySpreadM: 0.6,
  },
  {
    id: 'garlic_chive', latinName: 'Allium tuberosum', commonName: 'Garlic chive', legacyIds: ['pl-302'],
    layer: 'herbaceous', matureHeightM: 0.4, matureWidthM: 0.3, hardinessZones: [4, 9], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 0.3, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'pollinator', 'insectary'],
  },
  {
    id: 'yarrow', latinName: 'Achillea millefolium', commonName: 'Yarrow', legacyIds: ['pl-303'],
    layer: 'herbaceous', matureHeightM: 0.6, matureWidthM: 0.5, hardinessZones: [3, 9], lightNeeds: 'full', waterNeeds: 'low', rootDepthM: 0.5, rootPattern: 'rhizome', ecologicalFunction: ['dynamic_accumulator', 'insectary', 'pollinator', 'medicinal'],
  },
  {
    id: 'echinacea', latinName: 'Echinacea purpurea', commonName: 'Purple coneflower', legacyIds: ['pl-304'],
    layer: 'herbaceous', matureHeightM: 1, matureWidthM: 0.5, hardinessZones: [3, 8], lightNeeds: 'full', waterNeeds: 'low', rootDepthM: 0.5, rootPattern: 'tap', ecologicalFunction: ['pollinator', 'medicinal'],
  },
  {
    id: 'borage', latinName: 'Borago officinalis', commonName: 'Borage', legacyIds: ['pl-305'],
    layer: 'herbaceous', matureHeightM: 0.8, matureWidthM: 0.5, hardinessZones: [4, 10], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 0.6, rootPattern: 'tap', ecologicalFunction: ['pollinator', 'dynamic_accumulator', 'insectary'],
  },
  {
    id: 'asparagus', latinName: 'Asparagus officinalis', commonName: 'Asparagus', legacyIds: ['pl-306'],
    layer: 'herbaceous', matureHeightM: 1.5, matureWidthM: 0.6, hardinessZones: [3, 8], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 1, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield'],
  },

  // ── Ground cover ──────────────────────────────────────────────────────────
  {
    id: 'clover', latinName: 'Trifolium repens', commonName: 'White clover', legacyIds: ['pl-401'],
    layer: 'ground_cover', matureHeightM: 0.2, matureWidthM: 0.5, hardinessZones: [3, 10], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 0.4, rootPattern: 'fibrous', ecologicalFunction: ['n_fixer', 'pollinator', 'fodder'],
    category: 'ground_cover', hardinessRange: [3, 10], drainageSuitability: ['well drained', 'moderately well drained', 'somewhat poorly drained'], maxSlopeDeg: 30, spacingM: { inRow: 0.15, betweenRow: 0.3 }, yieldEstimate: null, frostSensitivity: 'low', waterDemand: 'low', companions: ['hybrid_chestnut', 'apple', 'pear', 'black_walnut', 'hazelnut', 'elderberry', 'grape', 'blueberry'], incompatible: [], daysToMaturity: 90, canopySpreadM: 0.3,
  },
  {
    id: 'strawberry', latinName: 'Fragaria × ananassa', commonName: 'Strawberry', legacyIds: ['pl-402'],
    layer: 'ground_cover', matureHeightM: 0.2, matureWidthM: 0.4, hardinessZones: [4, 9], lightNeeds: 'partial', waterNeeds: 'med', rootDepthM: 0.3, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'pollinator'],
    category: 'ground_cover', hardinessRange: [3, 9], drainageSuitability: ['well drained', 'moderately well drained'], maxSlopeDeg: 10, spacingM: { inRow: 0.3, betweenRow: 1 }, yieldEstimate: { perTreeKg: 0.4, unit: 'kg fruit' }, frostSensitivity: 'medium', waterDemand: 'high', companions: ['blueberry', 'peach', 'comfrey'], incompatible: ['black_walnut'], daysToMaturity: 365, canopySpreadM: 0.4,
  },
  {
    id: 'creeping_thyme', latinName: 'Thymus serpyllum', commonName: 'Creeping thyme', legacyIds: ['pl-403'],
    layer: 'ground_cover', matureHeightM: 0.1, matureWidthM: 0.5, hardinessZones: [4, 9], lightNeeds: 'full', waterNeeds: 'low', rootDepthM: 0.2, rootPattern: 'fibrous', ecologicalFunction: ['pollinator', 'edible_yield', 'medicinal'],
  },
  {
    id: 'bugleweed', latinName: 'Ajuga reptans', commonName: 'Bugleweed', legacyIds: ['pl-404'],
    layer: 'ground_cover', matureHeightM: 0.15, matureWidthM: 0.5, hardinessZones: [3, 9], lightNeeds: 'shade', waterNeeds: 'med', rootDepthM: 0.2, rootPattern: 'rhizome', ecologicalFunction: ['pollinator'],
  },

  // ── Vine ──────────────────────────────────────────────────────────────────
  {
    id: 'grape', latinName: 'Vitis labrusca', commonName: 'Concord grape', legacyIds: ['pl-501'],
    layer: 'vine', matureHeightM: 8, matureWidthM: 4, hardinessZones: [4, 8], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 2, rootPattern: 'tap', ecologicalFunction: ['edible_yield', 'wildlife_food'],
    category: 'vine', hardinessRange: [4, 9], drainageSuitability: ['well drained'], maxSlopeDeg: 20, spacingM: { inRow: 2, betweenRow: 3 }, yieldEstimate: { perTreeKg: 8, unit: 'kg fruit' }, frostSensitivity: 'medium', waterDemand: 'low', companions: ['clover', 'comfrey'], incompatible: ['black_walnut'], daysToMaturity: 1095, canopySpreadM: 2,
  },
  {
    id: 'hardy_kiwi', latinName: 'Actinidia arguta', commonName: 'Hardy kiwi', legacyIds: ['pl-502'],
    layer: 'vine', matureHeightM: 6, matureWidthM: 3, hardinessZones: [4, 8], lightNeeds: 'partial', waterNeeds: 'med', rootDepthM: 1.5, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield'],
    category: 'vine', hardinessRange: [4, 8], drainageSuitability: ['well drained', 'moderately well drained'], maxSlopeDeg: 10, spacingM: { inRow: 3, betweenRow: 5 }, yieldEstimate: { perTreeKg: 20, unit: 'kg fruit' }, frostSensitivity: 'medium', waterDemand: 'medium', companions: ['comfrey'], incompatible: [], daysToMaturity: 1460, canopySpreadM: 4,
  },
  {
    id: 'groundnut', latinName: 'Apios americana', commonName: 'Groundnut', legacyIds: ['pl-503'],
    layer: 'vine', matureHeightM: 3, matureWidthM: 1, hardinessZones: [3, 8], lightNeeds: 'partial', waterNeeds: 'high', rootDepthM: 0.6, rootPattern: 'tap', ecologicalFunction: ['n_fixer', 'edible_yield'],
  },

  // ── Root ──────────────────────────────────────────────────────────────────
  {
    id: 'jerusalem_artichoke', latinName: 'Helianthus tuberosus', commonName: 'Jerusalem artichoke', legacyIds: ['pl-601'],
    layer: 'root', matureHeightM: 2.5, matureWidthM: 0.6, hardinessZones: [3, 9], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 0.8, rootPattern: 'rhizome', ecologicalFunction: ['edible_yield', 'pollinator'],
  },
  {
    id: 'garlic', latinName: 'Allium sativum', commonName: 'Garlic', legacyIds: ['pl-602'],
    layer: 'root', matureHeightM: 0.6, matureWidthM: 0.2, hardinessZones: [3, 9], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 0.3, rootPattern: 'fibrous', ecologicalFunction: ['edible_yield', 'medicinal'],
  },
  {
    id: 'chinese_artichoke', latinName: 'Stachys affinis', commonName: 'Chinese artichoke (crosne)', legacyIds: ['pl-603'],
    layer: 'root', matureHeightM: 0.5, matureWidthM: 0.4, hardinessZones: [5, 9], lightNeeds: 'partial', waterNeeds: 'med', rootDepthM: 0.4, rootPattern: 'rhizome', ecologicalFunction: ['edible_yield'],
  },
  {
    id: 'carrot', latinName: 'Daucus carota', commonName: 'Carrot', legacyIds: ['pl-604'],
    layer: 'root', matureHeightM: 0.4, matureWidthM: 0.2, hardinessZones: [3, 10], lightNeeds: 'full', waterNeeds: 'med', rootDepthM: 0.3, rootPattern: 'tap', ecologicalFunction: ['edible_yield', 'pollinator'],
  },
];

export const CATALOG_BY_ID: Record<string, PlantCatalogEntry> = Object.fromEntries(
  PLANT_CATALOG.map((e) => [e.id, e]),
);

// ── Axis-narrowed views for legacy consumers ─────────────────────────────
// Catalog-A consumers expected layering fields to be present; catalog-B
// consumers expected site-match fields. These predicates + types let the
// shim files surface a strongly-typed subset without rewriting call sites.

export type PlantSpecies = PlantCatalogEntry &
  Required<
    Pick<
      PlantCatalogEntry,
      | 'layer'
      | 'matureHeightM'
      | 'matureWidthM'
      | 'hardinessZones'
      | 'lightNeeds'
      | 'waterNeeds'
      | 'rootDepthM'
      | 'rootPattern'
      | 'ecologicalFunction'
    >
  >;

export type PlantSpeciesInfo = PlantCatalogEntry &
  Required<
    Pick<
      PlantCatalogEntry,
      | 'category'
      | 'hardinessRange'
      | 'drainageSuitability'
      | 'maxSlopeDeg'
      | 'spacingM'
      | 'yieldEstimate'
      | 'frostSensitivity'
      | 'waterDemand'
      | 'companions'
      | 'incompatible'
      | 'daysToMaturity'
      | 'canopySpreadM'
    >
  >;

export function hasLayering(e: PlantCatalogEntry): e is PlantSpecies {
  return (
    e.layer !== undefined &&
    e.matureHeightM !== undefined &&
    e.matureWidthM !== undefined &&
    e.hardinessZones !== undefined &&
    e.lightNeeds !== undefined &&
    e.waterNeeds !== undefined &&
    e.rootDepthM !== undefined &&
    e.rootPattern !== undefined &&
    e.ecologicalFunction !== undefined
  );
}

export function hasGrowing(e: PlantCatalogEntry): e is PlantSpeciesInfo {
  return (
    e.category !== undefined &&
    e.hardinessRange !== undefined &&
    e.drainageSuitability !== undefined &&
    e.maxSlopeDeg !== undefined &&
    e.spacingM !== undefined &&
    e.yieldEstimate !== undefined &&
    e.frostSensitivity !== undefined &&
    e.waterDemand !== undefined &&
    e.companions !== undefined &&
    e.incompatible !== undefined &&
    e.daysToMaturity !== undefined &&
    e.canopySpreadM !== undefined
  );
}

import { resolveSpeciesId } from './plantCatalogAliases.js';

/** Find an entry by canonical or legacy id. Runs the input through `resolveSpeciesId`. */
export function findEntry(id: string): PlantCatalogEntry | undefined {
  return CATALOG_BY_ID[resolveSpeciesId(id)];
}

/** Parse hardiness zone string (e.g. "6a", "5b") to numeric (3-10). */
export function parseHardinessZone(zone: string): number {
  const match = zone.match(/^(\d+)/);
  return match?.[1] ? parseInt(match[1], 10) : 6;
}
