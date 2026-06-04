/**
 * @vitest-environment happy-dom
 *
 * ChronicVerdictBanner -- collapsible CHRONIC structural-verdict banner (T3,
 * slice #3). Heavier/structural-tier sibling mounted directly above the
 * single-cycle CoOccurrenceVerdictBanner.
 *
 * Verified behaviours:
 *   1. verdicts: [] renders nothing.
 *   2. collapsed: banner testid + count header text present, list NOT rendered.
 *   3. expanded: each verdict theme + summary appear, one deep-link per
 *      objectiveId.
 *   4. clicking a deep-link button calls onSelectObjective with that id.
 *   5. existential row carries data-existential="true"; open row carries
 *      data-open.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ChronicVerdict } from '@ogden/shared';
import ChronicVerdictBanner from '../ChronicVerdictBanner.js';

// lucide-react ships CJS in this environment; stub the icons so the tests
// do not crash on the "Objects are not valid as a React child" error.
vi.mock('lucide-react', () => ({
  Layers: () => null,
  ChevronDown: () => null,
  ChevronRight: () => null,
}));

function makeVerdict(over?: Partial<ChronicVerdict>): ChronicVerdict {
  return {
    signatureKey: 'spring:t1+t2',
    season: 'spring',
    templatePair: ['t1', 't2'],
    templateIds: ['t1', 't2'],
    objectiveIds: ['s4-water-strategy', 's5-irrigation'],
    cycleNumbers: [1, 2, 3],
    occurrenceCount: 3,
    consecutive: true,
    spanCycles: 3,
    dominantDepth: 'structural',
    theme: 'Water strategy',
    containsExistential: false,
    containsOpen: false,
    weight: 6,
    summary: 't1 + t2 co-deviating across 3 consecutive cycles: redesign.',
    ...over,
  };
}

const BASE_PROPS = {
  expanded: false,
  onToggle: vi.fn(),
  onSelectObjective: vi.fn(),
};

describe('ChronicVerdictBanner', () => {
  it('renders nothing when verdicts is empty', () => {
    const { container } = render(
      <ChronicVerdictBanner {...BASE_PROPS} verdicts={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('collapsed: shows banner + count chip, hides the list', () => {
    render(
      <ChronicVerdictBanner
        {...BASE_PROPS}
        verdicts={[makeVerdict(), makeVerdict({ signatureKey: 'autumn:t3+t4' })]}
        expanded={false}
      />,
    );

    const banner = screen.queryByTestId('chronic-verdict-banner');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain('2 chronic structural verdicts');

    expect(
      screen.queryByTestId('chronic-objective-link-s4-water-strategy'),
    ).toBeNull();
  });

  it('singular count text for a single verdict', () => {
    render(
      <ChronicVerdictBanner
        {...BASE_PROPS}
        verdicts={[makeVerdict()]}
        expanded={false}
      />,
    );
    const banner = screen.getByTestId('chronic-verdict-banner');
    expect(banner.textContent).toContain('1 chronic structural verdict');
    expect(banner.textContent).not.toContain('1 chronic structural verdicts');
  });

  it('expanded: shows theme, summary, recurrence line, and a deep-link per objectiveId', () => {
    render(
      <ChronicVerdictBanner
        {...BASE_PROPS}
        verdicts={[makeVerdict()]}
        expanded
      />,
    );

    expect(screen.queryByText('Water strategy')).not.toBeNull();
    expect(
      screen.queryByText(
        't1 + t2 co-deviating across 3 consecutive cycles: redesign.',
      ),
    ).not.toBeNull();
    // recurrence detail line: "3 cycles" + "consecutive"
    const banner = screen.getByTestId('chronic-verdict-banner');
    expect(banner.textContent).toContain('3 cycles');
    expect(banner.textContent).toContain('consecutive');

    for (const id of ['s4-water-strategy', 's5-irrigation']) {
      expect(
        screen.queryByTestId(`chronic-objective-link-${id}`),
      ).not.toBeNull();
    }
  });

  it('non-consecutive verdict shows "recurring" in the recurrence line', () => {
    render(
      <ChronicVerdictBanner
        {...BASE_PROPS}
        verdicts={[makeVerdict({ consecutive: false, cycleNumbers: [1, 4] })]}
        expanded
      />,
    );
    const banner = screen.getByTestId('chronic-verdict-banner');
    expect(banner.textContent).toContain('recurring');
  });

  it('clicking a deep-link calls onSelectObjective with that id', () => {
    const onSelectObjective = vi.fn();
    render(
      <ChronicVerdictBanner
        {...BASE_PROPS}
        verdicts={[makeVerdict()]}
        expanded
        onSelectObjective={onSelectObjective}
      />,
    );

    fireEvent.click(
      screen.getByTestId('chronic-objective-link-s5-irrigation'),
    );
    expect(onSelectObjective).toHaveBeenCalledTimes(1);
    expect(onSelectObjective).toHaveBeenCalledWith('s5-irrigation');
  });

  it('existential row carries data-existential and open row carries data-open', () => {
    render(
      <ChronicVerdictBanner
        {...BASE_PROPS}
        verdicts={[
          makeVerdict({ containsExistential: true, containsOpen: true }),
        ]}
        expanded
      />,
    );
    const link = screen.getByTestId(
      'chronic-objective-link-s4-water-strategy',
    );
    const row = link.closest('[data-existential]');
    expect(row).not.toBeNull();
    expect(row?.getAttribute('data-existential')).toBe('true');
    expect(row?.getAttribute('data-open')).toBe('true');
  });

  it('clicking the header calls onToggle', () => {
    const onToggle = vi.fn();
    render(
      <ChronicVerdictBanner
        {...BASE_PROPS}
        verdicts={[makeVerdict()]}
        onToggle={onToggle}
      />,
    );

    fireEvent.click(screen.getByRole('button', { expanded: false }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
