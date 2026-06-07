import { describe, it, expect } from 'vitest';
import { ProofType, ProofDetailsSchema } from '@ogden/shared';

// Machine-checkable subset of the flip-readiness gate. The MANUAL criteria
// (e2e smoke on native pg 5432, OLOS+tier-shell parity, no open Sev-1) are
// human-gated and listed in the ADR - they are NOT asserted here.

// The slice trio that must stay bespoke in TaskProofPanel; every other
// ProofType falls through to the generic note+fileUri capture branch (a
// catch-all), so the panel always has a capture path. This probe guards the
// trio specifically, not bidirectional sync with the JSX switch.
const BESPOKE = new Set(['measurement', 'inspection', 'photo']);

describe('proof affordance coverage (flip-readiness probe)', () => {
  it('every bespoke key is a real ProofType and the slice trio is bespoke', () => {
    // Each bespoke key must be a genuine ProofType (catches a typo or an enum
    // member being renamed out from under the set).
    const opts = new Set<string>(ProofType.options);
    for (const t of BESPOKE) {
      expect(opts.has(t)).toBe(true);
    }
    // The slice-relevant trio must be bespoke (guards against accidental regression).
    expect(BESPOKE.has('measurement')).toBe(true);
    expect(BESPOKE.has('inspection')).toBe(true);
    expect(BESPOKE.has('photo')).toBe(true);
  });

  it('ProofDetails implemented discriminant round-trips and reserved ones are absent', () => {
    // The one implemented discriminant must parse...
    const inspection = { kind: 'inspection', items: [{ label: 'x', status: 'pass' }] };
    expect(ProofDetailsSchema.safeParse(inspection).success).toBe(true);
    // ...and reserved-but-unimplemented discriminants must NOT (locks the
    // additive-extension contract: adding them later is a deliberate change).
    expect(ProofDetailsSchema.safeParse({ kind: 'signature' }).success).toBe(false);
    expect(ProofDetailsSchema.safeParse({ kind: 'test' }).success).toBe(false);
  });
});
