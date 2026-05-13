import { describe, it, expect } from 'vitest';
import { canAdvanceToReadyForReview } from '../relationships/statusGate.js';
import type { Edge, PlacedEntity } from '../relationships/types.js';

// poultry catalog row: outputs ['manure', 'pest_predation'],
// inputs ['forage', 'surface_water'].
const poultry: PlacedEntity = { id: 'p1', type: 'poultry' };
// compost_station catalog row: outputs ['compost', 'heat'],
// inputs ['manure', 'biomass'].
const compostStation: PlacedEntity = { id: 'c1', type: 'compost_station' };

describe('canAdvanceToReadyForReview', () => {
  it('blocks advancement when orphan outputs exist and override is off', () => {
    const result = canAdvanceToReadyForReview([], [poultry], false);
    expect(result.ok).toBe(false);
    expect(result.orphanCount).toBe(2);
    expect(result.reason).toBe('2 unrouted outputs');
  });

  it('allows advancement when allowOrphanOutputs is true even with orphans', () => {
    const result = canAdvanceToReadyForReview([], [poultry], true);
    expect(result.ok).toBe(true);
    expect(result.orphanCount).toBe(2);
  });

  it('allows advancement when no entities are placed (vacuous)', () => {
    const result = canAdvanceToReadyForReview([], [], false);
    expect(result.ok).toBe(true);
    expect(result.orphanCount).toBe(0);
    expect(result.unmetCount).toBe(0);
  });

  it('allows advancement when every output is routed', () => {
    // Poultry routes manure → compost_station; pest_predation → compost_station
    // (catalog inputs accept manure but not pest_predation; we still
    // construct an edge to demonstrate routed coverage — the validator
    // counts routed `${fromId}::${fromOutput}` regardless of input legality
    // since EdgeSchema-level validation is upstream).
    const edges: Edge[] = [
      { fromId: 'p1', fromOutput: 'manure', toId: 'c1', toInput: 'manure' },
      { fromId: 'p1', fromOutput: 'pest_predation', toId: 'c1', toInput: 'manure' },
      { fromId: 'c1', fromOutput: 'compost', toId: 'p1', toInput: 'forage' },
      { fromId: 'c1', fromOutput: 'heat', toId: 'p1', toInput: 'forage' },
    ];
    const entities: PlacedEntity[] = [poultry, compostStation];
    const result = canAdvanceToReadyForReview(edges, entities, false);
    expect(result.ok).toBe(true);
    expect(result.orphanCount).toBe(0);
  });
});
