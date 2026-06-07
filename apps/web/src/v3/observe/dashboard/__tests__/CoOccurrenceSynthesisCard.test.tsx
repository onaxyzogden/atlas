/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CoOccurrenceCluster } from '@ogden/shared';

const mockUseCoOccurrenceClusters = vi.fn();
vi.mock('../../../../store/reviewFlagStore.js', () => ({
  useCoOccurrenceClusters: (projectId: string | null) =>
    mockUseCoOccurrenceClusters(projectId),
}));

import CoOccurrenceSynthesisCard from '../CoOccurrenceSynthesisCard.js';

const CLUSTER_A: CoOccurrenceCluster = {
  bucketKey: 'water-spring',
  templateIds: ['t1', 't2'],
  objectiveIds: ['s4-water-strategy', 's5-irrigation'],
  flagIds: ['f1'],
  dominantDepth: 'structural',
  theme: 'Water strategy',
  containsExistential: false,
  weight: 3,
  summary:
    'Two protocols deviating together this spring: points to Water strategy (2 objectives).',
};
const CLUSTER_B: CoOccurrenceCluster = {
  bucketKey: 'destock-autumn',
  templateIds: ['t3', 't4'],
  objectiveIds: ['s6-destock'],
  flagIds: ['f2', 'f3'],
  dominantDepth: 'structural',
  theme: 'Structural design',
  containsExistential: true,
  weight: 105,
  summary:
    'Animal welfare implicated (ihsan): a carrying-capacity assumption may have cost stock. Two protocols deviating together this autumn: points to Structural design (1 objective).',
};

describe('CoOccurrenceSynthesisCard', () => {
  beforeEach(() => mockUseCoOccurrenceClusters.mockReset());

  it('renders nothing when there are no clusters', () => {
    mockUseCoOccurrenceClusters.mockReturnValue([]);
    const { container } = render(<CoOccurrenceSynthesisCard projectId="p1" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders themes, summaries, and objective ids when clusters exist', () => {
    mockUseCoOccurrenceClusters.mockReturnValue([CLUSTER_A, CLUSTER_B]);
    render(<CoOccurrenceSynthesisCard projectId="p1" />);

    expect(
      screen.getByTestId('cooccurrence-synthesis-card'),
    ).toBeTruthy();
    expect(screen.getByText('Water strategy')).toBeTruthy();
    expect(screen.getByText('Structural design')).toBeTruthy();
    expect(screen.getByText(CLUSTER_A.summary)).toBeTruthy();
    expect(screen.getByText(CLUSTER_B.summary)).toBeTruthy();
    expect(
      screen.getByText(/s4-water-strategy, s5-irrigation/),
    ).toBeTruthy();
    expect(screen.getByText(/s6-destock/)).toBeTruthy();
  });

  it('is read-only: no buttons, only a passive "Resolve in Plan" pointer', () => {
    mockUseCoOccurrenceClusters.mockReturnValue([CLUSTER_A, CLUSTER_B]);
    render(<CoOccurrenceSynthesisCard projectId="p1" />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Resolve in Plan')).toBeTruthy();
  });

  it('marks existential-bearing clusters with data-existential', () => {
    mockUseCoOccurrenceClusters.mockReturnValue([CLUSTER_A, CLUSTER_B]);
    render(<CoOccurrenceSynthesisCard projectId="p1" />);

    const existentialRow = screen
      .getByText('Structural design')
      .closest('[data-existential]');
    expect(existentialRow).not.toBeNull();
    expect(existentialRow?.getAttribute('data-existential')).toBe('true');

    const plainRow = screen
      .getByText('Water strategy')
      .closest('[data-testid="cooccurrence-row"]');
    expect(plainRow?.getAttribute('data-existential')).toBe('false');
  });
});
