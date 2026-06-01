/**
 * @vitest-environment happy-dom
 *
 * ObjectiveCard shortTitle behavior (Plan-page ask): the card tile shows the
 * stripped-to-core-noun `shortTitle` when authored, while the full `title`
 * stays the source of truth for the button's accessible name (aria-label) and
 * everywhere else. When `shortTitle` is omitted, the tile falls back to the
 * full `title`.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PlanStratumObjective } from '@ogden/shared';
import ObjectiveCard from '../ObjectiveCard.js';

// Minimal objective fixture — only the fields ObjectiveCard reads matter; the
// rest are valid-shaped defaults so the cast is honest.
function makeObjective(
  patch: Partial<PlanStratumObjective>,
): PlanStratumObjective {
  return {
    id: 'obj-test',
    stratumId: 's1-project-foundation',
    title: 'Define vision, goals & stewardship capacity',
    focusedQuestion: 'What?',
    prerequisiteObjectiveIds: [],
    defaultOverlayBundle: [],
    checklist: [],
    outputKind: 'plan-decision-record',
    ...patch,
  } as PlanStratumObjective;
}

describe('ObjectiveCard shortTitle', () => {
  it('renders the shortTitle on the tile but keeps the full title in the aria-label', () => {
    render(
      <ObjectiveCard
        objective={makeObjective({
          shortTitle: 'Vision, goals & stewardship capacity',
        })}
        status="available"
        isActive={false}
        onSelect={vi.fn()}
      />,
    );

    // Visible tile shows the stripped core-noun label...
    expect(
      screen.getByText('Vision, goals & stewardship capacity'),
    ).toBeTruthy();
    // ...the full authored title is NOT rendered as visible tile text...
    expect(
      screen.queryByText('Define vision, goals & stewardship capacity'),
    ).toBeNull();
    // ...but the button's accessible name still carries the full title.
    expect(
      screen.getByRole('button', {
        name: /Define vision, goals & stewardship capacity: Ready/,
      }),
    ).toBeTruthy();
  });

  it('falls back to the full title on the tile when shortTitle is omitted', () => {
    render(
      <ObjectiveCard
        objective={makeObjective({})}
        status="available"
        isActive={false}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Define vision, goals & stewardship capacity'),
    ).toBeTruthy();
  });
});
