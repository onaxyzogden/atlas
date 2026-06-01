// asBuiltDiff.test.ts
//
// Covers the as-built deviation substrate added to dataPoint.schema.ts:
//   - ObserveDataPoint.sourceFeatureRef parses + defaults to null
//   - AsBuiltDiff (attribute | geometry) round-trips
//   - asAsBuiltDiff() is a safe guard that returns null for other shapes

import { describe, it, expect } from 'vitest';
import {
  ObserveDataPointSchema,
  ObserveSourceFeatureRefSchema,
  AsBuiltDiffSchema,
  asAsBuiltDiff,
} from '../dataPoint.schema.js';

function basePoint() {
  return {
    id: 'dp-1',
    projectId: 'proj-1',
    domainId: 'plants-food' as const,
    sourceType: 'divergence_evidence' as const,
    statusOutput: 'needs_investigation' as const,
    capturedAt: '2026-05-31T12:00:00.000Z',
    capturedBy: 'tester',
  };
}

describe('ObserveDataPoint.sourceFeatureRef', () => {
  it('defaults to null when absent', () => {
    const parsed = ObserveDataPointSchema.parse(basePoint());
    expect(parsed.sourceFeatureRef).toBeNull();
  });

  it('parses a feature reference', () => {
    const parsed = ObserveDataPointSchema.parse({
      ...basePoint(),
      sourceFeatureRef: { kind: 'cropArea', id: 'crop-7' },
    });
    expect(parsed.sourceFeatureRef).toEqual({ kind: 'cropArea', id: 'crop-7' });
  });

  it('rejects an unknown feature kind', () => {
    const result = ObserveSourceFeatureRefSchema.safeParse({
      kind: 'pond',
      id: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty feature id', () => {
    const result = ObserveSourceFeatureRefSchema.safeParse({
      kind: 'zone',
      id: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('AsBuiltDiffSchema', () => {
  it('round-trips an attribute diff', () => {
    const diff = {
      kind: 'attribute' as const,
      field: 'name',
      label: 'Name',
      asPlanned: 'North Block',
      asBuilt: 'North Field',
    };
    expect(AsBuiltDiffSchema.parse(diff)).toEqual(diff);
  });

  it('round-trips a geometry diff', () => {
    const diff = {
      kind: 'geometry' as const,
      field: 'geometry' as const,
      asPlanned: { areaM2: 1000 },
      asBuilt: { areaM2: 1180, note: 'fence moved east' },
    };
    expect(AsBuiltDiffSchema.parse(diff)).toEqual(diff);
  });

  it('rejects an attribute diff with an empty field', () => {
    const result = AsBuiltDiffSchema.safeParse({
      kind: 'attribute',
      field: '',
      asPlanned: 1,
      asBuilt: 2,
    });
    expect(result.success).toBe(false);
  });
});

describe('asAsBuiltDiff', () => {
  it('returns the diff for a valid attribute payload', () => {
    const diff = {
      kind: 'attribute' as const,
      field: 'species',
      asPlanned: ['apple'],
      asBuilt: ['pear'],
    };
    expect(asAsBuiltDiff(diff)).toEqual(diff);
  });

  it('returns null for the manual-note measurement shape', () => {
    expect(asAsBuiltDiff({ label: 'Articulate vision', note: 'done' })).toBeNull();
  });

  it('returns null for null / primitives', () => {
    expect(asAsBuiltDiff(null)).toBeNull();
    expect(asAsBuiltDiff(42)).toBeNull();
    expect(asAsBuiltDiff('attribute')).toBeNull();
  });
});
