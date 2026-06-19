/**
 * @vitest-environment happy-dom
 *
 * ActTierSpine -- the horizontal stratum spine shared by the Act stage and the
 * Plan tier shell. The Plan Declaration chrome rides two ADDITIVE props,
 * `typeChips` and `thresholds`; the Act stage passes neither. These tests pin
 * both the Plan-on behaviour AND the Act-parity guard (props omitted -> the
 * spine is byte-identical: no chips, no threshold dividers, joined label shown).
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { PlanStratum, PlanStratumState } from '@ogden/shared';

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

import ActTierSpine, {
  type SpineThreshold,
  type SpineTypeChip,
} from '../ActTierSpine.js';

function stratum(id: string, ordinal: number, title: string): PlanStratum {
  return { id, ordinal, title } as PlanStratum;
}

const STRATA: PlanStratum[] = [
  stratum('s1-project-foundation', 1, 'Project Foundation'),
  stratum('s2-land-reading', 2, 'Land Reading'),
];

const STATES: Record<string, PlanStratumState> = {};

interface SpineOverrides {
  typeChips?: readonly SpineTypeChip[];
  thresholds?: readonly SpineThreshold[];
  clickableThresholdIds?: readonly string[];
  thresholdActiveId?: string;
  onSelectThreshold?: (thresholdId: string) => void;
  activeStratumId?: string;
}

function renderSpine(over: SpineOverrides = {}): void {
  render(
    <ActTierSpine
      strata={STRATA}
      objectives={[]}
      stratumStates={STATES}
      lockedStratumIds={new Set()}
      activeStratumId="s1-project-foundation"
      onSelectStratum={vi.fn()}
      projectTitle="Test Farm"
      projectTypeLabel="JOINED-TYPES-LABEL"
      ariaLabel="Plan strata"
      {...over}
    />,
  );
}

const TYPE_CHIPS: SpineTypeChip[] = [
  { label: 'Regen Farm', kind: 'primary' },
  { label: 'Silvopasture', kind: 'secondary' },
];

const THRESHOLD: SpineThreshold[] = [
  { afterStratumId: 's1-project-foundation', name: 'Threshold 1 -- Reality Check' },
];

// Plan passes an `id` so the threshold CAN become clickable; Act never does.
const THRESHOLD_WITH_ID: SpineThreshold[] = [
  {
    afterStratumId: 's1-project-foundation',
    id: 'threshold-1',
    name: 'Threshold 1 -- Reality Check',
  },
];

describe('ActTierSpine -- Plan Declaration chrome', () => {
  it('replaces the joined type label with per-type chips', () => {
    renderSpine({ typeChips: TYPE_CHIPS });
    expect(screen.getByText('Regen Farm')).toBeTruthy();
    expect(screen.getByText('Silvopasture')).toBeTruthy();
    // The joined label is REPLACED, not shown alongside.
    expect(screen.queryByText('JOINED-TYPES-LABEL')).toBeNull();
  });

  it('renders a threshold divider after the matching stratum tab', () => {
    renderSpine({ thresholds: THRESHOLD });
    const dividers = screen.getAllByTestId('spine-threshold');
    expect(dividers).toHaveLength(1);
    expect(dividers[0]?.textContent).toMatch(/Reality Check/);
  });
});

describe('ActTierSpine -- Act parity (props omitted)', () => {
  it('shows the joined type label and NO chips when typeChips is omitted', () => {
    renderSpine();
    expect(screen.getByText('JOINED-TYPES-LABEL')).toBeTruthy();
    expect(screen.queryByText('Regen Farm')).toBeNull();
  });

  it('treats an empty typeChips array as omitted (falls back to the label)', () => {
    renderSpine({ typeChips: [] });
    expect(screen.getByText('JOINED-TYPES-LABEL')).toBeTruthy();
  });

  it('renders NO threshold dividers when thresholds is omitted', () => {
    renderSpine();
    expect(screen.queryByTestId('spine-threshold')).toBeNull();
  });

  it('keeps the threshold a NON-interactive separator even with an id, when no clickability props are passed (Act case)', () => {
    // Act passes `thresholds` (it shares the constant) but never the
    // clickability triple -> the entry must stay a decorative separator.
    renderSpine({ thresholds: THRESHOLD_WITH_ID });
    const entry = screen.getByTestId('spine-threshold');
    expect(entry.getAttribute('role')).toBe('separator');
    expect(entry.tagName).toBe('DIV');
    expect(entry.getAttribute('data-clickable')).toBeNull();
  });
});

describe('ActTierSpine -- Plan threshold clickability', () => {
  it('renders the threshold as a button when its id is clickable AND a handler is given', () => {
    const onSelect = vi.fn();
    renderSpine({
      thresholds: THRESHOLD_WITH_ID,
      clickableThresholdIds: ['threshold-1'],
      onSelectThreshold: onSelect,
    });
    const entry = screen.getByTestId('spine-threshold');
    expect(entry.tagName).toBe('BUTTON');
    expect(entry.getAttribute('data-clickable')).toBe('true');
    fireEvent.click(entry);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('threshold-1');
  });

  it('marks the active threshold via data-active + aria-current', () => {
    renderSpine({
      thresholds: THRESHOLD_WITH_ID,
      clickableThresholdIds: ['threshold-1'],
      thresholdActiveId: 'threshold-1',
      onSelectThreshold: vi.fn(),
    });
    const entry = screen.getByTestId('spine-threshold');
    expect(entry.getAttribute('data-active')).toBe('true');
    expect(entry.getAttribute('aria-current')).toBe('step');
  });

  it('highlights ONLY the active threshold, not a stratum tab, when activeStratumId matches none', () => {
    // The Plan shell passes activeStratumId="" while a threshold surface is
    // open (selectedStratumId still falls back to S1 for the rail context, but
    // the spine must not show a stray active stratum behind the threshold).
    renderSpine({
      activeStratumId: '',
      thresholds: THRESHOLD_WITH_ID,
      clickableThresholdIds: ['threshold-1'],
      thresholdActiveId: 'threshold-1',
      onSelectThreshold: vi.fn(),
    });
    // No stratum tab is active.
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(STRATA.length);
    for (const tab of tabs) {
      expect(tab.getAttribute('data-active')).toBe('false');
      expect(tab.getAttribute('aria-selected')).toBe('false');
    }
    // The threshold button is the only active entry.
    const entry = screen.getByTestId('spine-threshold');
    expect(entry.getAttribute('data-active')).toBe('true');
  });

  it('stays a separator when the id is clickable but NO handler is supplied', () => {
    renderSpine({
      thresholds: THRESHOLD_WITH_ID,
      clickableThresholdIds: ['threshold-1'],
      // onSelectThreshold omitted -> not interactive.
    });
    const entry = screen.getByTestId('spine-threshold');
    expect(entry.getAttribute('role')).toBe('separator');
    expect(entry.getAttribute('data-clickable')).toBeNull();
  });

  it('stays a separator when a handler is supplied but the id is NOT in the clickable set', () => {
    renderSpine({
      thresholds: THRESHOLD_WITH_ID,
      clickableThresholdIds: [],
      onSelectThreshold: vi.fn(),
    });
    const entry = screen.getByTestId('spine-threshold');
    expect(entry.getAttribute('role')).toBe('separator');
  });
});
