/**
 * @vitest-environment happy-dom
 *
 * ActTierObjectiveCard -- the Act left-rail objective tile. This suite pins the
 * presentation-number badge: the card renders the "#.#" string it is handed
 * verbatim (sourced from deriveObjectiveDisplayMap so it matches the sequencing
 * rail exactly) and renders NO badge when the prop is omitted, so the search
 * rails and any unnumbered caller stay byte-identical. Guards against a
 * regression to the old flat "01/02" padStart scheme.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PlanStratumObjective } from '@ogden/shared';
import ActTierObjectiveCard from '../ActTierObjectiveCard.js';
import type { ObjectiveProgress } from '../objectiveProgress.js';

// A minimal universal objective. The card reads only shortTitle/title,
// focusedQuestion, and getSourceTag(objective) -- an unset `source` reads as
// universal, so no source pill renders and the badge is the only numbered
// chrome under test. The cast narrows the fixture to those fields.
function makeObjective(
  overrides: Partial<PlanStratumObjective> = {},
): PlanStratumObjective {
  return {
    id: 's1-boundaries',
    title: 'Confirm the site boundary',
    focusedQuestion: 'Where does the land start and stop?',
    checklist: [],
    ...overrides,
  } as PlanStratumObjective;
}

const PROGRESS: ObjectiveProgress = {
  total: 0,
  verified: 0,
  state: 'available',
};

function renderCard(displayNumber?: string) {
  return render(
    <ActTierObjectiveCard
      objective={makeObjective()}
      displayNumber={displayNumber}
      progress={PROGRESS}
      isActive={false}
      onSelect={vi.fn()}
    />,
  );
}

describe('ActTierObjectiveCard -- presentation number badge', () => {
  it('renders the #.# number verbatim when displayNumber is provided', () => {
    renderCard('1.3');
    expect(screen.getByTestId('objective-num').textContent).toBe('1.3');
  });

  it('renders NO badge when displayNumber is omitted (search-rail parity)', () => {
    renderCard(undefined);
    expect(screen.queryByTestId('objective-num')).toBeNull();
  });

  it('renders the exact string handed in, never a zero-padded position', () => {
    // A two-digit position (objective 10) still renders as its hierarchical
    // "2.10" -- proving the badge echoes deriveObjectiveDisplayMap and never
    // reintroduces the old flat "01/02" padStart.
    renderCard('2.10');
    const badge = screen.getByTestId('objective-num');
    expect(badge.textContent).toBe('2.10');
    expect(badge.textContent).not.toMatch(/^0\d$/);
  });
});
