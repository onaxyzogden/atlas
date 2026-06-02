// @vitest-environment happy-dom
/**
 * FormulaResultSection render smoke. Two invariants:
 *   1. an objective with NO formulaBinding items renders nothing (non-livestock
 *      panels stay untouched, no chunk cost),
 *   2. an objective WITH a bound item renders the "Live calculations" region.
 *
 * Widgets are lazy(); we assert the (non-lazy) section chrome synchronously and
 * don't await Suspense resolution — that's covered by the widget/catalogue
 * tests.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { PlanStratumObjective } from '@ogden/shared';
import FormulaResultSection from '../FormulaResultSection.js';

function objectiveWith(
  checklist: PlanStratumObjective['checklist'],
): PlanStratumObjective {
  return { id: 'obj', checklist } as unknown as PlanStratumObjective;
}

afterEach(cleanup);

describe('FormulaResultSection', () => {
  it('renders nothing when no checklist item carries a formulaBinding', () => {
    const objective = objectiveWith([
      { id: 'c1', label: 'A plain decision', feedsInto: [], optional: false },
    ] as unknown as PlanStratumObjective['checklist']);

    const { container } = render(
      <FormulaResultSection projectId="p1" objective={objective} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the Live calculations region when an item is bound', () => {
    const objective = objectiveWith([
      {
        id: 'c1',
        label: 'Calculate stock water demand',
        feedsInto: [],
        optional: false,
        formulaBinding: {
          formulaId: 'stock-water-demand',
          satisfiesWhenComputed: true,
        },
      },
    ] as unknown as PlanStratumObjective['checklist']);

    render(<FormulaResultSection projectId="p1" objective={objective} />);
    expect(screen.getByTestId('plan-objective-formulas')).toBeTruthy();
    expect(screen.getByText('Live calculations')).toBeTruthy();
  });
});
