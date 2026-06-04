import { describe, it, expect } from 'vitest';
import {
  ProofRecordSchema,
  ProofDetailsSchema,
  parseProofDetails,
} from '../proofRecord.schema.js';

const base = {
  id: 'proof-1',
  projectId: 'p1',
  taskId: 't1',
  proofType: 'inspection' as const,
  capturedAt: new Date().toISOString(),
  verificationStatus: 'pending' as const,
};

describe('ProofDetails', () => {
  it('accepts a valid inspection details union', () => {
    const details = {
      kind: 'inspection' as const,
      items: [
        { label: 'Mulch depth >= 4in', status: 'pass' as const },
        { label: 'No bare soil', status: 'fail' as const, note: 'SE corner' },
      ],
    };
    expect(ProofDetailsSchema.safeParse(details).success).toBe(true);
    expect(parseProofDetails(details)).toEqual(details);
  });

  it('returns null from parseProofDetails for an unknown shape', () => {
    expect(parseProofDetails({ kind: 'nope' })).toBeNull();
    expect(parseProofDetails(null)).toBeNull();
    expect(parseProofDetails(undefined)).toBeNull();
  });

  it('rejects an inspection item with an invalid status', () => {
    const bad = { kind: 'inspection', items: [{ label: 'x', status: 'maybe' }] };
    expect(ProofDetailsSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an inspection with an empty items array', () => {
    const empty = { kind: 'inspection', items: [] };
    expect(ProofDetailsSchema.safeParse(empty).success).toBe(false);
    expect(parseProofDetails(empty)).toBeNull();
  });

  it('ProofRecord parses WITH details', () => {
    const rec = {
      ...base,
      details: { kind: 'inspection', items: [{ label: 'x', status: 'na' }] },
    };
    expect(ProofRecordSchema.safeParse(rec).success).toBe(true);
  });

  it('ProofRecord parses WITHOUT details (back-compat)', () => {
    expect(ProofRecordSchema.safeParse(base).success).toBe(true);
  });
});
