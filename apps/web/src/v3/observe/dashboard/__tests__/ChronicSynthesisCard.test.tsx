/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ChronicVerdict } from '@ogden/shared';

const mockUseChronicVerdicts = vi.fn();
vi.mock('../../../../store/chronicVerdicts.js', () => ({
  useChronicVerdicts: (projectId: string | null) =>
    mockUseChronicVerdicts(projectId),
}));

import ChronicSynthesisCard from '../ChronicSynthesisCard.js';

function makeVerdict(over: Partial<ChronicVerdict> = {}): ChronicVerdict {
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
    containsOpen: true,
    weight: 6,
    summary:
      't1 + t2 co-deviating across 3 consecutive cycles: points to a structural Water strategy failure (2 objective(s)) -- redesign, not retune.',
    ...over,
  };
}

const VERDICT_A = makeVerdict();
const VERDICT_B = makeVerdict({
  signatureKey: 'autumn:t3+t4',
  season: 'autumn',
  templatePair: ['t3', 't4'],
  templateIds: ['t3', 't4'],
  objectiveIds: ['s6-destock'],
  cycleNumbers: [1, 4],
  occurrenceCount: 2,
  consecutive: false,
  spanCycles: 4,
  theme: 'Structural design',
  containsExistential: true,
  summary:
    'Animal welfare implicated (ihsan): a carrying-capacity assumption may have cost stock. t3 + t4 co-deviating across 2 cycles: points to a structural Structural design failure (1 objective(s)) -- redesign, not retune.',
});

describe('ChronicSynthesisCard', () => {
  beforeEach(() => mockUseChronicVerdicts.mockReset());

  it('renders nothing when there are no verdicts', () => {
    mockUseChronicVerdicts.mockReturnValue([]);
    const { container } = render(<ChronicSynthesisCard projectId="p1" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders chronic verdict rows and the card when verdicts exist', () => {
    mockUseChronicVerdicts.mockReturnValue([VERDICT_A, VERDICT_B]);
    render(<ChronicSynthesisCard projectId="p1" />);

    expect(screen.getByTestId('chronic-synthesis-card')).toBeTruthy();
    expect(screen.getAllByTestId('chronic-row')).toHaveLength(2);
    expect(screen.getByText('Water strategy')).toBeTruthy();
    expect(screen.getByText('Structural design')).toBeTruthy();
    expect(screen.getByText(VERDICT_A.summary)).toBeTruthy();
    expect(screen.getByText(VERDICT_B.summary)).toBeTruthy();
    expect(screen.getByText(/s4-water-strategy, s5-irrigation/)).toBeTruthy();
    expect(screen.getByText(/s6-destock/)).toBeTruthy();
  });

  it('is read-only: no buttons, only a passive "Redesign in Plan" pointer', () => {
    mockUseChronicVerdicts.mockReturnValue([VERDICT_A, VERDICT_B]);
    const { container } = render(<ChronicSynthesisCard projectId="p1" />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('[role="button"]')).toBeNull();
    expect(screen.getByText('Redesign in Plan')).toBeTruthy();
  });

  it('marks existential-bearing verdicts with data-existential', () => {
    mockUseChronicVerdicts.mockReturnValue([VERDICT_A, VERDICT_B]);
    render(<ChronicSynthesisCard projectId="p1" />);

    const existentialRow = screen
      .getByText('Structural design')
      .closest('[data-existential]');
    expect(existentialRow).not.toBeNull();
    expect(existentialRow?.getAttribute('data-existential')).toBe('true');

    const plainRow = screen
      .getByText('Water strategy')
      .closest('[data-testid="chronic-row"]');
    expect(plainRow?.getAttribute('data-existential')).toBe('false');
  });

  // A3 -- group headers + full read-only render.

  // A common-deviant fan in one season: pairs [a,b], [b,c], [b,d] all spring ->
  // anchor 'b' (highest season-frequency), single group key 'spring::b'.
  const FAN_AB = makeVerdict({
    signatureKey: 'spring:a+b',
    season: 'spring',
    templatePair: ['a', 'b'],
    templateIds: ['a', 'b'],
    theme: 'Fan AB',
    containsExistential: false,
  });
  const FAN_BC = makeVerdict({
    signatureKey: 'spring:b+c',
    season: 'spring',
    templatePair: ['b', 'c'],
    templateIds: ['b', 'c'],
    theme: 'Fan BC',
    containsExistential: false,
  });
  const FAN_BD = makeVerdict({
    signatureKey: 'spring:b+d',
    season: 'spring',
    templatePair: ['b', 'd'],
    templateIds: ['b', 'd'],
    theme: 'Fan BD',
    containsExistential: false,
  });

  it('renders a common-deviant group header for a season fan', () => {
    mockUseChronicVerdicts.mockReturnValue([FAN_AB, FAN_BC, FAN_BD]);
    render(<ChronicSynthesisCard projectId="p1" />);

    const header = screen.getByTestId('chronic-group-spring::b');
    expect(header).toBeTruthy();
    expect(header.textContent).toContain('common deviant b');
    expect(screen.getAllByTestId('chronic-row')).toHaveLength(3);
  });

  it('renders ALL rows with no cap on the read-only surface', () => {
    const eight = Array.from({ length: 8 }, (_, i) =>
      makeVerdict({
        signatureKey: `spring:k${i}+m${i}`,
        season: 'spring',
        templatePair: [`k${i}`, `m${i}`],
        templateIds: [`k${i}`, `m${i}`],
        theme: `Verdict ${i}`,
        containsExistential: false,
      }),
    );
    mockUseChronicVerdicts.mockReturnValue(eight);
    render(<ChronicSynthesisCard projectId="p1" />);

    expect(screen.getAllByTestId('chronic-row')).toHaveLength(8);
  });

  it('stays read-only with group headers present', () => {
    mockUseChronicVerdicts.mockReturnValue([FAN_AB, FAN_BC, FAN_BD]);
    const { container } = render(<ChronicSynthesisCard projectId="p1" />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('[role="button"]')).toBeNull();

    const header = screen.getByTestId('chronic-group-spring::b');
    expect(header.tagName).toBe('DIV');
  });

  it('keeps existential rows marked in the grouped layout', () => {
    // VERDICT_B is autumn/existential; group it alongside a spring fan.
    mockUseChronicVerdicts.mockReturnValue([FAN_AB, VERDICT_B]);
    render(<ChronicSynthesisCard projectId="p1" />);

    const existentialRow = screen
      .getByText('Structural design')
      .closest('[data-existential]');
    expect(existentialRow?.getAttribute('data-existential')).toBe('true');
  });
});
