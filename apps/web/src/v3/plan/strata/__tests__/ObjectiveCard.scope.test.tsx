/**
 * @vitest-environment happy-dom
 *
 * Operational Role Layer -- the legacy stratum-spine ObjectiveCard's scope
 * contract (Phase 6). The card mirrors ActTierObjectiveCard's shared visual
 * contract: a `data-scope` attribute the column dims on, an amber promotion
 * chip when out-surfaced, and quiet slate role badges for out-of-focus context.
 *
 * The golden rule is "never hide, only de-emphasize" -- so every assertion here
 * is about ATTRIBUTES and CHIPS, never about a card being absent. The whole
 * feature is additive: with no scope props the card is byte-identical to before
 * (no data-scope attribute, no chip, no badge).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { findObjectiveGlobally } from '../../objectiveCatalog.js';
import ObjectiveCard from '../ObjectiveCard.js';

vi.mock('lucide-react', () => ({
  Clock: () => null,
  RefreshCcw: () => null,
  RotateCcw: () => null,
}));

const objective = findObjectiveGlobally('s6-yield-flows')!;

const BASE_PROPS = {
  objective,
  status: 'active' as const,
  isActive: false,
  onSelect: vi.fn(),
};

const surfaceTestId = `objective-surface-chip-${objective.id}`;

describe('ObjectiveCard -- operational role scope contract', () => {
  it('omits data-scope + chip + badge when no scope props are passed (byte-identical)', () => {
    render(<ObjectiveCard {...BASE_PROPS} />);

    const card = screen.getByRole('button');
    expect(card.getAttribute('data-scope')).toBeNull();
    expect(screen.queryByTestId(surfaceTestId)).toBeNull();
  });

  it('dims an out-of-focus card in place and shows its owning-role badges', () => {
    render(
      <ObjectiveCard
        {...BASE_PROPS}
        scopeState="out"
        roleBadges={['Livestock Lead', 'Ecology & Soils']}
      />,
    );

    const card = screen.getByRole('button');
    // Dimmed in place -- still present, still a button (never hidden).
    expect(card.getAttribute('data-scope')).toBe('out');
    // Out (not out-surfaced) -> context badges, but NO promotion chip.
    expect(screen.queryByTestId(surfaceTestId)).toBeNull();
    expect(card.textContent).toContain('Livestock Lead');
    expect(card.textContent).toContain('Ecology & Soils');
  });

  it('shows the amber promotion chip with mapped reasons when out-surfaced', () => {
    render(
      <ObjectiveCard
        {...BASE_PROPS}
        scopeState="out-surfaced"
        surfaceReasons={['open-review-flag', 'cross-role-dependency']}
      />,
    );

    const card = screen.getByRole('button');
    expect(card.getAttribute('data-scope')).toBe('out-surfaced');

    const chip = screen.queryByTestId(surfaceTestId);
    expect(chip).not.toBeNull();
    expect(chip?.textContent).toBe('Open review flag · Feeds your work');
    expect(chip?.getAttribute('title')).toBe(
      'Outside your default focus — surfaced because it affects your work',
    );
  });

  it('does NOT render the promotion chip on an in-scope card even if reasons leak in', () => {
    // Guard: the chip is keyed strictly on scopeState === 'out-surfaced'.
    render(
      <ObjectiveCard
        {...BASE_PROPS}
        scopeState="in"
        surfaceReasons={['open-review-flag']}
      />,
    );

    const card = screen.getByRole('button');
    expect(card.getAttribute('data-scope')).toBe('in');
    expect(screen.queryByTestId(surfaceTestId)).toBeNull();
  });
});
