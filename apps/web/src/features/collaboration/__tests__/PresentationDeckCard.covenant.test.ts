/**
 * PresentationDeckCard — financial covenant guard.
 *
 * The meeting deck must present cost-recovery TIMING and downside exposure
 * only — never a return-on-investment figure (framing the land as a
 * yield-on-capital vehicle is the framing the financial covenant strips). The
 * raw engine `BreakEvenResult` still carries `tenYearROI` for internal
 * mission-scoring, so the deck routes every break-even read through
 * `deckCostRecovery`, which drops it. This test pins that projection so the ROI
 * field can never reappear on the slide path — the deck-level mirror of
 * computeProjectBreakEven.test.ts "never exposes tenYearROI".
 */

import { describe, it, expect } from 'vitest';
import { deckCostRecovery } from '../PresentationDeckCard.js';
import type { BreakEvenResult } from '../../financial/engine/types.js';

const RAW: BreakEvenResult = {
  breakEvenYear: { low: 5, mid: 7, high: 9 },
  tenYearROI: { low: 0.1, mid: 0.2, high: 0.35 },
  peakNegativeCashflow: { low: -90_000, mid: -120_000, high: -150_000 },
};

describe('deckCostRecovery — financial covenant projection', () => {
  it('never carries tenYearROI on its return shape (covenant: cost-recovery only)', () => {
    const projected = deckCostRecovery(RAW);
    expect('tenYearROI' in projected).toBe(false);
    expect(Object.keys(projected).sort()).toEqual(
      ['breakEvenYear', 'peakNegativeCashflow'].sort(),
    );
  });

  it('passes break-even timing and downside exposure through verbatim', () => {
    const projected = deckCostRecovery(RAW);
    expect(projected.breakEvenYear).toEqual(RAW.breakEvenYear);
    expect(projected.peakNegativeCashflow).toEqual(RAW.peakNegativeCashflow);
  });
});
