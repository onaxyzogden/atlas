// lensMeasurement.test.ts
//
// Phase 1 invariant gate for the lens-measurement binding contract:
//  - every MeasurementVizField has exactly one payload schema;
//  - each vizField's lens partition agrees with the canonical DOMAIN_TO_LENS
//    grouping (a soil capture can never address the water chart);
//  - parseLensMeasurement is a true safe-read (typed row | null, never throws);
//  - MeasurementBindingSchema validates a well-formed binding and rejects junk.

import { describe, it, expect } from 'vitest';
import {
  MeasurementVizField,
  VIZ_FIELD_PAYLOAD,
  MeasurementBindingSchema,
  parseLensMeasurement,
  type MeasurementVizField as MeasurementVizFieldT,
} from '../lensMeasurement.schema.js';
import {
  getLensForDomain,
  type ObserveLensId,
} from '../../../constants/observe/lenses.js';
import type { UniversalDomain } from '../../universalDomain.schema.js';

// A representative domain whose lens must own each vizField. The contract is
// correct only if every viz field lands in the lens that groups its domain.
const VIZ_FIELD_DOMAIN: Record<MeasurementVizFieldT, UniversalDomain> = {
  'water.infiltrationData': 'hydrology',
  'water.sources': 'hydrology',
  'soil.phData': 'soil',
  'topography.elevationZones': 'topography',
  'topography.slopeBreakdown': 'topography',
  'climate.windRose': 'climate',
  'climate.microclimates': 'climate',
  'human.capacityBars': 'people-governance',
  'human.consentItems': 'risk-compliance',
  'infrastructure.suggestedTasks': 'built-infrastructure',
};

const ALL_VIZ_FIELDS = MeasurementVizField.options;

describe('lensMeasurement contract', () => {
  it('every vizField has exactly one payload schema', () => {
    const payloadKeys = Object.keys(VIZ_FIELD_PAYLOAD).sort();
    const enumKeys = [...ALL_VIZ_FIELDS].sort();
    expect(payloadKeys).toEqual(enumKeys);
    for (const field of ALL_VIZ_FIELDS) {
      expect(VIZ_FIELD_PAYLOAD[field]).toBeDefined();
    }
  });

  it('every vizField is covered by the domain-partition map', () => {
    const mapKeys = Object.keys(VIZ_FIELD_DOMAIN).sort();
    expect(mapKeys).toEqual([...ALL_VIZ_FIELDS].sort());
  });

  it('each vizField lens partition agrees with DOMAIN_TO_LENS', () => {
    // The lens prefix carried by each vizField name must equal the canonical
    // lens of its representative domain.
    const PREFIX_TO_LENS: Record<string, ObserveLensId> = {
      water: 'water',
      soil: 'living',
      topography: 'foundation',
      climate: 'climate',
      human: 'human',
      infrastructure: 'infrastructure',
    };
    for (const field of ALL_VIZ_FIELDS) {
      const prefix = field.split('.')[0]!;
      const expectedLens = PREFIX_TO_LENS[prefix];
      expect(expectedLens, `prefix ${prefix} mapped`).toBeDefined();
      expect(getLensForDomain(VIZ_FIELD_DOMAIN[field])).toBe(expectedLens);
    }
  });
});

describe('parseLensMeasurement', () => {
  it('returns a typed row for a valid soil payload', () => {
    const row = parseLensMeasurement('soil.phData', {
      zone: 'North paddock',
      ph: 6.4,
      om: 3.1,
      compaction: 'moderate',
    });
    expect(row).not.toBeNull();
    expect(row).toMatchObject({ zone: 'North paddock', ph: 6.4 });
  });

  it('accepts a partial soil row (pH only) -- om/compaction optional', () => {
    const row = parseLensMeasurement('soil.phData', { zone: 'Swale', ph: 7 });
    expect(row).not.toBeNull();
    expect(row).toMatchObject({ zone: 'Swale', ph: 7 });
  });

  it('returns null for an out-of-range value', () => {
    expect(parseLensMeasurement('soil.phData', { zone: 'X', ph: 99 })).toBeNull();
  });

  it('returns null for a shape that belongs to another vizField', () => {
    // A wind observation handed to the soil field must not validate.
    expect(
      parseLensMeasurement('soil.phData', { dir: 'N', speedMs: 4 }),
    ).toBeNull();
  });

  it('aggregating fields parse their own row (wind observation)', () => {
    const row = parseLensMeasurement('climate.windRose', {
      dir: 'NW',
      speedMs: 5.5,
    });
    expect(row).toMatchObject({ dir: 'NW', speedMs: 5.5 });
  });
});

describe('MeasurementBindingSchema', () => {
  it('validates a well-formed binding', () => {
    const parsed = MeasurementBindingSchema.safeParse({
      lens: 'living',
      vizField: 'soil.phData',
      zoneKey: 'north',
      order: 1,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an unknown lens', () => {
    const parsed = MeasurementBindingSchema.safeParse({
      lens: 'aquatics',
      vizField: 'soil.phData',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects an unknown vizField', () => {
    const parsed = MeasurementBindingSchema.safeParse({
      lens: 'living',
      vizField: 'soil.notARealField',
    });
    expect(parsed.success).toBe(false);
  });
});
