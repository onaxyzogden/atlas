/**
 * @vitest-environment happy-dom
 *
 * PlanTierSearchRail — cross-stratum objective match list shown in the Plan left
 * rail while a header Stage Search query is active. Covers:
 *   1. Renders each match's objective card + the match-count header.
 *   2. Shows the subtle "via {domain}" hint when a match surfaced via a domain.
 *   3. Empty state when there are no matches.
 *   4. Selecting a card calls back with the matched objective.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { findPlanStratumObjective } from '@ogden/shared';

// lucide-react forwardRef icons spread [undefined] into <svg> children when
// childless, which React 18 + happy-dom reject on re-render. Replace every
// component export with a clean <svg> stub (established tier-shell pattern).
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' &&
        value !== null &&
        '$$typeof' in (value as object)) ||
      typeof value === 'function';
    if (isComponent) {
      const Stub = React.forwardRef<SVGSVGElement, Record<string, unknown>>(
        function LucideStub(_props, ref) {
          return React.createElement('svg', {
            ref,
            'data-lucide-icon': key,
            'aria-hidden': 'true',
          });
        },
      );
      Stub.displayName = `LucideStub(${key})`;
      stubbed[key] = Stub;
    } else {
      stubbed[key] = value;
    }
  }
  return stubbed;
});

import PlanTierSearchRail from '../PlanTierSearchRail.js';
import type { PlanObjectiveMatch } from '../../../search/useStageSearchResults.js';
import type { ObjectiveProgress } from '../../../act/tier-shell/objectiveProgress.js';

const OBJECTIVE = findPlanStratumObjective('s6-yield-flows')!;
const PROGRESS: Readonly<Record<string, ObjectiveProgress>> = {
  [OBJECTIVE.id]: { total: 3, verified: 1, state: 'active' },
};

afterEach(() => cleanup());

function renderRail(
  matches: readonly PlanObjectiveMatch[],
  onSelectObjective: (o: PlanObjectiveMatch['objective']) => void = vi.fn(),
) {
  return render(
    <PlanTierSearchRail
      query="water"
      matches={matches}
      progressByObjective={PROGRESS}
      activeObjectiveId={null}
      onSelectObjective={onSelectObjective}
    />,
  );
}

describe('PlanTierSearchRail', () => {
  it('renders the matched objective card and the match-count header', () => {
    renderRail([{ objective: OBJECTIVE, matchedDomains: [] }]);
    expect(
      screen.getByText(OBJECTIVE.shortTitle ?? OBJECTIVE.title),
    ).toBeTruthy();
    expect(screen.getByText('1 match for “water”')).toBeTruthy();
  });

  it('shows the "via {domain}" hint when the match surfaced via a domain term', () => {
    renderRail([
      { objective: OBJECTIVE, matchedDomains: ['Hydrology & Water'] },
    ]);
    expect(screen.getByText('via Hydrology & Water')).toBeTruthy();
  });

  it('omits the "via" hint when the objective matched on its own text', () => {
    renderRail([{ objective: OBJECTIVE, matchedDomains: [] }]);
    expect(screen.queryByText(/^via /)).toBeNull();
  });

  it('renders the empty state when there are no matches', () => {
    renderRail([]);
    expect(screen.getByText(/No objectives match/)).toBeTruthy();
  });

  it('selecting a card calls back with the matched objective', () => {
    const onSelectObjective = vi.fn();
    renderRail([{ objective: OBJECTIVE, matchedDomains: [] }], onSelectObjective);
    fireEvent.click(screen.getByText(OBJECTIVE.shortTitle ?? OBJECTIVE.title));
    expect(onSelectObjective).toHaveBeenCalledWith(OBJECTIVE);
  });
});
