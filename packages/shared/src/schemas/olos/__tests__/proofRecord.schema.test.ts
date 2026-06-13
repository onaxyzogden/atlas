import { describe, it, expect } from 'vitest';
import {
  ProofRecordSchema,
  ProofDetailsSchema,
  ProofSignatorySchema,
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

  // -- signature variant (R1 / F1) -------------------------------------------

  it('accepts a valid signature details union', () => {
    const details = {
      kind: 'signature' as const,
      signerName: 'Layla Haddad',
      signerRole: 'independent verifier',
      attestation: 'I verified the habitability thresholds were met.',
      signedAt: new Date().toISOString(),
    };
    expect(ProofDetailsSchema.safeParse(details).success).toBe(true);
    expect(parseProofDetails(details)).toEqual(details);
  });

  it('accepts a signature WITHOUT signerRole (role optional)', () => {
    const details = {
      kind: 'signature' as const,
      signerName: 'Anon Signer',
      attestation: 'Agreed.',
      signedAt: new Date().toISOString(),
    };
    expect(ProofDetailsSchema.safeParse(details).success).toBe(true);
  });

  it('rejects a signature with an empty signerName', () => {
    const bad = {
      kind: 'signature',
      signerName: '',
      attestation: 'Agreed.',
      signedAt: new Date().toISOString(),
    };
    expect(ProofDetailsSchema.safeParse(bad).success).toBe(false);
    expect(parseProofDetails(bad)).toBeNull();
  });

  it('rejects a signature with a non-datetime signedAt (no fabricated timestamps)', () => {
    const bad = {
      kind: 'signature',
      signerName: 'X',
      attestation: 'Agreed.',
      signedAt: 'yesterday',
    };
    expect(ProofDetailsSchema.safeParse(bad).success).toBe(false);
  });

  it('ProofRecord parses with proofType "signature" + signature details', () => {
    const rec = {
      ...base,
      proofType: 'signature' as const,
      details: {
        kind: 'signature' as const,
        signerName: 'Layla Haddad',
        attestation: 'I verified the habitability thresholds were met.',
        signedAt: new Date().toISOString(),
      },
    };
    expect(ProofRecordSchema.safeParse(rec).success).toBe(true);
  });

  // -- test variant (R1) ------------------------------------------------------

  it('accepts a valid test details union (value + verdict)', () => {
    const details = {
      kind: 'test' as const,
      value: 6.8,
      unit: 'pH',
      passed: true,
      method: 'colorimetric strip',
    };
    expect(ProofDetailsSchema.safeParse(details).success).toBe(true);
    expect(parseProofDetails(details)).toEqual(details);
  });

  it('rejects a test missing its pass/fail verdict', () => {
    const bad = { kind: 'test', value: 6.8 };
    expect(ProofDetailsSchema.safeParse(bad).success).toBe(false);
  });
});

// -- ProofSignatory: shared attestation shape (System-2 sign-offs) -----------

describe('ProofSignatory', () => {
  it('accepts a fully-specified signatory', () => {
    const sig = {
      signerName: 'Layla Haddad',
      signerRole: 'independent',
      attestation: 'Self-certification was not relied upon.',
      signedAt: new Date().toISOString(),
    };
    expect(ProofSignatorySchema.safeParse(sig).success).toBe(true);
  });

  it('requires a non-empty signerName, attestation, and datetime signedAt', () => {
    const iso = new Date().toISOString();
    expect(ProofSignatorySchema.safeParse({ signerName: '', attestation: 'x', signedAt: iso }).success).toBe(false);
    expect(ProofSignatorySchema.safeParse({ signerName: 'x', attestation: '', signedAt: iso }).success).toBe(false);
    expect(ProofSignatorySchema.safeParse({ signerName: 'x', attestation: 'y', signedAt: 'nope' }).success).toBe(false);
  });
});
