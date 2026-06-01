/**
 * @vitest-environment happy-dom
 *
 * TierBadge - severity-tier chip (glyph + label) sourced from the shared
 * TIER_VISUAL table. Covers: the RESPOND tier shows its glyph and label; the
 * STOP tier shows a different glyph; the testid is present for DOM probes.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import TierBadge from '../TierBadge.js';

afterEach(() => cleanup());

describe('TierBadge', () => {
  it('renders the RESPOND glyph and label', () => {
    render(<TierBadge tier="respond" />);
    expect(screen.getByText('\u25B2')).toBeTruthy();
    expect(screen.getByText('Respond')).toBeTruthy();
  });

  it('renders a distinct glyph for STOP', () => {
    render(<TierBadge tier="stop" />);
    expect(screen.getByText('\u2715')).toBeTruthy();
    expect(screen.getByText('Stop')).toBeTruthy();
  });

  it('exposes the tier-badge testid', () => {
    render(<TierBadge tier="watch" />);
    expect(screen.getByTestId('tier-badge')).toBeTruthy();
  });
});
