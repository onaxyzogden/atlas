/**
 * tooltipStrings — formatter unit tests for the Slice N extraction.
 *
 * Pins the formatter contracts so a future i18n migration (path 1 in
 * the module header) can swap the implementation without changing
 * call-site behaviour. The string-constant exports themselves don't
 * need tests — they're referenced from the tooltip component and
 * indirectly covered by the rendering tests in
 * HostCanopyUnionTooltip.test.tsx.
 */

import { describe, it, expect } from 'vitest';
import {
  formatAreaM2,
  formatHostCounts,
} from '../tooltipStrings.js';

describe('formatAreaM2', () => {
  it('rounds to the nearest integer and appends m²', () => {
    expect(formatAreaM2(142.7)).toBe('143 m²');
    expect(formatAreaM2(187.4)).toBe('187 m²');
    expect(formatAreaM2(0)).toBe('0 m²');
  });

  it('handles tiny positive fractions (rounds toward 0)', () => {
    expect(formatAreaM2(0.49)).toBe('0 m²');
  });
});

describe('formatHostCounts', () => {
  it('pluralizes guilds and members independently in English', () => {
    expect(formatHostCounts(3, 7)).toBe(
      '3 guilds · 7 canopy-bearing members',
    );
  });

  it('uses singular forms when counts equal 1', () => {
    expect(formatHostCounts(1, 1)).toBe(
      '1 guild · 1 canopy-bearing member',
    );
  });

  it('mixes singular guild with plural members', () => {
    expect(formatHostCounts(1, 4)).toBe(
      '1 guild · 4 canopy-bearing members',
    );
  });

  it('treats zero as plural (English convention)', () => {
    expect(formatHostCounts(0, 0)).toBe(
      '0 guilds · 0 canopy-bearing members',
    );
  });
});
