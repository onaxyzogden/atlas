import { describe, it, expect } from 'vitest';
import {
  VerificationRecordSchema,
  VerifierRole,
} from '../verificationRecord.schema.js';

const base = {
  id: 'ver-1',
  projectId: 'p1',
  taskId: 't1',
  outcome: 'pass' as const,
  verifiedAt: new Date().toISOString(),
};

describe('VerifierRole', () => {
  it('enumerates self + the third-party roles', () => {
    expect(VerifierRole.options).toEqual([
      'self',
      'peer',
      'steward',
      'external-adviser',
      'independent',
    ]);
  });

  it('rejects an unknown role', () => {
    expect(VerifierRole.safeParse('arriving-household').success).toBe(false);
  });
});

describe('VerificationRecord', () => {
  it('parses WITHOUT verifierRole (back-compat / unspecified)', () => {
    expect(VerificationRecordSchema.safeParse(base).success).toBe(true);
  });

  it('parses WITH a third-party verifierRole', () => {
    const rec = { ...base, verifierId: 'u9', verifierRole: 'independent' as const };
    expect(VerificationRecordSchema.safeParse(rec).success).toBe(true);
  });

  it('rejects an invalid verifierRole', () => {
    const bad = { ...base, verifierRole: 'arriving-household' };
    expect(VerificationRecordSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts an explicit 'self' certification (distinct from a third-party role)", () => {
    const rec = { ...base, verifierRole: 'self' as const };
    expect(VerificationRecordSchema.safeParse(rec).success).toBe(true);
  });
});
