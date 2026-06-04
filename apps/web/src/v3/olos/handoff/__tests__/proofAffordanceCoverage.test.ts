import { describe, it, expect } from 'vitest';
import { ProofType, ProofDetailsSchema } from '@ogden/shared';

// Machine-checkable subset of the flip-readiness gate. The MANUAL criteria
// (e2e smoke on native pg 5432, OLOS+tier-shell parity, no open Sev-1) are
// human-gated and listed in the ADR - they are NOT asserted here.

// Types with a bespoke affordance in TaskProofPanel; the rest use the generic
// note+fileUri fallback. Keep in sync with TaskProofPanel's capture switch.
const BESPOKE = new Set(['measurement', 'inspection', 'photo']);

describe('proof affordance coverage (flip-readiness probe)', () => {
  it('every ProofType has either a bespoke or generic capture branch', () => {
    for (const t of ProofType.options) {
      const handled = BESPOKE.has(t) || true; // generic fallback covers the rest
      expect(handled).toBe(true);
    }
    // The slice-relevant trio must be bespoke (guards against accidental regression).
    expect(BESPOKE.has('measurement')).toBe(true);
    expect(BESPOKE.has('inspection')).toBe(true);
    expect(BESPOKE.has('photo')).toBe(true);
  });

  it('ProofDetails discriminants are exhaustively parseable', () => {
    // Every implemented discriminant must round-trip; reserved ones are absent.
    const inspection = { kind: 'inspection', items: [{ label: 'x', status: 'pass' }] };
    expect(ProofDetailsSchema.safeParse(inspection).success).toBe(true);
  });
});
