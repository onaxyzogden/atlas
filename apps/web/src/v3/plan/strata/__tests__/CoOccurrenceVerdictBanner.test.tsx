/**
 * @vitest-environment happy-dom
 *
 * CoOccurrenceVerdictBanner -- collapsible cross-protocol verdict banner (T3).
 *
 * Verified behaviours:
 *   1. clusters: [] renders nothing.
 *   2. collapsed: banner testid + count header text present, list NOT rendered.
 *   3. expanded: each cluster theme + summary appear, one deep-link button per
 *      objectiveId.
 *   4. clicking a deep-link button calls onSelectObjective with that id.
 *   5. clicking the header button calls onToggle.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { CoOccurrenceCluster } from '@ogden/shared';
import CoOccurrenceVerdictBanner from '../CoOccurrenceVerdictBanner.js';

// lucide-react ships CJS in this environment; stub the icons so the tests
// do not crash on the "Objects are not valid as a React child" error.
vi.mock('lucide-react', () => ({
  AlertTriangle: () => null,
  ChevronDown: () => null,
  ChevronRight: () => null,
}));

const CLUSTER_A: CoOccurrenceCluster = {
  bucketKey: 'water-spring',
  templateIds: ['t1', 't2'],
  objectiveIds: ['s4-water-strategy', 's5-irrigation'],
  flagIds: ['f1'],
  dominantDepth: 'structural',
  theme: 'Water strategy',
  containsExistential: false,
  weight: 3,
  summary: 'Three protocols converge on water capture before planting.',
};

const CLUSTER_B: CoOccurrenceCluster = {
  bucketKey: 'destock-autumn',
  templateIds: ['t3'],
  objectiveIds: ['s6-destock'],
  flagIds: ['f2', 'f3'],
  dominantDepth: 'structural',
  theme: 'Destocking decision',
  containsExistential: true,
  weight: 5,
  summary: 'Animal welfare requires a destocking trigger this cycle.',
};

const BASE_PROPS = {
  expanded: false,
  onToggle: vi.fn(),
  onSelectObjective: vi.fn(),
};

describe('CoOccurrenceVerdictBanner', () => {
  it('renders nothing when clusters is empty', () => {
    const { container } = render(
      <CoOccurrenceVerdictBanner {...BASE_PROPS} clusters={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('collapsed: shows banner + count header, hides the list', () => {
    render(
      <CoOccurrenceVerdictBanner
        {...BASE_PROPS}
        clusters={[CLUSTER_A, CLUSTER_B]}
        expanded={false}
      />,
    );

    const banner = screen.queryByTestId('cooccurrence-banner');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain('2 structural verdicts');

    expect(
      screen.queryByTestId(
        'cooccurrence-objective-link-s4-water-strategy',
      ),
    ).toBeNull();
  });

  it('singular header text for a single cluster', () => {
    render(
      <CoOccurrenceVerdictBanner
        {...BASE_PROPS}
        clusters={[CLUSTER_A]}
        expanded={false}
      />,
    );
    const banner = screen.getByTestId('cooccurrence-banner');
    expect(banner.textContent).toContain('1 structural verdict');
    expect(banner.textContent).not.toContain('1 structural verdicts');
  });

  it('expanded: shows theme, summary, and a deep-link per objectiveId', () => {
    render(
      <CoOccurrenceVerdictBanner
        {...BASE_PROPS}
        clusters={[CLUSTER_A, CLUSTER_B]}
        expanded
      />,
    );

    expect(screen.queryByText('Water strategy')).not.toBeNull();
    expect(
      screen.queryByText(
        'Three protocols converge on water capture before planting.',
      ),
    ).not.toBeNull();
    expect(screen.queryByText('Destocking decision')).not.toBeNull();
    expect(
      screen.queryByText(
        'Animal welfare requires a destocking trigger this cycle.',
      ),
    ).not.toBeNull();

    for (const id of [
      's4-water-strategy',
      's5-irrigation',
      's6-destock',
    ]) {
      expect(
        screen.queryByTestId(`cooccurrence-objective-link-${id}`),
      ).not.toBeNull();
    }
  });

  it('clicking a deep-link calls onSelectObjective with that id', () => {
    const onSelectObjective = vi.fn();
    render(
      <CoOccurrenceVerdictBanner
        {...BASE_PROPS}
        clusters={[CLUSTER_A]}
        expanded
        onSelectObjective={onSelectObjective}
      />,
    );

    fireEvent.click(
      screen.getByTestId('cooccurrence-objective-link-s5-irrigation'),
    );
    expect(onSelectObjective).toHaveBeenCalledTimes(1);
    expect(onSelectObjective).toHaveBeenCalledWith('s5-irrigation');
  });

  it('clicking the header calls onToggle', () => {
    const onToggle = vi.fn();
    render(
      <CoOccurrenceVerdictBanner
        {...BASE_PROPS}
        clusters={[CLUSTER_A]}
        onToggle={onToggle}
      />,
    );

    fireEvent.click(screen.getByRole('button', { expanded: false }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
