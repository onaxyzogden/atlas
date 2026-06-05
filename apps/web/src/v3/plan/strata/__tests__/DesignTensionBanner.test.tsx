/**
 * @vitest-environment happy-dom
 *
 * DesignTensionBanner — collapsible design-tension list at the top of the Plan
 * objective column (Plan Nav v1.1 §8).
 *
 * Verified behaviours:
 *   1. tensions: [] renders nothing.
 *   2. collapsed: banner testid + count header present, list NOT rendered.
 *   3. expanded: each tension description + resolution label appear.
 *   4. interactive (onSelectTension provided): each row is a button; clicking it
 *      calls onSelectTension with that tension id; keyboard activation works.
 *   5. static (onSelectTension omitted): rows render as text, no row buttons.
 *   6. clicking the header button calls onToggle.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { DesignTension } from '@ogden/shared';
import DesignTensionBanner from '../DesignTensionBanner.js';

vi.mock('lucide-react', () => ({
  AlertTriangle: () => null,
  ChevronDown: () => null,
  ChevronRight: () => null,
  Crosshair: () => null,
}));

const T1: DesignTension = {
  id: 'tension-1',
  typeA: 'wellness',
  typeB: 'agritourism',
  resolutionStratumId: 's4-foundation-decisions',
  resolutionStratumLabel: 'Stratum 4 - Zone Allocation',
  description: 'Sanctuary quiet vs. visitor flow.',
  relatedObjectiveIds: ['s4-zones'],
};

const T2: DesignTension = {
  id: 'tension-2',
  typeA: 'conservation',
  typeB: 'market_garden',
  resolutionStratumId: 's4-foundation-decisions',
  resolutionStratumLabel: 'Stratum 4 - Zone Allocation',
  description: 'Habitat protection vs. intensive cultivation.',
  relatedObjectiveIds: ['s4-zones'],
};

describe('DesignTensionBanner', () => {
  it('renders nothing when there are no tensions', () => {
    const { container } = render(
      <DesignTensionBanner tensions={[]} expanded onToggle={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('collapsed: shows the count header but not the list', () => {
    render(
      <DesignTensionBanner
        tensions={[T1, T2]}
        expanded={false}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByTestId('plan-design-tension-banner')).toBeTruthy();
    expect(screen.getByText('2 design tensions to reconcile')).toBeTruthy();
    expect(screen.queryByText(T1.description)).toBeNull();
  });

  it('singular count wording for a single tension', () => {
    render(
      <DesignTensionBanner tensions={[T1]} expanded={false} onToggle={vi.fn()} />,
    );
    expect(screen.getByText('1 design tension to reconcile')).toBeTruthy();
  });

  it('expanded: lists each description and resolution label', () => {
    render(
      <DesignTensionBanner tensions={[T1, T2]} expanded onToggle={vi.fn()} />,
    );
    expect(screen.getByText(T1.description)).toBeTruthy();
    expect(screen.getByText(T2.description)).toBeTruthy();
    expect(
      screen.getAllByText(/Resolved at Stratum 4 - Zone Allocation/).length,
    ).toBe(2);
  });

  it('interactive: each row is a button that calls onSelectTension with its id', () => {
    const onSelectTension = vi.fn();
    render(
      <DesignTensionBanner
        tensions={[T1, T2]}
        expanded
        onToggle={vi.fn()}
        onSelectTension={onSelectTension}
      />,
    );
    const row1 = screen.getByRole('button', {
      name: `Show objectives for: ${T1.description}`,
    });
    fireEvent.click(row1);
    expect(onSelectTension).toHaveBeenCalledWith('tension-1');

    const row2 = screen.getByRole('button', {
      name: `Show objectives for: ${T2.description}`,
    });
    fireEvent.click(row2);
    expect(onSelectTension).toHaveBeenCalledWith('tension-2');
    expect(onSelectTension).toHaveBeenCalledTimes(2);
  });

  it('static: omitting onSelectTension renders rows as text, no row buttons', () => {
    render(
      <DesignTensionBanner tensions={[T1, T2]} expanded onToggle={vi.fn()} />,
    );
    // Only the header toggle button exists — no per-row buttons.
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(
      screen.queryByRole('button', {
        name: `Show objectives for: ${T1.description}`,
      }),
    ).toBeNull();
  });

  it('clicking the header calls onToggle', () => {
    const onToggle = vi.fn();
    render(
      <DesignTensionBanner
        tensions={[T1]}
        expanded={false}
        onToggle={onToggle}
      />,
    );
    fireEvent.click(screen.getByText('1 design tension to reconcile'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('chips: renders "Also in {label} (n)" chips and calls onSelectTensionStratum on click', () => {
    const onSelectTensionStratum = vi.fn();
    render(
      <DesignTensionBanner
        tensions={[T1]}
        expanded
        onToggle={vi.fn()}
        onSelectTension={vi.fn()}
        tensionStrataHints={{
          'tension-1': [
            { stratumId: 's5-system-design', label: 'System Design', count: 2 },
          ],
        }}
        onSelectTensionStratum={onSelectTensionStratum}
      />,
    );
    const chip = screen.getByRole('button', {
      name: `Show "${T1.description}" objectives in System Design`,
    });
    expect(chip.textContent).toBe('System Design (2)');
    fireEvent.click(chip);
    expect(onSelectTensionStratum).toHaveBeenCalledWith(
      'tension-1',
      's5-system-design',
    );
  });

  it('chips: the chip button is a sibling of the row button, never nested inside it', () => {
    render(
      <DesignTensionBanner
        tensions={[T1]}
        expanded
        onToggle={vi.fn()}
        onSelectTension={vi.fn()}
        tensionStrataHints={{
          'tension-1': [
            { stratumId: 's5-system-design', label: 'System Design', count: 2 },
          ],
        }}
        onSelectTensionStratum={vi.fn()}
      />,
    );
    const rowButton = screen.getByRole('button', {
      name: `Show objectives for: ${T1.description}`,
    });
    const chip = screen.getByRole('button', {
      name: `Show "${T1.description}" objectives in System Design`,
    });
    // a button must never be a descendant of another button (invalid HTML)
    expect(rowButton.contains(chip)).toBe(false);
  });

  it('chips: none rendered when onSelectTensionStratum is omitted', () => {
    render(
      <DesignTensionBanner
        tensions={[T1]}
        expanded
        onToggle={vi.fn()}
        onSelectTension={vi.fn()}
        tensionStrataHints={{
          'tension-1': [
            { stratumId: 's5-system-design', label: 'System Design', count: 2 },
          ],
        }}
      />,
    );
    expect(screen.queryByText('Also in')).toBeNull();
    expect(
      screen.queryByRole('button', {
        name: `Show "${T1.description}" objectives in System Design`,
      }),
    ).toBeNull();
  });

  it('chips: none rendered when the hint list for a tension is empty', () => {
    render(
      <DesignTensionBanner
        tensions={[T1]}
        expanded
        onToggle={vi.fn()}
        onSelectTension={vi.fn()}
        tensionStrataHints={{ 'tension-1': [] }}
        onSelectTensionStratum={vi.fn()}
      />,
    );
    expect(screen.queryByText('Also in')).toBeNull();
  });

  it('applies the static highlight ring to tensions in highlightTensionIds', () => {
    render(
      <DesignTensionBanner
        tensions={[T1, T2]}
        expanded
        highlightTensionIds={['tension-2']}
        onToggle={vi.fn()}
        onSelectTension={vi.fn()}
      />,
    );
    const banner = screen.getByTestId('plan-design-tension-banner');
    const highlighted = within(banner)
      .getAllByRole('listitem')
      .filter((li) => li.getAttribute('data-highlight') === 'true');
    expect(highlighted).toHaveLength(1);
    expect(within(highlighted[0]!).getByText(T2.description)).toBeTruthy();
  });
});
