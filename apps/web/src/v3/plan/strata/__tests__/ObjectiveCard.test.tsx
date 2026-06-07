/**
 * @vitest-environment happy-dom
 *
 * ObjectiveCard -- amber review-flag chip (T1.7).
 *
 * Verified behaviours:
 *   1. reviewFlagCount > 0 renders the amber "Review" chip with the correct testid.
 *   2. reviewFlagCount === 0 does NOT render the chip.
 *   3. reviewFlagCount omitted (default) does NOT render the chip (byte-identical
 *      guarantee: existing callers that never pass the prop are unaffected).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { findObjectiveGlobally } from '../../objectiveCatalog.js';
import ObjectiveCard from '../ObjectiveCard.js';

// lucide-react ships CJS in this environment; stub the icons so the tests
// do not crash on the "Objects are not valid as a React child" error.
vi.mock('lucide-react', () => ({
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

describe('ObjectiveCard -- reviewFlagChip', () => {
  it('renders the Review chip when reviewFlagCount is 2', () => {
    render(<ObjectiveCard {...BASE_PROPS} reviewFlagCount={2} />);

    const chip = screen.queryByTestId(`objective-review-flag-${objective.id}`);
    expect(chip).not.toBeNull();
    expect(chip?.textContent).toBe('Review');
    expect(chip?.getAttribute('title')).toBe('2 downstream review flags');
  });

  it('singular title when reviewFlagCount is 1', () => {
    render(<ObjectiveCard {...BASE_PROPS} reviewFlagCount={1} />);

    const chip = screen.queryByTestId(`objective-review-flag-${objective.id}`);
    expect(chip).not.toBeNull();
    expect(chip?.getAttribute('title')).toBe('1 downstream review flag');
  });

  it('does NOT render the chip when reviewFlagCount is 0', () => {
    render(<ObjectiveCard {...BASE_PROPS} reviewFlagCount={0} />);

    expect(
      screen.queryByTestId(`objective-review-flag-${objective.id}`),
    ).toBeNull();
  });

  it('does NOT render the chip when reviewFlagCount is omitted (default)', () => {
    render(<ObjectiveCard {...BASE_PROPS} />);

    expect(
      screen.queryByTestId(`objective-review-flag-${objective.id}`),
    ).toBeNull();
  });
});
