/**
 * @ogden/shared/relationships — Phase 1 conformance tests.
 *
 * Covers: ResourceType enum membership, EdgeSchema validation, catalog
 * exhaustiveness across the four entity-type enums, cycle algorithms,
 * and the integrationScoreFromEdges contract.
 */

import { describe, it, expect } from 'vitest';
import {
  RESOURCE_TYPES,
  EdgeSchema,
  type ResourceType,
  type Edge,
} from '../relationships/types.js';
import {
  OUTPUTS_BY_TYPE,
  INPUTS_BY_TYPE,
  type EntityType,
} from '../relationships/catalog.js';
import {
  orphanOutputs,
  unmetInputs,
  closedLoops,
  integrationScoreFromEdges,
} from '../relationships/cycle.js';

import type { StructureType } from '../demand/structureDemand.js';
import type { UtilityType } from '../demand/utilityDemand.js';
import type { CropAreaType } from '../demand/cropDemand.js';
import type { LivestockSpecies } from '../demand/livestockDemand.js';

const STRUCTURE_TYPES: StructureType[] = [
  'cabin', 'yurt', 'pavilion', 'greenhouse', 'barn', 'workshop',
  'prayer_space', 'bathhouse', 'classroom', 'storage', 'animal_shelter',
  'compost_station', 'water_pump_house', 'tent_glamping', 'fire_circle',
  'lookout', 'earthship', 'solar_array', 'well', 'water_tank',
];
const UTILITY_TYPES: UtilityType[] = [
  'solar_panel', 'battery_room', 'generator', 'water_tank', 'well_pump',
  'greywater', 'septic', 'rain_catchment', 'lighting', 'firewood_storage',
  'waste_sorting', 'compost', 'biochar', 'tool_storage', 'laundry_station',
];
const CROP_AREA_TYPES: CropAreaType[] = [
  'orchard', 'row_crop', 'garden_bed', 'food_forest', 'windbreak',
  'shelterbelt', 'silvopasture', 'nursery', 'market_garden', 'pollinator_strip',
];
const LIVESTOCK_SPECIES: LivestockSpecies[] = [
  'sheep', 'cattle', 'goats', 'poultry', 'pigs', 'horses',
  'ducks_geese', 'rabbits', 'bees',
];
const ALL_ENTITY_TYPES: EntityType[] = [
  ...STRUCTURE_TYPES,
  ...UTILITY_TYPES,
  ...CROP_AREA_TYPES,
  ...LIVESTOCK_SPECIES,
];

describe('ResourceType enum', () => {
  it('exposes the 13 Phase-1 resource flows', () => {
    expect(RESOURCE_TYPES).toHaveLength(13);
    const expected: ResourceType[] = [
      'manure', 'greywater', 'compost', 'biomass', 'seed', 'forage',
      'mulch', 'heat', 'shade', 'pollination', 'pest_predation',
      'nutrient_uptake', 'surface_water',
    ];
    for (const r of expected) expect(RESOURCE_TYPES).toContain(r);
  });

  it('has unique values', () => {
    expect(new Set(RESOURCE_TYPES).size).toBe(RESOURCE_TYPES.length);
  });
});

describe('EdgeSchema', () => {
  it('accepts a well-formed edge', () => {
    const edge: Edge = {
      fromId: 'chicken-coop-1',
      fromOutput: 'manure',
      toId: 'orchard-1',
      toInput: 'manure',
    };
    expect(() => EdgeSchema.parse(edge)).not.toThrow();
  });

  it('accepts an optional ratio', () => {
    const edge = {
      fromId: 'a', fromOutput: 'manure', toId: 'b', toInput: 'manure',
      ratio: 0.5,
    };
    expect(() => EdgeSchema.parse(edge)).not.toThrow();
  });

  it('rejects an unknown ResourceType', () => {
    const edge = {
      fromId: 'a', fromOutput: 'plutonium', toId: 'b', toInput: 'manure',
    };
    expect(() => EdgeSchema.parse(edge)).toThrow();
  });

  it('rejects empty entity ids', () => {
    expect(() =>
      EdgeSchema.parse({ fromId: '', fromOutput: 'manure', toId: 'b', toInput: 'manure' }),
    ).toThrow();
  });

  it('rejects ratio outside [0, 1]', () => {
    expect(() =>
      EdgeSchema.parse({
        fromId: 'a', fromOutput: 'manure', toId: 'b', toInput: 'manure', ratio: 1.5,
      }),
    ).toThrow();
  });
});

describe('catalog exhaustiveness', () => {
  it('OUTPUTS_BY_TYPE has an entry for every entity type', () => {
    for (const t of ALL_ENTITY_TYPES) {
      expect(OUTPUTS_BY_TYPE[t]).toBeDefined();
    }
  });

  it('INPUTS_BY_TYPE has an entry for every entity type', () => {
    for (const t of ALL_ENTITY_TYPES) {
      expect(INPUTS_BY_TYPE[t]).toBeDefined();
    }
  });

  it('every output in the catalog is a valid ResourceType', () => {
    for (const t of ALL_ENTITY_TYPES) {
      for (const r of OUTPUTS_BY_TYPE[t]) {
        expect(RESOURCE_TYPES).toContain(r);
      }
    }
  });

  it('every input in the catalog is a valid ResourceType', () => {
    for (const t of ALL_ENTITY_TYPES) {
      for (const r of INPUTS_BY_TYPE[t]) {
        expect(RESOURCE_TYPES).toContain(r);
      }
    }
  });

  it('seeds the canonical chicken outputs', () => {
    expect(OUTPUTS_BY_TYPE.poultry).toContain('manure');
    expect(OUTPUTS_BY_TYPE.poultry).toContain('pest_predation');
  });

  it('seeds the canonical orchard inputs/outputs', () => {
    expect(INPUTS_BY_TYPE.orchard).toContain('pollination');
    expect(OUTPUTS_BY_TYPE.orchard).toContain('biomass');
  });

  it('seeds the canonical compost flow', () => {
    expect(INPUTS_BY_TYPE.compost_station).toContain('manure');
    expect(OUTPUTS_BY_TYPE.compost_station).toContain('compost');
  });

  it('passive structures with no biological flows declare empty arrays', () => {
    expect(OUTPUTS_BY_TYPE.lookout).toEqual([]);
    expect(INPUTS_BY_TYPE.lookout).toEqual([]);
  });
});

describe('cycle algorithms', () => {
  // Three placed entities used across the worked-example tests
  const placed = [
    { id: 'chicken-1', type: 'poultry' as EntityType },
    { id: 'orchard-1', type: 'orchard' as EntityType },
    { id: 'compost-1', type: 'compost_station' as EntityType },
  ];

  it('orphanOutputs identifies an unrouted output', () => {
    const edges: Edge[] = [];
    const orphans = orphanOutputs(placed, edges);
    // Chicken produces manure + pest_predation; orchard produces biomass; compost produces compost
    expect(orphans.length).toBeGreaterThan(0);
    expect(orphans.some(o => o.fromId === 'chicken-1' && o.fromOutput === 'manure')).toBe(true);
  });

  it('orphanOutputs returns empty when every output is routed', () => {
    // Every output of every placed entity must be covered. Build edges programmatically.
    const edges: Edge[] = [];
    for (const p of placed) {
      for (const out of OUTPUTS_BY_TYPE[p.type]) {
        edges.push({ fromId: p.id, fromOutput: out, toId: 'sink', toInput: out });
      }
    }
    expect(orphanOutputs(placed, edges)).toEqual([]);
  });

  it('unmetInputs identifies an input with no source', () => {
    const edges: Edge[] = [];
    const unmet = unmetInputs(placed, edges);
    // Orchard needs pollination, mulch, manure — none routed
    expect(unmet.some(u => u.toId === 'orchard-1' && u.toInput === 'pollination')).toBe(true);
  });

  it('closedLoops detects a chicken→orchard→compost→chicken loop', () => {
    const edges: Edge[] = [
      { fromId: 'chicken-1', fromOutput: 'manure', toId: 'orchard-1', toInput: 'manure' },
      { fromId: 'orchard-1', fromOutput: 'biomass', toId: 'compost-1', toInput: 'biomass' },
      { fromId: 'compost-1', fromOutput: 'compost', toId: 'chicken-1', toInput: 'compost' },
    ];
    const loops = closedLoops(placed, edges);
    expect(loops.length).toBeGreaterThanOrEqual(1);
    expect(loops[0]).toContain('chicken-1');
  });

  it('integrationScoreFromEdges returns 0 when nothing is routed', () => {
    expect(integrationScoreFromEdges(placed, [])).toBe(0);
  });

  it('integrationScoreFromEdges returns ~0.5 when half of outputs routed', () => {
    // Chicken: manure + pest_predation = 2 outputs
    // Orchard: biomass + seed = 2 outputs
    // Compost: compost + heat = 2 outputs
    // Total = 6 outputs. Route 3 → 0.5.
    const edges: Edge[] = [
      { fromId: 'chicken-1', fromOutput: 'manure', toId: 'orchard-1', toInput: 'manure' },
      { fromId: 'orchard-1', fromOutput: 'biomass', toId: 'compost-1', toInput: 'biomass' },
      { fromId: 'compost-1', fromOutput: 'compost', toId: 'orchard-1', toInput: 'compost' },
    ];
    expect(integrationScoreFromEdges(placed, edges)).toBeCloseTo(0.5, 2);
  });

  it('integrationScoreFromEdges returns 1.0 when all outputs routed', () => {
    const edges: Edge[] = [];
    for (const p of placed) {
      for (const out of OUTPUTS_BY_TYPE[p.type]) {
        edges.push({ fromId: p.id, fromOutput: out, toId: 'sink', toInput: out });
      }
    }
    expect(integrationScoreFromEdges(placed, edges)).toBe(1);
  });

  it('integrationScoreFromEdges ignores entities with empty outputs', () => {
    const lookoutOnly = [{ id: 'lookout-1', type: 'lookout' as EntityType }];
    // No outputs at all → score is undefined-by-zero. Convention: return 1.0
    // (vacuously all outputs are routed) — see cycle.ts contract.
    expect(integrationScoreFromEdges(lookoutOnly, [])).toBe(1);
  });
});
