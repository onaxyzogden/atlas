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
import { render, screen } from '@testing-library/react';
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
});
