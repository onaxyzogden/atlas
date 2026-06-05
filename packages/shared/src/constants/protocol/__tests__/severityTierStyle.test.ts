// severityTierStyle.test.ts
//
// Pins the tier colour + icon table to the exact values in the OLOS Protocol
// Trigger Recognition UX Spec v1.1 (Section 3.1). These are literal hexes and
// Unicode glyphs (NOT spine CSS-vars): the spec mandates fixed, theme-
// independent colours so Stop and Abundance stay maximally distinct in any
// lighting. Glyphs are \uXXXX escapes to keep the source ASCII-only and immune
// to cp1252/UTF-8 round-tripping on Windows.

import { describe, it, expect } from 'vitest';
import { TIER_VISUAL, PENDING_VISUAL } from '../severityTierStyle.js';

describe('TIER_VISUAL', () => {
  it('pins the spec hexes and Unicode glyphs for each tier', () => {
    expect(TIER_VISUAL.stop).toMatchObject({
      bg: '#FDECEA',
      fg: '#A31515',
      icon: '\u2715', // X
      label: 'Stop',
    });
    expect(TIER_VISUAL.respond).toMatchObject({
      bg: '#FFF8E1',
      fg: '#B05C00',
      icon: '\u25B2', // up-triangle
      label: 'Respond',
    });
    expect(TIER_VISUAL.watch).toMatchObject({
      bg: '#EAF4FF',
      fg: '#2E75B6',
      icon: '\u25CF', // filled circle
      label: 'Watch',
    });
    expect(TIER_VISUAL.abundance).toMatchObject({
      bg: '#F0F9F0',
      fg: '#3A7D44',
      icon: '\u2665', // heart
      label: 'Abundance',
    });
  });

  it('pins the pending pseudo-tier styling', () => {
    expect(PENDING_VISUAL).toMatchObject({
      bg: '#F5F0FF',
      fg: '#6B48C8',
      icon: '\u29D6', // hourglass
      label: 'Pending',
    });
  });
});
